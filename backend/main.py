# FastAPI本体や各種依存モジュールをインポート
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, constr
from jose import jwt
from jose.utils import base64url_decode
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
from openai import OpenAI
import boto3
import os
import requests
import logging
from typing import List
import json

from openai.types.chat import ChatCompletionMessageToolCall

# ロギング初期化
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cognito設定
COGNITO_REGION = os.getenv("COGNITO_REGION")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"

try:
    JWKS = requests.get(f"{COGNITO_ISSUER}/.well-known/jwks.json").json()
except Exception as e:
    logger.error(f"JWKS取得失敗: {e}")
    JWKS = None

# JWT検証
def jwk_to_public_key(jwk):
    e = int.from_bytes(base64url_decode(jwk["e"].encode()), "big")
    n = int.from_bytes(base64url_decode(jwk["n"].encode()), "big")
    return rsa.RSAPublicNumbers(e, n).public_key(default_backend())

def verify_jwt_token(request: Request) -> str:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "認証トークンがありません。")
    token = auth.split(" ")[1]

    if JWKS is None:
        raise HTTPException(500, "JWKSが取得できません。")

    try:
        header = jwt.get_unverified_header(token)
        key = next(k for k in JWKS["keys"] if k["kid"] == header["kid"])
        rsa_key = jwk_to_public_key(key)
        claims = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=COGNITO_ISSUER,
        )
        return claims.get("email", "unknown")
    except Exception as e:
        raise HTTPException(401, f"トークン検証に失敗しました: {e}")

# クライアント初期化
bedrock_client = boto3.client(
    "bedrock-agent-runtime",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

KNOWLEDGE_BASE_ID = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID")
MODEL_ARN = os.getenv("BEDROCK_MODEL_ARN")

# Pydanticモデル
class StudyInput(BaseModel):
    question: constr(min_length=1, max_length=500)  # type: ignore
    category: constr(min_length=1, max_length=50)   # type: ignore

last_sources = {}

@app.post("/study")
async def study(data: StudyInput, email: str = Depends(verify_jwt_token)):
    try:
        prev_source = last_sources.get(email)

        input_text = f"""
あなたはハイレベルなナレッジベース検索+問題生成AIです。

`questions.pdf`の情報だけを使用してください。

問題内容:「{data.question}」が空のときは、問題を5問生成してください。

※同じ問題が連続しないよう注意してください。
※各問題ごとに正しい「出典: questions.pdf Xページ」を記載してください（全体に1つではなく、個別に付けてください）

出力形式（例）:
Q1: 〜？
A1: 〜（解説）
出典: questions.pdf 1ページ

...

【特記事項】
- 「{prev_source}」のページ以外から選び、内容が前回と明確に異なるようにしてください。

カテゴリ:「{data.category}」
問題内容:「{data.question}」
"""

        logger.info(f"カテゴリ: {data.category} | 実際の質問（検索用）: {data.question or '（AIによる自動生成）'}")

        # Bedrockに問い合わせ
        response = bedrock_client.retrieve_and_generate(
            input={"text": input_text},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": KNOWLEDGE_BASE_ID,
                    "modelArn": MODEL_ARN,
                    "generationConfiguration": {
                        "inferenceConfig": {
                            "textInferenceConfig": {
                                "temperature": 1.0,
                                "topP": 0.95
                            }
                        }
                    }
                }
            }
        )

        intermediate_answer = response.get("output", {}).get("text", "").strip()
        logger.info("Claude中間回答: %s", intermediate_answer)

        if not intermediate_answer:
            raise HTTPException(500, "Claudeから有効な回答が得られませんでした。")

        # 出典抽出
        source_info = ""
        citations = response.get("citations", [])
        if citations:
            try:
                ref = citations[0]["retrievedReferences"][0]
                page = int(ref.get("metadata", {}).get("x-amz-bedrock-kb-document-page-number", 0))
                uri = ref.get("location", {}).get("s3Location", {}).get("uri", "")
                filename = uri.split("/")[-1] if uri else "資料"
                source_info = f"{filename} {page}ページ"
                intermediate_answer += f"\n\n（出典: {source_info}）"
                last_sources[email] = source_info
            except Exception as e:
                logger.warning(f"出典情報の解析に失敗しました: {e}")

        # 🔧 Structured Outputでクイズ生成
        openai_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "あなたは教育アプリのAI講師です。"},
                {"role": "user", "content": f"以下の教材から1問だけクイズを生成してください。\n\n{intermediate_answer}"}
            ],
            functions=[
                {
                    "name": "generate_quiz",
                    "description": "1問の4択問題を生成する",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "問題文": {"type": "string"},
                            "選択肢": {
                                "type": "array",
                                "items": {"type": "string"},
                                "minItems": 4,
                                "maxItems": 4
                            },
                            "正解": {"type": "string"},
                            "解説": {"type": "string"},
                            "出展ページ": {"type": "string"},
                        },
                        "required": ["問題文", "選択肢", "正解", "解説", "出展ページ"]
                    }
                }
            ],
            function_call={"name": "generate_quiz"},
            temperature=0.3,
        )

        function_call: ChatCompletionMessageToolCall = openai_response.choices[0].message.function_call
        arguments = json.loads(function_call.arguments)

        # 🔧 正解をA〜Dに変換
        correct_text = arguments["正解"]
        choices = arguments["選択肢"]
        if correct_text in choices:
            index = choices.index(correct_text)
            arguments["正解"] = ["A", "B", "C", "D"][index]
        else:
            logger.warning(f"正解が選択肢に一致しません: {correct_text}")

        return {
            "user": email,
            "question": data.question or "（自動生成）",
            "quiz": arguments,
        }

    except Exception as e:
        logger.exception("問題生成中に例外が発生しました")
        raise HTTPException(500, "AIからのクイズ生成でエラーが発生しました。")
                            
@app.post("/generate_quiz")
async def generate_quiz(data: StudyInput, email: str = Depends(verify_jwt_token)):
    prompt = f"""
以下の形式で1問の4択クイズをJSON形式で出力してください。

{{
  "問題文": "...",
  "選択肢": ["A", "B", "C", "D"],
  "正解": "",
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
        )
        quiz_text = response.choices[0].message.content.strip()
        quiz_data = json.loads(quiz_text)
        return {"quiz": quiz_data}

    except json.JSONDecodeError as e:
        raise HTTPException(500, f"JSON解析に失敗しました: {e}\n内容: {quiz_text}")
    except Exception as e:
        raise HTTPException(500, f"クイズ生成中にエラーが発生しました: {e}")
