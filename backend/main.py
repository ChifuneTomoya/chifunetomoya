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
        system_prompt = (
            "あなたは優秀な占い師です。\n"
            "返答では必ず依頼者のニックネーム（{nickname}）だけを使用してください。\n"
            "過去の名前（tomoyaさん、chifuneさんなど）を絶対に使ってはいけません。\n"
            "「こんにちは」「こんばんは」などの挨拶も禁止です。\n"
            "関西弁で、やさしく、丁寧に話してください。\n"
            "名前を本文に含める必要はありません。"
        )

        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{question}"}
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