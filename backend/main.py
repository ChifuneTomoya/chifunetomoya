from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import secrets

# .envからAPIキーを読み込み
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# CORS設定（Reactとの連携）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://zg8m2euiyd.ap-northeast-1.awsapprunner.com"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Basic認証セットアップ
security = HTTPBasic()

# ユーザー名とパスワード（環境変数で管理するのが理想）
USERS = {
    "tomoya": "tomoya",
    "chifune": "chifune",
}

# 認証
def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    stored_password = USERS.get(credentials.username)
    is_user = stored_password is not None
    is_pass = is_user and secrets.compare_digest(credentials.password, stored_password)

    if not (is_user and is_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました。",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username  # 認証に成功した場合はユーザー名を返す

# リクエストスキーマ
class UserInput(BaseModel):
    question: str
    nickname: str

# AI回答生成
def ask_openai(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": "あなたは占い師です。占いに関する質問に正確に答えてください。ただし、ユーザーの名前を呼ばないでください。"},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "申し訳ありません、AIの応答に失敗しました。"

# エンドポイント：質問処理
@app.post("/question")
def handle_question(data: UserInput, _: str = Depends(authenticate)):
    prompt = f"{data.question}"
    answer = ask_openai(prompt)
    return {
        "nickname": data.nickname,
        "response": answer
    }
