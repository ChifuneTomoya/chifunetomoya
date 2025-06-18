

## 修正していただきたい点！

### 1. 秘匿情報のハードコーディング

```python
# backend/main.py:28-29
USERNAME = "chifune"
PASSWORD = "tomoya"
```
**問題**: ユーザー名とパスワードがハードコーディングされている（コード内に書いている）
**解決策**: 環境変数で管理する
```python
USERNAME = os.getenv("USERNAME", "default_user")
PASSWORD = os.getenv("PASSWORD", "default_pass")
```
### 2. オリジンを全て許可している

```python
# backend/main.py:19
allow_origins=["*"]
```
**問題**: すべてのオリジンからのアクセスを許可している
**解決策**: 特定のドメインのみ許可
```python
allow_origins=["http://localhost:3000", "https://yourdomain.com"]
```

### 2. プロジェクト構造の混乱

```
chifune/
├── backend/              # 正しい場所
├── frontend/             # 正しい場所
├── main.py              # 重複：backend/main.py と同じ
├── model.py             # 重複：backend/model.py と同じ
├── src/                 # 重複：frontend/src と同じ
└── package.json         # 重複：frontend/package.json と同じ
```

ルートディレクトリの重複ファイルを削除する

### 4. **環境設定の不備**

#### 🔸 **重要度：中**
- `.env`ファイルの例がない
- 環境変数の設定方法が不明
基本的には.envは.gitignoreでコミット対象から外します。
しかし、そのままでは、どんな内容を.envに書いたらいいのかわからないので基本的には`.env.sample`というファイルを作り、その中に設定する環境変数とそのサンプルを書きます！！




### ポイントのまとめ

1. **セキュリティの基本**
   - パスワードやAPIキーは絶対にコードに書かない
   - 環境変数で秘密情報を管理する

2. **プロジェクト構成**
   - フォルダ構成は一貫性を保つ
   - 重複ファイルは避ける

