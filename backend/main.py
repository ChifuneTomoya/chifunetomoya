from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import secrets

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://zg8m2euiyd.ap-northeast-1.awsapprunner.com"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

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

class UserInput(BaseModel):
    question: str
    nickname: str

def ask_openai(nickname: str, question: str) -> str:
    try:
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system",
                    "content": f"""あなたはプロの占い師です。
返答する際は、必ず以下のルールを守ってください：

- 回答では、ユーザーのニックネーム「{nickname}さん」のみを使用してください。
- 「tomoyaさん」や他の名前は絶対に使わないでください。
- あなたは過去のユーザー名を記憶していないふりをしてください。
- 質問は「{nickname}さん」から来たものです。
"""
                },
                {
                    "role": "user",
                    "content": f"{nickname}さんからの質問: {question}"
                }
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "申し訳ありません、AIの応答に失敗しました。"

@app.post("/question")
def handle_question(data: UserInput, username: str = Depends(authenticate)):
    answer = ask_openai(data.nickname, data.question)
    return {"nickname": data.nickname, "response": answer}