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
    "student1": "password1",
    "student2": "password2",
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

class StudyInput(BaseModel):
    question: str
    nickname: str
    category: str

async def ask_openai(nickname: str, question: str, category: str) -> str:
    try:
        system_prompt = (
            f"あなたは資格試験の専門講師です。\n"
            f"カテゴリ「{category}」の問題に対して、{nickname}さん向けにやさしく丁寧に解説してください。\n"
            f"専門用語がある場合は簡単に説明してください。"
        )
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"問題：{question}"}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "申し訳ありません、AIの応答に失敗しました。"

@app.post("/study")
async def handle_study(data: StudyInput, username: str = Depends(authenticate)):
    explanation = await ask_openai(data.nickname, data.question, data.category)
    return {"nickname": data.nickname, "response": explanation}
