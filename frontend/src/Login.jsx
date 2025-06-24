import React, { useState } from 'react';
// React Routerのhooksとリンクコンポーネントをimport（ページ遷移とリンク用）
import { useNavigate, Link } from 'react-router-dom';
// AWS AmplifyのAuthモジュールをimport（Cognito認証用）
import { Auth } from 'aws-amplify';

export default function Login({ setAuth }) {
  // メールアドレスの入力状態を管理するstate
  const [email, setEmail] = useState('');
  // パスワードの入力状態を管理するstate
  const [password, setPassword] = useState('');
  // パスワード表示切替用state
  const [showPassword, setShowPassword] = useState(false);
  // エラーメッセージ表示用state
  const [error, setError] = useState('');
  // ローディング状態管理（API呼び出し中はtrue）
  const [loading, setLoading] = useState(false);

  // ページ遷移用フック
  const navigate = useNavigate();

  // ログイン処理の関数
  const handleLogin = async () => {
    // メールとパスワードが空ならエラーをセットして処理終了
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    // 処理開始のためローディングON、エラーメッセージはクリア
    setLoading(true);
    setError('');

    try {
      // AWS AmplifyのCognitoサインインを呼び出し
      const user = await Auth.signIn(email, password);

      // ユーザー属性がなかったりメール認証が済んでいない場合はエラー表示
      if (!user.attributes || !user.attributes.email_verified) {
        setError('メール認証が完了していません。メールを確認してください。');
        setLoading(false);
        return;
      }

      // セッションからJWTトークン（idToken）を取得
      const session = await Auth.currentSession();
      const idToken = session.getIdToken().getJwtToken();

      // 親コンポーネントに認証情報をセット
      setAuth({ email, idToken });

      // ログイン成功したのでホーム画面へ遷移
      navigate('/home');
    } catch (err) {
      // ログイン失敗時にエラーメッセージをセット
      setError('ログインに失敗しました：' + err.message);
    } finally {
      // 処理終了でローディングOFF
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>資格学習アプリ - ログイン</h2>

      {/* メールアドレス入力欄 */}
      <input
        style={styles.input}
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* パスワード入力欄＋表示切替ボタンをまとめてrelative配置 */}
      <div style={{ position: 'relative' }}>
        <input
          style={styles.input}
          type={showPassword ? 'text' : 'password'} // 表示切替
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)} // クリックで表示切替
          style={passwordToggleButtonStyle}
          aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>

      {/* ログインボタン。ローディング中は無効化し、テキストも切り替え */}
      <button
        style={styles.button}
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? '認証中...' : 'ログイン'}
      </button>

      {/* エラー表示（赤文字） */}
      {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}

      {/* 新規登録ページへのリンク */}
      <p style={{ marginTop: 20 }}>
        アカウントをお持ちでない方は <Link to="/register">新規登録</Link>
      </p>
    </div>
  );
}

// パスワード表示切替ボタンのスタイルまとめ
const passwordToggleButtonStyle = {
  position: 'absolute',          // relative親の中で絶対位置
  right: 10,                    // 右から10px
  top: '50%',                   // 上から50%の位置
  transform: 'translateY(-50%)',// 高さの半分だけ上にずらして縦中央
  background: 'none',           // 背景なし
  border: 'none',               // ボーダーなし
  cursor: 'pointer',            // ホバー時はカーソル変化
  fontSize: '18px',             // アイコンサイズ
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
    backgroundColor: '#f5faff', // 薄い青で清潔感を演出
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
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#2196F3', // 青色
    color: 'white',
    cursor: 'pointer',
  },
};