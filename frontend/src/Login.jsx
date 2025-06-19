import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth } from 'aws-amplify';


export default function Login({ setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const user = await Auth.signIn(email, password);

      if (!user.attributes || !user.attributes.email_verified) {
        setError('メール認証が完了していません。メールを確認してください。');
        setLoading(false);
        return;
      }

      const session = await Auth.currentSession();
      const idToken = session.getIdToken().getJwtToken();

      setAuth({ email, idToken });
      navigate('/home');
    } catch (err) {
      setError('ログインに失敗しました：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>資格学習アプリ - ログイン</h2>
      <input
        style={styles.input}
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        style={styles.input}
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button style={styles.button} onClick={handleLogin} disabled={loading}>
        {loading ? '認証中...' : 'ログイン'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p style={{ marginTop: 20 }}>
        アカウントをお持ちでない方は <Link to="/register">新規登録</Link>
      </p>
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
    backgroundColor: '#f5faff',
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
    backgroundColor: '#2196F3',
    color: 'white',
    cursor: 'pointer',
  },
};
