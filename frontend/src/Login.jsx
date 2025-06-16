import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('ユーザー名とパスワードを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const testAuth = btoa(`${username}:${password}`);
      const res = await fetch('https://nmnhnzdpkn.ap-northeast-1.awsapprunner.com/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${testAuth}`,
        },
        body: JSON.stringify({ question: "こんにちは", nickname: username, category: "その他" }),


      });

      if (res.ok) {
        setAuth({ username, password });
        navigate('/home');
      } else {
        const contentType = res.headers.get('Content-Type');
        const data = contentType && contentType.includes('application/json')
          ? await res.json()
          : { detail: 'ログインに失敗しました' };
        setError(data.detail || 'ログインに失敗しました');
      }
    } catch (err) {
      console.error(err);
      setError('ネットワークエラー');
    } finally {
      setLoading(false);
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
      <button style={styles.button} onClick={handleLogin} disabled={loading}>
        {loading ? '送信中...' : 'ログイン'}
      </button>
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
