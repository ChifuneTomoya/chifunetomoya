from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    question: str  # 無視しますが形式維持のため残します

@app.post("/question")
def handle_question(data: UserInput):
    return {
        "response": f"{data.name}さん、ようこそ！！質問内容は「{data.question}」ですね！！"
    }