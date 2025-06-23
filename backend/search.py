# search.py

import os
from dotenv import load_dotenv
import boto3

# .envファイルを読み込み
load_dotenv()

# 環境変数から認証情報を取得
aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
region = os.getenv("AWS_REGION", "ap-northeast-1")
knowledge_base_id = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID")

# 確認出力（デバッグ用）
print("KnowledgeBase ID:", knowledge_base_id)

# boto3 クライアント作成（Knowledge Base 用）
client = boto3.client(
    "bedrock-agent-runtime",
    region_name=region,
    aws_access_key_id=aws_access_key_id,
    aws_secret_access_key=aws_secret_access_key
)

# クエリ送信
response = client.retrieve_and_generate(
    input={
        "text": "日本の首都はどこに"
    },
    retrieveAndGenerateConfiguration={
        "type": "KNOWLEDGE_BASE",  # ✅ 正しい値
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": knowledge_base_id,
            "modelArn": "arn:aws:bedrock:ap-northeast-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0"
        }
    }
)

print("▼ 回答:")
print(response['output']['text'])
