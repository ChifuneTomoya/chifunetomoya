import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ auth }) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');

  const handleQuestion = async () => {
    if (!question.trim()) {
      setError('質問を入力してください。');
      return;
    }

    if (!nickname.trim()) {
      setError('名前を入力してください。');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const credentials = btoa(`${auth.username}:${auth.password}`);
      const res = await fetch('https://nmnhnzdpkn.ap-northeast-1.awsapprunner.com/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify({ question })
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

  // 🔴 ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem('auth');
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <h2>AI 質問画面</h2>
      <p style={styles.welcome}>
        {auth?.username ? `ようこそ、${auth.username} さん` : 'ユーザー情報がありません'}
      </p>

      {/* 🔽 名前の入力欄 */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>あなたの名前（ニックネーム）</label>
        <input
          style={styles.input}
          type="text"
          placeholder="例: tomoya"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
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
            <strong>{nickname} さんの質問:</strong>「{question}」<br />
            <strong>AIの回答:</strong>「{response}」
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
  welcome: {
    fontSize: '16px',
    marginBottom: '10px',
    color: '#333',
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
