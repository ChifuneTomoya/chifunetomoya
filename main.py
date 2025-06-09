from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os

# .envファイルからAPIキーを読み込む
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# CORS設定（Reactとの連携用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# リクエストのデータ構造
class UserInput(BaseModel):
    name: str
    question: str

# OpenAI に質問して回答を得る関数
def ask_openai(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "あなたは優秀な料理人です。料理に関する質問に正確に答えてください。"},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "申し訳ありません。AIの応答に失敗しました。"

# POSTエンドポイント
@app.post("/question")
def handle_question(data: UserInput):
    prompt = f"{data.name}さんからの質問: {data.question}"
    answer = ask_openai(prompt)
    return {"response": answer}
