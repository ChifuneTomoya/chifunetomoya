from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import secrets
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

# 仮ユーザー名・パスワード（本番では環境変数で）
USERS = {
    "tomoya": "tomoya",
    "chifune": "chifune",
}

# 認証関数
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
    return credentials.username

# リクエストモデル
class UserInput(BaseModel):
    question: str

# OpenAIへ質問送信
def ask_openai(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": "あなたは占い師です。占いに関する質問に正確に答えてください。"},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "申し訳ありません、AIの応答に失敗しました。"

# 質問API（認証付き）
@app.post("/question")
def handle_question(data: UserInput, username: str = Depends(authenticate)):
    prompt = f"{data.question}"
    answer = ask_openai(prompt)
    return {"response": answer}
