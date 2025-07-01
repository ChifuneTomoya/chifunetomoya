# FastAPI本体や各種依存モジュールをインポート
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, constr
from jose import jwt
from jose.utils import base64url_decode
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
from openai import OpenAI
import boto3
import os
import requests
import logging
from typing import List
import json

from openai.types.chat import ChatCompletionMessageToolCall

# ロギング初期化
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cognito設定
COGNITO_REGION = os.getenv("COGNITO_REGION")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"

try:
    JWKS = requests.get(f"{COGNITO_ISSUER}/.well-known/jwks.json").json()
except Exception as e:
    logger.error(f"JWKS取得失敗: {e}")
    JWKS = None

# JWT検証
def jwk_to_public_key(jwk):
    e = int.from_bytes(base64url_decode(jwk["e"].encode()), "big")
    n = int.from_bytes(base64url_decode(jwk["n"].encode()), "big")
    return rsa.RSAPublicNumbers(e, n).public_key(default_backend())

def verify_jwt_token(request: Request) -> str:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "認証トークンがありません。")
    token = auth.split(" ")[1]

    if JWKS is None:
        raise HTTPException(500, "JWKSが取得できません。")

    try:
        header = jwt.get_unverified_header(token)
        key = next(k for k in JWKS["keys"] if k["kid"] == header["kid"])
        rsa_key = jwk_to_public_key(key)
        claims = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=COGNITO_ISSUER,
        )
        return claims.get("email", "unknown")
    except Exception as e:
        raise HTTPException(401, f"トークン検証に失敗しました: {e}")

# クライアント初期化
bedrock_client = boto3.client(
    "bedrock-agent-runtime",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

KNOWLEDGE_BASE_ID = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID")
MODEL_ARN = os.getenv("BEDROCK_MODEL_ARN")

# Pydanticモデル
class StudyInput(BaseModel):
    question: constr(min_length=1, max_length=500)  # type: ignore
    category: constr(min_length=1, max_length=50)   # type: ignore

last_sources = {}

@app.post("/study")
async def study(data: StudyInput, email: str = Depends(verify_jwt_token)):
    try:
        prev_source = last_sources.get(email)

        input_text = f"""
あなたはハイレベルなナレッジベース検索+問題生成AIです。
以下のカテゴリに応じて、**問題を5問生成してください**。
※同じ問題が連続しないよう注意してください。

問題内容:「{data.question}」が空のときは、下記に記載してある、使用するファイルに沿って生成してください。

使用するファイル:
-カテゴリ「{data.category}」が「問題集」の場合は `questions.pdf` だけを使用してください。
-カテゴリ「{data.category}」が「基本情報」の場合は、`2024r06_fe_kamoku_a_qs.pdf`と `2024r06_fe_kamoku_a_ans.pdf` から問題を生成してください。
基本情報カテゴリには、以下の2種類のPDFが存在します。

- `2024r06_fe_kamoku_a_qs.pdf`：問題番号と問題文と選択肢（ア〜エ）が掲載されています。
- `2024r06_fe_kamoku_a_ans.pdf`：問題番号と正解肢（ア〜エ）が掲載されています。

この2つのPDFを照合し、該当する問題に対する「問題番号・問題文・選択肢・正解」を組み合わせて出力してください。照合できなかった場合は、検索から外してください。
問題は問1から問20まであります。ただし、問題文や解答に図形が入っている問題は生成しないようにしてください。
題文: X 及び Y はそれぞれ 0 又は 1 の値をとる変数である。X □Y を X と Y の論理演算としたとき，次の真理値表が得られた。X □Y の真理値表はどれか。この問題は生成しないでください。

------------------------------------
カテゴリが問題集の場合
【問題集】
`questions.pdf`は6ページ、50問あります。
出力形式（例）：
Q1: 〜？
A1: 〜（解説） "出展ページ": "ファイル名とページ番号など"

Q2: ...
...
------------------------------------

------------------------------------
カテゴリが基本情報の場合
【基本情報】
`2024r06_fe_kamoku_a_qs.pdf`と`2024r06_fe_kamoku_a_ans.pdf`だけ使って下さい。
出力形式（例）：
問題番号:
問題文:
選択肢:
解答:
出展ページ": "ファイル名とページ番号など"
-------------------------------------

【特記事項】
- 「{prev_source}」のページ以外から選び、内容が前回と明確に異なるようにしてください。

カテゴリ:「{data.category}」
問題内容:「{data.question}」

"""

        logger.info(f"カテゴリ: {data.category} | 実際の質問（検索用）: {data.question or '（AIによる自動生成）'}")

        # Bedrockに問い合わせ
        response = bedrock_client.retrieve_and_generate(
            input={"text": input_text},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": KNOWLEDGE_BASE_ID,
                    "modelArn": MODEL_ARN,
                    "generationConfiguration": {
                        "inferenceConfig": {
                            "textInferenceConfig": {
                                "temperature": 0.8,
                                "topP": 0.7
                            }
                        }
                    }
                }
            }
        )

        intermediate_answer = response.get("output", {}).get("text", "").strip()
        logger.info("Claude中間回答: %s", intermediate_answer)

        if not intermediate_answer:
            raise HTTPException(500, "Claudeから有効な回答が得られませんでした。")

        # 出典抽出
        # ✅ citationsを取得し、出典情報を抽出
        citations = response.get("citations", [])
        source_infos = []
        for citation in citations:
            for ref in citation.get("retrievedReferences", []):
                try:
                    page = int(ref.get("metadata", {}).get("x-amz-bedrock-kb-document-page-number", 0))
                    uri = ref.get("location", {}).get("s3Location", {}).get("uri", "")
                    filename = uri.split("/")[-1] if uri else "questions.pdf"
                    source_infos.append(f"{filename} {page}ページ")
                except Exception as e:
                    logger.warning(f"出典情報の解析に失敗しました: {e}")

        if source_infos:
            # AI回答のテキスト末尾に正確な出典を追記
            intermediate_answer += "\n\n（出典: " + " / ".join(source_infos) + "）"


        # 🔧 Structured Outputでクイズ生成
        openai_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "あなたは教育アプリのAI講師です。"},
                {"role": "user", "content": f"以下の教材から1問だけ選んで、クイズを生成してください。\n\n{intermediate_answer}"}
            ],
            functions=[
                {
                    "name": "generate_quiz",
                    "description": "1問の4択問題を生成する",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "問題文": {"type": "string"},
                            "選択肢": {
                                "type": "array",
                                "items": {"type": "string"},
                                "minItems": 4,
                                "maxItems": 4
                            },
                            "正解": {"type": "string"},
                            "解説": {"type": "string"},
                            "出典ページ": {"type": "string"},
                        },
                        "required": ["問題文", "選択肢", "正解", "解説", "出典ページ"]
                    }
                }
            ],
            function_call={"name": "generate_quiz"},
            temperature=0.3,
        )

        function_call: ChatCompletionMessageToolCall = openai_response.choices[0].message.function_call
        arguments = json.loads(function_call.arguments)

        # 🔧 正解をA〜Dに変換
        correct_text = arguments["正解"]
        choices = arguments["選択肢"]
        if correct_text in choices:
            index = choices.index(correct_text)
            arguments["正解"] = ["A", "B", "C", "D"][index]
        else:
            logger.warning(f"正解が選択肢に一致しません: {correct_text}")

        return {
            "user": email,
            "question": data.question or "（自動生成）",
            "quiz": arguments,
        }

    except Exception as e:
        logger.exception("問題生成中に例外が発生しました")
        raise HTTPException(500, "AIからのクイズ生成でエラーが発生しました。")
    
