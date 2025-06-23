import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ auth, setAuth }) {
  const [question, setQuestion] = useState('');
  const [nickname, setNickname] = useState('');
  const [category, setCategory] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  const navigate = useNavigate();
  const categories = ['ITパスポート', '基本情報', '応用情報', 'その他'];

  const handleStudy = async () => {
    if (!nickname.trim() || !category || !question.trim()) {
      setError('すべての項目を入力してください。');
      return;
    }
    if (!auth || !auth.idToken) {
      setError('ログインが必要です。');
      return;
    }
    setError('');
    setLoading(true);
    setSubmittedQuestion(question);
    setShowAnswer(false);

    try {
      const res = await fetch('http://localhost:8000/study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.idToken}`,
        },
        body: JSON.stringify({ nickname, category, question }),
      });

      const data = await res.json();

      if (res.ok) {
        setAiAnswer(data.answer || data.answer === '' ? data.answer : data.answer || '回答がありません');
      } else {
        setError(data.detail || 'エラーが発生しました');
        setAiAnswer('');
      }
    } catch (e) {
      setError('通信に失敗しました');
      setAiAnswer('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    if (typeof setAuth === 'function') setAuth(null);
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <h2>資格学習アプリ</h2>

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

      <div style={styles.inputGroup}>
        <label>試験カテゴリ</label>
        <select
          style={styles.input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">▼ カテゴリを選んでください</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div style={styles.inputGroup}>
        <label>質問内容</label>
        <textarea
          style={styles.textarea}
          placeholder="学習したい問題・内容を入力してください"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button
        style={styles.button}
        onClick={handleStudy}
        disabled={loading}
        aria-label="AIに質問する"
      >
        {loading ? 'AIが回答中...' : 'AIに質問する'}
      </button>

      <div style={styles.responseBox}>
        {submittedQuestion ? (
          <>
            <p><strong>{nickname} さんの質問：</strong></p>
            <p>{submittedQuestion}</p>

            {!showAnswer && (
              <button
                style={{ ...styles.answerButton, backgroundColor: '#007bff', color: '#fff' }}
                onClick={() => setShowAnswer(true)}
              >
                ✅ 回答を見る
              </button>
            )}

            {showAnswer && (
              <>
                <hr />
                <p><strong>AIの回答：</strong></p>
                <p>{aiAnswer}</p>
              </>
            )}
          </>
        ) : (
          <p>← ここに質問とAIの回答が表示されます</p>
        )}
      </div>

      <button style={styles.logoutButton} onClick={handleLogout}>ログアウト</button>
    </div>
  );
}

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
    whiteSpace: 'pre-wrap',
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
