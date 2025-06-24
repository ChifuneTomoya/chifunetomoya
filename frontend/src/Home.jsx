import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ auth, setAuth }) {
  // ユーザーが入力する質問内容
  const [question, setQuestion] = useState('');
  // ユーザーのニックネーム
  const [nickname, setNickname] = useState('');
  // 質問のカテゴリ（例：基本情報、応用情報など）
  const [category, setCategory] = useState('');
  // 送信済みの質問を保存。回答表示用に使う
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  // AIの解説回答を格納
  const [aiAnswer, setAiAnswer] = useState('');
  // Claude（別AI）の回答を格納
  const [claudeAnswer, setClaudeAnswer] = useState('');
  // API呼び出し中のローディング状態
  const [loading, setLoading] = useState(false);
  // エラー表示用メッセージ
  const [error, setError] = useState('');
  // Claudeの回答表示ボタンを押したかどうか
  const [showClaudeAnswer, setShowClaudeAnswer] = useState(false);
  // AIの解説回答表示ボタンを押したかどうか
  const [showAiAnswer, setShowAiAnswer] = useState(false);
  // Claudeの回答が準備できているかどうか
  const [claudeReady, setClaudeReady] = useState(false);
  // 一時的な通知メッセージ
  const [notification, setNotification] = useState('');

  // 画面遷移に使うReact Routerのhook
  const navigate = useNavigate();

  // カテゴリの選択肢
  const categories = ['question.pdf', '基本情報', '応用情報', 'その他'];

  // 質問をAPIに送ってAIの回答を取得する処理
  const handleStudy = async () => {
    // 入力チェック（ニックネーム・カテゴリ・質問は必須）
    if (!nickname.trim() || !category || !question.trim()) {
      setError('すべての項目を入力してください。');
      return;
    }
    // ログイン認証情報（idToken）がない場合はエラー
    if (!auth || !auth.idToken) {
      console.log('auth:', auth);
      setError('ログインが必要です。');
      return;
    }

    // エラーをリセットし、ローディング状態にする
    setError('');
    setLoading(true);

    // 質問内容を送信済み質問として保存し、前の回答はクリア
    setSubmittedQuestion(question);
    setShowClaudeAnswer(false);
    setShowAiAnswer(false);
    setAiAnswer('');
    setClaudeAnswer('');
    setClaudeReady(false);
    setNotification('');

    try {
      // 自作のバックエンドAPI（FastAPI）にPOSTでリクエスト送信
      const res = await fetch('http://localhost:8000/study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 認証トークンをヘッダーに含める
          Authorization: `Bearer ${auth.idToken}`,
        },
        // ニックネーム、カテゴリ、質問内容をJSONで送る
        body: JSON.stringify({ nickname, category, question }),
      });

      // レスポンスをJSONで受け取る
      const data = await res.json();

      // レスポンスが成功なら
      if (res.ok) {
        // Claude回答をセット。なければ空文字
        setClaudeAnswer(data.claudeAnswer || '');
        // Claude回答があれば準備完了状態にして通知を表示
        if (data.claudeAnswer) {
          setClaudeReady(true);
          setNotification('✅ 回答が準備できました！ボタンを押してご確認ください。');
          // 3秒後に通知を消す
          setTimeout(() => setNotification(''), 3000);
        }
        // AIの解説回答をセット。なければ「回答がありません」と表示
        setAiAnswer(data.answer || '回答がありません');
      } else {
        // エラーがあれば表示
        setError(data.detail || 'エラーが発生しました');
      }
    } catch (e) {
      // 通信失敗時はエラーメッセージ表示
      setError('通信に失敗しました');
    } finally {
      // 処理終了でローディング解除
      setLoading(false);
    }
  };

  // ログアウト処理。localStorageから認証情報を削除し、親コンポーネントにもnullをセット
  const handleLogout = () => {
    localStorage.removeItem('auth');
    if (typeof setAuth === 'function') setAuth(null);
    // ログイン画面へ戻る
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <h2>資格学習アプリ</h2>

      {/* 一時通知を表示 */}
      {notification && (
        <div
          style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '10px',
          }}
        >
          {notification}
        </div>
      )}

      {/* ニックネーム入力 */}
      <div style={styles.inputGroup}>
        <label>お名前（ニックネーム）</label>
        <input
          type="text"
          style={styles.input}
          placeholder="ニックネームを入力"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      {/* カテゴリ選択 */}
      <div style={styles.inputGroup}>
        <label>試験カテゴリ</label>
        <select
          style={styles.input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">▼ カテゴリを選んでください</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* 質問入力欄 */}
      <div style={styles.inputGroup}>
        <label>質問内容</label>
        <textarea
          style={styles.textarea}
          placeholder="学習したい問題・内容を入力してください"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      {/* エラーメッセージ表示 */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* AIに質問ボタン。ローディング中は無効 */}
      <button
        style={styles.button}
        onClick={handleStudy}
        disabled={loading}
        aria-label="AIに質問する"
      >
        {loading ? 'AIが回答中...' : 'AIに質問する'}
      </button>

      {/* 回答表示エリア */}
      <div style={styles.responseBox}>
        {/* 質問が送信済みの場合に表示 */}
        {submittedQuestion ? (
          <>
            <p>
              <strong>{nickname} さんの質問：</strong>
            </p>
            <p>{submittedQuestion}</p>

            {/* Claude回答があれば回答を見るボタンまたは回答本文を表示 */}
            {claudeAnswer && (
              <>
                {!showClaudeAnswer ? (
                  <button
                    style={{
                      ...styles.answerButton,
                      backgroundColor: claudeReady ? '#007bff' : '#6c757d',
                      color: '#fff',
                      cursor: claudeReady ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => {
                      if (claudeReady) setShowClaudeAnswer(true);
                    }}
                    disabled={!claudeReady}
                  >
                    {claudeReady ? '✅ 回答を見る' : '回答を取得中...'}
                  </button>
                ) : (
                  <>
                    <p>
                      <strong>回答：</strong>
                    </p>
                    <p>{claudeAnswer}</p>
                    <hr />
                  </>
                )}
              </>
            )}

            {/* AIの解説回答があれば解説を見るボタンまたは解説本文を表示 */}
            {aiAnswer && (
              <>
                {!showAiAnswer ? (
                  <button
                    style={{
                      ...styles.answerButton,
                      backgroundColor: '#28a745',
                      color: '#fff',
                    }}
                    onClick={() => setShowAiAnswer(true)}
                  >
                    ✅ 解説を見る
                  </button>
                ) : (
                  <>
                    <p>
                      <strong>解説：</strong>
                    </p>
                    <p>{aiAnswer}</p>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          // まだ質問が送信されていない場合のプレースホルダー表示
          <p>← ここに質問とAIの回答が表示されます</p>
        )}
      </div>

      {/* ログアウトボタン */}
      <button style={styles.logoutButton} onClick={handleLogout}>
        ログアウト
      </button>
    </div>
  );
}

// スタイル定義
const styles = {
  container: {
    maxWidth: 600,
    margin: '30px auto',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    fontFamily: 'sans-serif',
  },
  inputGroup: {
    marginBottom: 15,
  },
  input: {
    width: '100%',
    padding: 10,
    fontSize: 16,
    borderRadius: 6,
    border: '1px solid #ccc',
  },
  textarea: {
    width: '100%',
    height: 120,
    padding: 10,
    fontSize: 16,
    borderRadius: 6,
    border: '1px solid #ccc',
    resize: 'vertical',
  },
  button: {
    padding: '10px 20px',
    fontSize: 16,
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 10,
  },
  answerButton: {
    marginTop: 20,
    marginBottom: 20,
    padding: '12px 20px',
    fontSize: 16,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'block',
    width: '100%',
    textAlign: 'center',
  },
  responseBox: {
    marginTop: 30,
    padding: 20,
    border: '1px solid #ccc',
    borderRadius: 6,
    backgroundColor: '#fff',
    whiteSpace: 'pre-wrap', // 改行を反映して表示
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    fontSize: 16,
    borderRadius: 6,
    cursor: 'pointer',
  },
};
