import React, { useState } from 'react';
// React Routerのhooksをimport（ページ遷移用）
import { useNavigate } from 'react-router-dom';
// AWS AmplifyのAuthモジュールをimport（Cognito認証用）
import { Auth } from 'aws-amplify';

export default function Register({ setAuth }) {
  // メールアドレス入力状態を管理するstate
  const [email, setEmail] = useState('');
  // パスワード入力状態を管理するstate
  const [password, setPassword] = useState('');
  // 確認コード入力状態を管理するstate
  const [confirmationCode, setConfirmationCode] = useState('');
  // 登録ステップ管理('register'か'confirm')
  const [step, setStep] = useState('register');
  // エラーメッセージ表示用state
  const [error, setError] = useState('');
  // ローディング状態管理（API呼び出し中はtrue）
  const [loading, setLoading] = useState(false);
  // パスワード表示切替用state
  const [showPassword, setShowPassword] = useState(false);

  // ページ遷移用フック
  const navigate = useNavigate();

  // 新規登録処理
  const handleSignUp = async () => {
    setLoading(true);  // 処理開始のためローディングON
    setError('');      // エラーメッセージをリセット
    try {
      // AWS Cognitoにユーザー登録をリクエスト
      await Auth.signUp({
        username: email,
        password,
        attributes: { email },  // ユーザー属性にメールを設定
      });
      // 登録が成功したら確認コード入力ステップへ
      setStep('confirm');
    } catch (err) {
      // エラー時はメッセージをセット
      setError('登録に失敗しました：' + err.message);
    } finally {
      setLoading(false);  // 処理終了でローディングOFF
    }
  };

  // 確認コード認証処理
  const handleConfirmSignUp = async () => {
    setLoading(true);  // ローディングON
    setError('');      // エラーメッセージリセット
    try {
      // Cognitoに確認コードを送信して認証
      await Auth.confirmSignUp(email, confirmationCode);

      // 認証成功後に自動ログインを試みる
      const user = await Auth.signIn(email, password);

      // セッションからJWTトークンを取得
      const session = await Auth.currentSession();
      const idToken = session.getIdToken().getJwtToken();

      // 認証情報を親コンポーネントに渡す
      setAuth({
        user,
        idToken,
      });

      // ホーム画面に遷移
      navigate('/home');
    } catch (err) {
      // 確認コード認証エラーを表示
      setError('確認コードの認証に失敗しました：' + err.message);
    } finally {
      setLoading(false);  // ローディングOFF
    }
  };

  return (
    <div style={styles.container}>
      <h2>新規ユーザー登録</h2>

      {step === 'register' ? (
        <>
          {/* メールアドレス入力欄 */}
          <input
            style={styles.input}
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* パスワード入力欄＋表示切替ボタン */}
          <div style={{ position: 'relative' }}>
            <input
              style={styles.input}
              // 表示切替用にtype属性を切り替え
              type={showPassword ? 'text' : 'password'}
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}  // クリックで表示切替
              style={passwordToggleButtonStyle}
              aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {/* 登録ボタン */}
          <button
            style={styles.registerButton}
            onClick={handleSignUp}
            disabled={loading}  // ローディング中は無効化
          >
            {loading ? '処理中...' : '登録'}
          </button>
        </>
      ) : (
        <>
          {/* 確認コード入力画面 */}
          <p>登録したメールアドレスに確認コードを送信しました。</p>
          <input
            style={styles.input}
            type="text"
            placeholder="確認コード"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
          />
          {/* 確認ボタン */}
          <button
            style={styles.registerButton}
            onClick={handleConfirmSignUp}
            disabled={loading}
          >
            {loading ? '認証中...' : '確認'}
          </button>
        </>
      )}

      {/* エラーメッセージ表示 */}
      {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}

       {/* ログイン画面に戻るボタン */}
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

// パスワード表示切替ボタンのスタイルを変数にまとめる
const passwordToggleButtonStyle = {
  position: 'absolute',          // 親要素に対して絶対位置指定
  right: 10,                    // 右から10px
  top: '50%',                   // 上から50%（縦中央）
  transform: 'translateY(-50%)',// 自身の高さの半分だけ上にずらして中央寄せ
  background: 'none',           // 背景なし
  border: 'none',               // ボーダーなし
  cursor: 'pointer',            // ホバー時にポインター
  fontSize: '18px',             // フォントサイズ18px
  userSelect: 'none',           // テキスト選択不可
};

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
    boxSizing: 'border-box',
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