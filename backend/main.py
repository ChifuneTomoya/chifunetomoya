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

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

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

COGNITO_REGION = "ap-northeast-1"
USER_POOL_ID = "ap-northeast-1_QJgb4CpUW"
CLIENT_ID = "74qvhbo21o5s72jerfltvk0slq"
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"
JWKS_URL = f"{COGNITO_ISSUER}/.well-known/jwks.json"
JWKS = requests.get(JWKS_URL).json()

# 🔑 JWKをRSA公開鍵に変換する関数
def jwk_to_public_key(jwk):
    e = int.from_bytes(base64url_decode(jwk['e'].encode()), 'big')  # 修正: .encode()
    n = int.from_bytes(base64url_decode(jwk['n'].encode()), 'big')  # 修正: .encode()
    public_key = rsa.RSAPublicNumbers(e, n).public_key(default_backend())
    return public_key


# 🔐 トークン検証関数
def verify_jwt_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="認証トークンがありません。")

    token = auth_header.split(" ")[1]
    print(f"受け取ったトークン: {token[:30]}...")

    try:
        header = jwt.get_unverified_header(token)
        key = next((k for k in JWKS["keys"] if k["kid"] == header["kid"]), None)
        print(f"受信ヘッダー: {header}")
        print(f"JWKSのキー一覧: {[k['kid'] for k in JWKS['keys']]}")

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

        print(f"JWT検証成功: {claims}")
        return claims.get("email", "unknown")

    except Exception as e:
        print(f"JWT検証エラー: {e}")
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

# 🔁 質問API
@app.post("/study")
async def handle_study(data: StudyInput, email: str = Depends(verify_jwt_token)):
    result = await ask_openai(data.nickname, data.question, data.category)
    return {
        "nickname": data.nickname,
        "question": result["question"],
        "answer": result["answer"],
        "explanation": result["explanation"],
        "user": email
    }
