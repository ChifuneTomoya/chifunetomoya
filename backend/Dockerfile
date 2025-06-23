FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
FROM python:3.11-slim

WORKDIR /app

# 最新の pip にアップグレード（依存解決の安定化）
RUN pip install --upgrade pip

# requirements.txt をコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションのコードをコピー
COPY . .

# FastAPI サーバー起動
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]