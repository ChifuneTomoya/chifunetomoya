import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';


export default function Home({ auth, setAuth }) {
  // auth はログイン情報（idTokenなど）を想定
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');
  const [category, setCategory] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [submittedCategory, setSubmittedCategory] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const categories = ['ITパスポート', '基本情報', '応用情報', 'その他'];
  const navigate = useNavigate();

  const handleStudy = async () => {
    if (!question.trim() || !nickname.trim() || !category) {
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
    setSubmittedCategory(category);
    setShowAnswer(false);
    setShowExplanation(false);

    try {
      const res = await fetch('https://nmnhnzdpkn.ap-northeast-1.awsapprunner.com/study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.idToken}`,
        },
        body: JSON.stringify({ question, nickname, category }),

      });
      console.log("送信するIDトークン:", auth.idToken);

      const data = await res.json();

      if (res.ok) {
        setAiQuestion(data.question || question);
        setCorrectAnswer(data.answer || '正解は設定されていません');
        setResponse(data.explanation || '解説はありません');
      } else {
        setResponse(data.detail || 'エラーが発生しました');
        setCorrectAnswer('');
      }
    } catch (e) {
      setError('通信に失敗しました');
      setResponse('');
      setCorrectAnswer('');
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
          style={styles.input}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="ニックネームを入力"
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
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <textarea
        style={styles.textarea}
        placeholder="学習したい問題・内容を入力してください"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button style={styles.button} onClick={handleStudy} disabled={loading}>
        {loading ? 'AIが出題中...' : 'AIに問題をだしてもらう'}
      </button>

      <div style={styles.responseBox}>
        {submittedQuestion ? (
          <>
            <p>
              <strong>
                {nickname} さん（{submittedCategory}）の問題：
              </strong>
            </p>
            <p>{aiQuestion || submittedQuestion}</p>

            {!showAnswer && (
              <button
                style={{ ...styles.answerButton, backgroundColor: '#007bff', color: '#fff' }}
                onClick={() => setShowAnswer(true)}
              >
                ✅ 正解を見る
              </button>
            )}

            {showAnswer && (
              <>
                <hr />
                <p><strong>正解：</strong></p>
                <p>{correctAnswer}</p>
              </>
            )}

            {!showExplanation && (
              <button
                style={{ ...styles.answerButton, backgroundColor: '#ffc107', color: '#000' }}
                onClick={() => setShowExplanation(true)}
              >
                📘 解説を見る
              </button>
            )}

            {showExplanation && (
              <>
                <hr />
                <p><strong>AIの解説：</strong></p>
                <p>{response}</p>
              </>
            )}
          </>
        ) : (
          <p>← ここに問題とAIの解説が表示されます</p>
        )}
      </div>

      <button onClick={handleLogout} style={styles.logoutButton}>
        ログアウト
      </button>
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
