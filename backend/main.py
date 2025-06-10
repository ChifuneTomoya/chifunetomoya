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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic認証セットアップ
security = HTTPBasic()

# 仮ユーザー名・パスワード（本番では環境変数で）
USERNAME = "chifune"
PASSWORD = "tomoya"

# 認証関数
def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    is_user = secrets.compare_digest(credentials.username, USERNAME)
    is_pass = secrets.compare_digest(credentials.password, PASSWORD)
    if not (is_user and is_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました。",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username  # 認証後、名前として返す

# リクエストモデル
class UserInput(BaseModel):
    question: str

# OpenAIへ質問送信
def ask_openai(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
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
    prompt = f"{username}さんからの質問: {data.question}"
    answer = ask_openai(prompt)
    return {"response": answer}
