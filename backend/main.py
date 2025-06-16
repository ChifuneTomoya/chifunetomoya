from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import secrets

# 環境変数をロード
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# CORS設定：フロントエンドのApp Runnerドメインを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://zg8m2euiyd.ap-northeast-1.awsapprunner.com"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ユーザー認証（Basic認証）
security = HTTPBasic()
USERS = {
    "tomoya": "tomoya",
    "chifune": "chifune",
}

def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    stored_password = USERS.get(credentials.username)
    if not stored_password or not secrets.compare_digest(credentials.password, stored_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました。",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# リクエスト用スキーマ
class UserInput(BaseModel):
    question: str
    nickname: str
    category: str

# OpenAIへ問い合わせ
async def ask_openai(nickname: str, question: str, category: str) -> str:
    try:
        system_prompt = (
            f"あなたは優秀な占い師です。\n"
            f"質問のカテゴリは「{category}」です。\n"
            f"返答では必ず依頼者のニックネーム（{nickname}さん）だけを使用してください。\n"
            f"過去の名前は絶対に使わず、挨拶も禁止です。\n"
        )

        response = client.chat.completions.create(
            model="gpt-4o",  
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{nickname}さんからのご質問です：{question}"}
            ]
        )
        return response.choices[0].message.content

    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "申し訳ありません、AIの応答に失敗しました。"

# 質問受付エンドポイント
@app.post("/question")
async def handle_question(data: UserInput, username: str = Depends(authenticate)):
    print("受信データ:", data.dict())  # デバッグ用
    answer = await ask_openai(data.nickname, data.question, data.category)
    return {"nickname": data.nickname, "response": answer}
