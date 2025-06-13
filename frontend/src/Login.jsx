import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('ユーザー名とパスワードを入力してください');
      return;
    }

    // ダミー認証チェック（実際のAPIにはHome側で送信）
    const testAuth = btoa(`${username}:${password}`);
    const res = await fetch('http://localhost:8000/question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${testAuth}`,
      },
      body: JSON.stringify({ question: "こんにちは" }),
    });

    if (res.ok) {
      setAuth({ username, password });
      navigate('/home');
    } else {
      const data = await res.json();
      setError(data.detail || 'ログイン失敗');
    }
  };

  return (
    <div style={styles.container}>
      <h2>ログイン画面</h2>
      <input
        style={styles.input}
        type="text"
        placeholder="ユーザー名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        style={styles.input}
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button style={styles.button} onClick={handleLogin}>ログイン</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

const styles = {
  container: {
    width: '90%',
    maxWidth: 400,
    margin: '50px auto',
    padding: '30px',
    border: '2px solid black',
    borderRadius: '20px',
    textAlign: 'center',
    fontFamily: 'sans-serif',
  },
  input: {
    width: '100%',
    margin: '10px 0',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid #333',
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
};
