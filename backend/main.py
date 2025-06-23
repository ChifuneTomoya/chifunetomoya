from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt
from jose.utils import base64url_decode
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
import boto3
import os
import requests

load_dotenv()

app = FastAPI()

# CORS設定（必要に応じて調整）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cognito情報
COGNITO_REGION = os.getenv("COGNITO_REGION")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"

try:
    JWKS = requests.get(f"{COGNITO_ISSUER}/.well-known/jwks.json").json()
except Exception as e:
    print(f"JWKS取得失敗: {e}")
    JWKS = None

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

# Bedrockクライアント初期化
bedrock_client = boto3.client(
    "bedrock-agent-runtime",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

# 環境変数から設定
KNOWLEDGE_BASE_ID = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID")
MODEL_ARN = os.getenv("arn:aws:bedrock:ap-northeast-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0")  # 例: "arn:aws:bedrock:ap-northeast-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0"

class StudyInput(BaseModel):
    nickname: str
    question: str
    category: str

@app.post("/study")
async def study(data: StudyInput, email: str = Depends(verify_jwt_token)):
    try:
        # Bedrockのretrieve_and_generate API呼び出し
        response = bedrock_client.retrieve_and_generate(
            input={
                "text": data.question
            },
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": KNOWLEDGE_BASE_ID,
                    "modelArn": MODEL_ARN,
                }
            }
        )
        # 返答テキスト取得
        answer = response.get("generatedResponse", {}).get("text", "")
        # シンプルに回答だけ返す形にしています
        return {
            "nickname": data.nickname,
            "user": email,
            "question": data.question,
            "answer": answer
        }
    except Exception as e:
        raise HTTPException(500, f"Bedrock問い合わせエラー: {e}")
