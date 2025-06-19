from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from jose import jwt
from jose.utils import base64url_decode
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import os
import requests
import boto3
from datetime import datetime

# .env読み込み
load_dotenv()

# OpenAI クライアント
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# FastAPIアプリ
app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://zg8m2euiyd.ap-northeast-1.awsapprunner.com",
        "https://d84l1y8p4kdic.cloudfront.net"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Cognito設定
COGNITO_REGION = os.getenv("COGNITO_REGION")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"
JWKS_URL = f"{COGNITO_ISSUER}/.well-known/jwks.json"
JWKS = requests.get(JWKS_URL).json()

# 🔐 トークン検証関数
def jwk_to_public_key(jwk):
    e = int.from_bytes(base64url_decode(jwk['e'].encode()), 'big')
    n = int.from_bytes(base64url_decode(jwk['n'].encode()), 'big')
    return rsa.RSAPublicNumbers(e, n).public_key(default_backend())

def verify_jwt_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="認証トークンがありません。")
    token = auth_header.split(" ")[1]

    try:
        header = jwt.get_unverified_header(token)
        key = next((k for k in JWKS["keys"] if k["kid"] == header["kid"]), None)
        if not key:
            raise HTTPException(status_code=401, detail="公開鍵が見つかりません。")
        rsa_key = jwk_to_public_key(key)

        claims = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=COGNITO_ISSUER
        )

        return claims.get("email", "unknown")

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"トークン検証に失敗しました: {e}")

# 📘 入力スキーマ
class StudyInput(BaseModel):
    question: str
    nickname: str
    category: str

# 🧠 OpenAI に質問する関数
async def ask_openai(nickname: str, question: str, category: str) -> dict:
    try:
        system_prompt = (
            f"あなたは資格試験の専門講師です。\n"
            f"カテゴリ「{category}」の問題に対して、{nickname}さん向けにやさしく丁寧に解説してください。\n"
            f"以下の形式で回答してください：\n"
            f"【問題】...\n【正解】...\n【解説】..."
        )
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"問題：{question}"}
            ]
        )
        content = response.choices[0].message.content

        result = {"question": "", "answer": "", "explanation": ""}
        for line in content.splitlines():
            if line.startswith("【問題】"):
                result["question"] = line.replace("【問題】", "").strip()
            elif line.startswith("【正解】"):
                result["answer"] = line.replace("【正解】", "").strip()
            elif line.startswith("【解説】"):
                result["explanation"] = line.replace("【解説】", "").strip()

        return result

    except Exception as e:
        print(f"OpenAI API error: {e}")
        return {
            "question": "",
            "answer": "",
            "explanation": "申し訳ありません、AIの応答に失敗しました。"
        }

# 📤 S3へアップロード関数
s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION"),
)

def upload_text_to_s3(nickname: str, data: dict):
    bucket = os.getenv("AWS_S3_BUCKET")
    now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{nickname}_{now}.txt"

    content = (
        f"【ニックネーム】{nickname}\n"
        f"【問題】{data['question']}\n"
        f"【正解】{data['answer']}\n"
        f"【解説】{data['explanation']}"
    )

    s3_client.put_object(
        Bucket=bucket,
        Key=filename,
        Body=content.encode("utf-8"),
        ContentType="text/plain"
    )

    return f"https://{bucket}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{filename}"

# 🎯 エンドポイント
@app.post("/study")
async def handle_study(data: StudyInput, email: str = Depends(verify_jwt_token)):
    result = await ask_openai(data.nickname, data.question, data.category)
    s3_url = upload_text_to_s3(data.nickname, result)

    return {
        "nickname": data.nickname,
        "question": result["question"],
        "answer": result["answer"],
        "explanation": result["explanation"],
        "user": email,
        "s3_url": s3_url  # S3に保存されたファイルURL
    }
