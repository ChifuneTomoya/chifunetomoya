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
            f"あなたは優秀な占い師です。\n"
            f"返答では、必ず質問者の名前「{nickname}さん」だけを使ってください。\n"
            f"過去のどんな名前（例：tomoyaさん、chifuneさん）も絶対に使ってはいけません。\n"
            f"また、「こんにちは」「こんばんは」などの挨拶文は含めないでください。\n"
            f"名前を間違えたり、省略したり、別の名前を使うことは絶対にしないでください。"
            f"関西弁で。"
        )

        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{nickname}さんからの質問: {question}"}
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