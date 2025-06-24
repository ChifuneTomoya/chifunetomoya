import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify, Auth } from 'aws-amplify';
import awsconfig from './aws-exports';

import Login from './Login';
import Register from './Register';
import Home from './Home';

// Amplifyの設定をAWSの設定情報で初期化
Amplify.configure(awsconfig);
console.log(awsconfig);

export default function App() {
  // ログイン情報（認証情報）を保持するstate
  const [auth, setAuth] = useState(null);

  // 認証状態のチェックが終わるまでtrueにして「読み込み中」を表示
  const [loading, setLoading] = useState(true);

  // コンポーネントマウント時に一度だけ認証状態を復元・チェックする
  useEffect(() => {
    // 1) localStorageに保存された認証情報を試しに読み込む
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      try {
        // JSON文字列をオブジェクトに変換してstateにセット
        const parsed = JSON.parse(savedAuth);
        setAuth(parsed);
        // 認証情報が見つかったので読み込み終了
        setLoading(false);
        return; // これ以降は処理しない
      } catch (e) {
        // 何らかの理由でJSON変換に失敗した場合のエラー処理
        console.error("auth の復元に失敗しました:", e);
      }
    }

    // 2) localStorageに認証情報がなければ、AmplifyのCognitoセッションをチェック
    Auth.currentAuthenticatedUser()
      .then(async (user) => {
        // セッション情報があればidTokenを取得
        const session = await Auth.currentSession();
        const idToken = session.getIdToken().getJwtToken();

        // 認証情報としてメールアドレスとトークンをまとめる
        const newAuth = {
          email: user.attributes.email,
          idToken: idToken,
        };

        // stateにセットし、localStorageにも保存しておく
        setAuth(newAuth);
        localStorage.setItem('auth', JSON.stringify(newAuth));
      })
      .catch(() => {
        // セッションがなければ未ログイン状態にセット
        setAuth(null);
      })
      .finally(() => {
        // 認証チェックが完了したので読み込み終了
        setLoading(false);
      });
  }, []);

  // 認証情報の更新処理
  function handleSetAuth(authData) {
    setAuth(authData);
    if (authData) {
      // 認証情報があればlocalStorageにも保存
      localStorage.setItem('auth', JSON.stringify(authData));
    } else {
      // ログアウトなどでnullならlocalStorageから削除
      localStorage.removeItem('auth');
    }
  }

  // 認証チェック中は読み込み表示を返す
  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h2>資格学習アプリ</h2>
        <p>読み込み中...</p>
      </div>
    );
  }

  // 認証が完了したらルーティング処理を開始
  return (
    <Router>
      <Routes>
        {/* ログイン画面。認証成功時はsetAuthで状態を更新 */}
        <Route path="/" element={<Login setAuth={handleSetAuth} />} />

        {/* 新規登録画面。登録成功後に自動ログインでsetAuth更新 */}
        <Route path="/register" element={<Register setAuth={handleSetAuth} />} />

        {/* ホーム画面。認証がなければログイン画面へリダイレクト */}
        <Route
          path="/home"
          element={auth ? (
            <Home auth={auth} setAuth={handleSetAuth} />
          ) : (
            <Navigate to="/" />
          )}
        />
      </Routes>
    </Router>
  );
}