// Register.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth} from 'aws-amplify';

export default function Register({ setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [step, setStep] = useState('register'); // 'register' or 'confirm'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      await Auth.signUp({
        username: email,
        password,
        attributes: { email },
      });
      setStep('confirm');
    } catch (err) {
      setError('登録に失敗しました：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      await Auth.confirmSignUp(email, confirmationCode);

      // 確認成功後、自動ログイン
      const user = await Auth.signIn(email, password);

      // idTokenなど必要に応じて取得可能
      // const session = await Auth.currentSession();
      // const idToken = session.getIdToken().getJwtToken();

      setAuth(user);  // ここはuserオブジェクトを丸ごと渡す方が実用的です
      navigate('/home');
    } catch (err) {
      setError('確認コードの認証に失敗しました：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>新規ユーザー登録</h2>
      {step === 'register' ? (
        <>
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
          <button
            style={styles.registerButton}
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? '処理中...' : '登録'}
          </button>
        </>
      ) : (
        <>
          <p>登録したメールアドレスに確認コードを送信しました。</p>
          <input
            style={styles.input}
            type="text"
            placeholder="確認コード"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
          />
          <button
            style={styles.registerButton}
            onClick={handleConfirmSignUp}
            disabled={loading}
          >
            {loading ? '認証中...' : '確認'}
          </button>
        </>
      )}
      {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
      <button
        style={styles.backButton}
        onClick={() => navigate('/')}
        disabled={loading}
      >
        ログイン画面に戻る
      </button>
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
    backgroundColor: '#fff8f0',
  },
  input: {
    width: '100%',
    margin: '10px 0',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid #333',
  },
  registerButton: {
    width: '100%',
    padding: '10px 0',
    fontSize: '16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
  },
  backButton: {
    marginTop: 10,
    width: '100%',
    padding: '10px 0',
    fontSize: '16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
  },
};
