# FastAPI本体や各種依存モジュールをインポート
from fastapi import FastAPI, Request, HTTPException, Depends
# CORSミドルウェアで異なるオリジンからの通信を許可設定できる
from fastapi.middleware.cors import CORSMiddleware
# PydanticのBaseModelでAPIリクエストボディの型を定義する
from pydantic import BaseModel, constr
# JWTトークンの署名検証やデコードに使うライブラリ（python-jose）
from jose import jwt
# joseのヘルパー関数 base64urlデコード用
from jose.utils import base64url_decode
# RSA公開鍵生成用のcryptographyライブラリ
from cryptography.hazmat.primitives.asymmetric import rsa
# cryptographyのバックエンド処理用
from cryptography.hazmat.backends import default_backend
# .envファイルから環境変数を読み込むライブラリ
from dotenv import load_dotenv
# OpenAIの公式Pythonクライアント（最新のAPIアクセス用）
from openai import OpenAI
# AWS SDK boto3 クライアント作成に使用
import boto3
# OS環境変数取得用
import os
# HTTPリクエスト送信用（CognitoのJWKS取得に使用）
import requests
# ロギング（ログ出力設定や利用用）
import logging

# ロギングの基本設定：INFOレベル以上のログを標準出力に出す
logging.basicConfig(level=logging.INFO)
# ロガーオブジェクトを作成
logger = logging.getLogger(__name__)

# .envファイルの読み込み（環境変数をセット）
load_dotenv()

# FastAPIのアプリケーションインスタンス作成
app = FastAPI()

# CORS設定（クロスオリジンリクエストを許可）
app.add_middleware(
    CORSMiddleware,
    # React開発サーバーのURLを許可。デプロイ後はApp RunnerのURLに変更すること
    allow_origins=["http://localhost:3000"],
    # 認証情報（Cookieなど）を許可するか
    allow_credentials=True,
    # 許可するHTTPメソッド
    allow_methods=["*"],
    # 許可するHTTPヘッダー
    allow_headers=["*"],
)

# Cognito設定を環境変数から読み込み
COGNITO_REGION = os.getenv("COGNITO_REGION")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")

# Cognito JWTの発行元URL（Issuer）
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"

# Cognitoの公開鍵情報（JWKS）を取得してキャッシュ
try:
    JWKS = requests.get(f"{COGNITO_ISSUER}/.well-known/jwks.json").json()
except Exception as e:
    logger.error(f"JWKS取得失敗: {e}")
    JWKS = None

# JWKSのJWK形式公開鍵をPythonのRSA公開鍵オブジェクトに変換する関数
def jwk_to_public_key(jwk):
    # JWKの公開鍵指数（e）をbase64urlデコードして整数化
    e = int.from_bytes(base64url_decode(jwk["e"].encode()), "big")
    # JWKの公開鍵モジュラス（n）をbase64urlデコードして整数化
    n = int.from_bytes(base64url_decode(jwk["n"].encode()), "big")
    # RSA公開鍵オブジェクトを生成して返す
    return rsa.RSAPublicNumbers(e, n).public_key(default_backend())

# JWTトークンの認証検証処理（FastAPIのDependsで利用）
def verify_jwt_token(request: Request) -> str:
    # Authorizationヘッダーを取得
    auth = request.headers.get("Authorization")
    # トークンがなければ401エラーを返す
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "認証トークンがありません。")
    # Bearerトークン部分を取得
    token = auth.split(" ")[1]

    # JWKSが取得できていなければ500エラー
    if JWKS is None:
        raise HTTPException(500, "JWKSが取得できません。")

    try:
        # JWTヘッダーを検証なしで取得しkidを確認
        header = jwt.get_unverified_header(token)
        # kidに対応する公開鍵をJWKSから検索
        key = next(k for k in JWKS["keys"] if k["kid"] == header["kid"])
        # 公開鍵オブジェクトを生成
        rsa_key = jwk_to_public_key(key)
        # JWTトークンの署名、期限、issuer、audienceを検証しペイロード取得
        claims = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=COGNITO_ISSUER,
        )
        # トークン内のemailクレームを返す（認証ユーザー判別用）
        return claims.get("email", "unknown")
    except Exception as e:
        # 検証失敗時は401エラーを返す
        raise HTTPException(401, f"トークン検証に失敗しました: {e}")

# AWS Bedrockクライアントをboto3で作成
bedrock_client = boto3.client(
    "bedrock-agent-runtime",  # BedrockのAPIサービス名
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

# OpenAI公式クライアントをAPIキーで初期化
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# BedrockのナレッジベースIDを環境変数から取得
KNOWLEDGE_BASE_ID = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID")
# BedrockモデルのARN（Amazon Resource Name）を環境変数から取得
MODEL_ARN = os.getenv("BEDROCK_MODEL_ARN")

# リクエストで受け取るJSONのスキーマを定義（pydantic）
class StudyInput(BaseModel):
    nickname: constr(min_length=1, max_length=20) # type: ignore # ニックネーム（ユーザー名など）
    question: constr(min_length=1, max_length=500) # type: ignore # ユーザーの質問内容
    category: constr(min_length=1, max_length=50)  # type: ignore  # 問題カテゴリ（例：基本情報など）

# メインの質問処理エンドポイント（POST /study）
@app.post("/study")
async def study(data: StudyInput, email: str = Depends(verify_jwt_token)):
    try:
        # カテゴリーを前置きしてナレッジベースへ送信
        input_text = f"カテゴリー: {data.category}\n質問: {data.question}"
        response = bedrock_client.retrieve_and_generate(
            input={"text": input_text},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": KNOWLEDGE_BASE_ID,
                    "modelArn": MODEL_ARN,
                }
            }
        )

        intermediate_answer = response.get("output", {}).get("text", "")
        logger.info("Claude中間回答: %s", intermediate_answer)
        logger.info("Bedrock full response: %s", response)
        citations = response.get("citations", [])

        if not intermediate_answer:
            raise HTTPException(500, "Claudeによる中間回答の取得に失敗しました。")

        # citationsから出典情報を抽出（最初の1件を使用）
        source_info = ""
        if citations:
            try:
                ref = citations[0]["retrievedReferences"][0]
                page = int(ref.get("metadata", {}).get("x-amz-bedrock-kb-document-page-number", 0))
                uri = ref.get("location", {}).get("s3Location", {}).get("uri", "")
                filename = uri.split("/")[-1] if uri else "資料"
                source_info = f"（出典: {filename} {page}ページ）"
                intermediate_answer += f"\n\n{source_info}"
            except Exception as e:
                logger.warning(f"出典情報の解析に失敗: {e}")

        # OpenAIへのプロンプトを構築
        prompt = f"""
あなたは親切で信頼できる先生です。
以下のClaudeからの回答と質問をもとに、詳しく説明してください。

【Claudeの中間回答】
{intermediate_answer}

【ユーザーの質問】
{data.question}
"""

        openai_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "あなたは親切で丁寧な教師です。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )

        final_answer = openai_response.choices[0].message.content.strip()

        return {
            "nickname": data.nickname,
            "user": email,
            "question": data.question,
            "claudeAnswer": intermediate_answer,
            "answer": final_answer,
            "source": source_info  # 必要に応じてフロント表示に使用
        }

    except Exception as e:
        logger.exception("AI処理中に例外が発生しました")
        raise HTTPException(500, f"AI処理中にエラーが発生しました: {e}")
