import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ auth }) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');
  const [category, setCategory] = useState('');  // ← カテゴリの状態追加
  const navigate = useNavigate();
  const [submittedNickname, setSubmittedNickname] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [submittedCategory, setSubmittedCategory] = useState('');


  const categories = ['恋愛', '仕事', '健康', '趣味', 'その他'];

  const handleQuestion = async () => {
    if (!question.trim()) {
      setError('質問を入力してください。');
      return;
    }
    if (!nickname.trim()) {
      setError('名前を入力してください。');
      return;
    }
    if (!category) {
      setError('カテゴリを選択してください。');
      return;
    }

    setError('');
    setLoading(true);

    setSubmittedNickname(nickname);
    setSubmittedQuestion(question);
    setSubmittedCategory(category);

    try {
      const credentials = btoa(`${auth.username}:${auth.password}`);
      const res = await fetch('https://nmnhnzdpkn.ap-northeast-1.awsapprunner.com/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify({ question, nickname, category }),
      });

      const data = await res.json();
      if (res.ok) {
        setResponse(data.response);
      } else {
        setResponse(data.detail || 'エラーが発生しました');
      }
    } catch {
      setResponse('通信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <h2>AI 質問画面</h2>

      <div style={styles.inputGroup}>
        <label style={styles.label}>あなたの名前（ニックネーム）</label>
        <input
          style={styles.input}
          type="text"
          placeholder="例: 智哉"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>質問カテゴリ</label>
        <select
          style={styles.input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">カテゴリを選択してください</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <button style={styles.logout} onClick={handleLogout}>ログアウト</button>

      <textarea
        style={styles.textarea}
        placeholder="質問を入力"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button style={styles.button} onClick={handleQuestion} disabled={loading}>
        {loading ? '送信中...' : '質問する'}
      </button>

      <div style={styles.responseBox}>
        {response ? (
          <p>
            <strong>{submittedNickname} さんの質問（{submittedCategory}）:</strong> {submittedQuestion}<br />
            <strong>回答:</strong> {response}
          </p>
        ) : (
          <p>← AIの回答がここに表示されます</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '90%',
    maxWidth: 600,
    margin: '40px auto',
    padding: '30px',
    border: '2px solid black',
    borderRadius: '30px',
    fontFamily: 'sans-serif',
    backgroundColor: '#f0f0ff',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid #333',
  },
  logout: {
    marginBottom: '20px',
    padding: '8px 16px',
    fontSize: '14px',
    borderRadius: '10px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    height: '100px',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid #333',
    marginBottom: 15,
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
  },
  responseBox: {
    marginTop: 20,
    padding: '15px',
    border: '1px solid #ccc',
    borderRadius: '10px',
    backgroundColor: '#fff',
  },
};