from fastapi import BackgroundTasks

with open("quiz_data.json", "r", encoding="utf-8") as f:
    quiz_data = json.load(f)

# フロントから受け取る形式に合わせたリクエストモデル
class QuizRequest(BaseModel):
    category: str
    question: str

last_quiz_text = {}

# メモリ上でユーザー別に直前の問題文を記録（シンプルな辞書）
last_question_per_user = {}

@app.post("/generate_quiz")
def generate_quiz(request: QuizRequest, email: str = Depends(verify_jwt_token)):
    input_q = request.question.strip()
    user = email

    logging.info(f"Received: category={request.category}, question={input_q}")

    # 全問題から「問題文」と正解をフォーマットする関数
    def format_quiz(quiz: dict):
        choices = quiz["選択肢"]
        correct_text = quiz["正解"].strip()
        if correct_text in ["A", "B", "C", "D"]:
            return quiz
        if correct_text in choices:
            index = choices.index(correct_text)
            quiz["正解"] = ["A", "B", "C", "D"][index]
            return quiz
        for i, choice in enumerate(choices):
            if choice.startswith(correct_text):
                quiz["正解"] = ["A", "B", "C", "D"][i]
                return quiz
        logging.warning(f"正解が選択肢に見つかりません: {correct_text}")
        quiz["正解"] = "A"
        return quiz

    # 同じ問題が連続しないようにするロジック
    # まず、完全一致問題を探す
    matched_quizzes = [q for q in quiz_data if input_q in q["問題文"]]
    filtered_quizzes = []
    for quiz in matched_quizzes:
        formatted_quiz = format_quiz(quiz.copy())
        last_question = last_question_per_user.get(user)
        if last_question != formatted_quiz["問題文"]:
            filtered_quizzes.append(formatted_quiz)
    # filtered_quizzesに空ならmatched_quizzesに戻す（重複避けできない場合）
    if not filtered_quizzes:
        filtered_quizzes = [format_quiz(q.copy()) for q in matched_quizzes]

    if filtered_quizzes:
        selected_quiz = filtered_quizzes[0]
        last_question_per_user[user] = selected_quiz["問題文"]
        return {"quiz": selected_quiz}

    # 簡易類似度でベスト問題を選ぶ処理
    def simple_similarity(q1, q2):
        return sum(word in q2 for word in q1.split())

    candidates = sorted(quiz_data, key=lambda q: simple_similarity(input_q, q["問題文"] + q["解説"]), reverse=True)

    for candidate in candidates:
        formatted = format_quiz(candidate.copy())
        if last_question_per_user.get(user) != formatted["問題文"]:
            last_question_per_user[user] = formatted["問題文"]
            return {"quiz": formatted}

    # 全て重複する場合はそのまま返す
    quiz = format_quiz(candidates[0].copy())
    last_question_per_user[user] = quiz["問題文"]
    return {"quiz": quiz}
