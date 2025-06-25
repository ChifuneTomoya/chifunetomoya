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
#配列
from typing import List
#Json
import json
from time import sleep

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
from time import sleep  # 追加

@app.post("/study")
async def study(data: StudyInput, email: str = Depends(verify_jwt_token)):
    try:
        # 🔍 Claudeに渡すプロンプトを改善（曖昧な質問でもヒットしやすく）
        input_text = f"""
あなたは資格試験のナレッジベース検索AIです。
以下のデータは「Q:（質問）」と「A:（解説）」のペアで構成されており、各項目には「出典ページ情報」も含まれています。

--- ナレッジベースの構成 ---
形式: 
Q: 質問内容
A: 解説
-----------------------------

ユーザーからの質問: 「{data.question}」

この質問と**直接的、もしくは意味的に関連する**内容を、できるだけ広く検索してください。
キーワードが一致しなくても、**話題・テーマ・背景知識が近いと判断される**場合は該当とみなしてください。

以下の3項目を出力してください：
- Q:（元の問題文）
- A:（解説文）

出力例：
Q: ◯◯とは何か？
A: ◯◯は〜〜です。〜に活用されます。

複数件該当する場合は、すべて提示してください。
"""

        # 🔁 Throttling対策付きのBedrockリクエスト
        max_retries = 3
        for attempt in range(max_retries):
            try:
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
                break
            except bedrock_client.exceptions.ThrottlingException as e:
                if attempt < max_retries - 1:
                    logger.warning("Throttling発生、再試行します... (%d回目)", attempt + 1)
                    sleep(2)
                else:
                    logger.error("BedrockのThrottlingが最大リトライ回数を超えました")
                    raise HTTPException(429, "AIの応答が制限されています。時間をおいて再実行してください。")

        intermediate_answer = response.get("output", {}).get("text", "").strip()
        logger.info("Claude中間回答: %s", intermediate_answer)

        if not intermediate_answer:
            raise HTTPException(500, "Claudeから有効な回答が得られませんでした。")

        # citationsからページ番号・ファイル名を抽出してsource_infoを作成
        citations = response.get("citations", [])
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
                logger.warning(f"出典情報の解析に失敗しました: {e}")

        # 🎓 OpenAIにクイズ生成を依頼（Claudeの回答を元に構造を整形）
        prompt = f"""
あなたは教育アプリのAI講師です。
以下の情報は教材から得られたものです。
この情報に基づいて、以下のJSON形式で1問の4択クイズを出力してください。

【教材内容】
{intermediate_answer}

【出力形式】
{{
  "問題文": "〜？",
  "選択肢": ["A", "B", "C", "D"],
  "正解": "A",  // A〜Dのいずれか
  "解説": "〜"
}}

※出力にはコードブロック（```など）は含めず、JSONオブジェクトのみを返してください。
"""
        openai_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "あなたは正確で簡潔な教育AIです。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )

        raw_answer = openai_response.choices[0].message.content.strip()
        logger.info("OpenAI raw_answer: %s", raw_answer)

        try:
            quiz_json = json.loads(raw_answer)
        except json.JSONDecodeError as je:
            logger.error("OpenAI回答のJSONパースエラー: %s\n内容: %s", je, raw_answer)
            raise HTTPException(status_code=500, detail="AIの出力が不正なJSON形式でした。")

        return {
            "nickname": data.nickname,
            "user": email,
            "question": data.question,
            "quiz": quiz_json,
            "source": source_info
        }

    except Exception as e:
        logger.exception("問題生成中に例外が発生しました")
        raise HTTPException(status_code=500, detail="AIからのクイズ生成でエラーが発生しました。")







class ChoiceQuestion(BaseModel):
    問題文: str
    選択肢: List[str]
    正解: str
    解説: str

# クイズ問題（仮の固定配列）
quiz_questions = [
    ChoiceQuestion(
        問題文="太陽は何ですか？",
        選択肢=["星", "惑星", "衛星", "小惑星"],
        正解="星",
        解説="太陽は恒星であり、太陽系の中心に位置しています。"
    ),
    ChoiceQuestion(
        問題文="日本の首都はどこですか？",
        選択肢=["大阪", "京都", "東京", "札幌"],
        正解="東京",
        解説="日本の首都は東京であり、政治・経済・文化の中心地です。"
    )
]


@app.get("/questions", response_model=List[ChoiceQuestion])
def get_quiz_questions(user_email: str = Depends(verify_jwt_token)):
    return quiz_questions



@app.post("/generate_quiz")
async def generate_quiz(data: StudyInput, email: str = Depends(verify_jwt_token)):
    prompt = f"""
以下の形式で1問の4択クイズをJSON形式で出力してください。

{{
  "問題文": "...",
  "選択肢": ["A", "B", "C", "D"],
  "正解": "A",
  "解説": "..."
}}

カテゴリ: {data.category}
質問: {data.question}
"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            # response_format="json" は不要、安全のため削除
        )
        quiz_text = response.choices[0].message.content.strip()
        quiz_data = json.loads(quiz_text)
        return {"quiz": quiz_data}

    except json.JSONDecodeError as e:
        raise HTTPException(500, f"JSON解析に失敗しました: {e}\n内容: {quiz_text}")
    except Exception as e:
        raise HTTPException(500, f"クイズ生成中にエラーが発生しました: {e}")
