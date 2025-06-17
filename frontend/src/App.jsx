import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Home from './Home';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初回読み込み時に localStorage から認証情報を復元
  useEffect(() => {
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      setAuth(JSON.parse(savedAuth));
    }
    // 読み込み中アニメーション用に1秒だけ遅延
    setTimeout(() => setLoading(false), 1000);
  }, []);

  // ログイン成功時に localStorage に保存
  function handleSetAuth(authData) {
    setAuth(authData);
    localStorage.setItem('auth', JSON.stringify(authData));
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <h2>資格学習アプリ</h2>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setAuth={handleSetAuth} />} />
        <Route
          path="/home"
          element={auth ? <Home auth={auth} /> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
}

const styles = {
  loading: {
    textAlign: 'center',
    marginTop: '100px',
    fontFamily: 'sans-serif',
  },
};
