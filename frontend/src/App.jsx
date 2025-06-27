import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify, Auth } from 'aws-amplify';
import awsconfig from './aws-exports';

import Login from './Login';
import Register from './Register';
import Home from './Home';
import Aiquiz from './Aiquiz';
// Amplify設定
Amplify.configure(awsconfig);

export default function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        setAuth(parsed);
        setLoading(false);
        return;
      } catch (e) {
        console.error("auth の復元に失敗しました:", e);
      }
    }

    Auth.currentAuthenticatedUser()
      .then(async (user) => {
        const session = await Auth.currentSession();
        const idToken = session.getIdToken().getJwtToken();
        const newAuth = {
          email: user.attributes.email,
          idToken: idToken,
        };
        setAuth(newAuth);
        localStorage.setItem('auth', JSON.stringify(newAuth));
      })
      .catch(() => {
        setAuth(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function handleSetAuth(authData) {
    setAuth(authData);
    if (authData) {
      localStorage.setItem('auth', JSON.stringify(authData));
    } else {
      localStorage.removeItem('auth');
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h2>資格学習アプリ</h2>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setAuth={handleSetAuth} />} />
        <Route path="/register" element={<Register setAuth={handleSetAuth} />} />

        <Route
          path="/home"
          element={
            auth ? <Home auth={auth} setAuth={handleSetAuth} /> : <Navigate to="/" />
          }
          />
          {/* ✅ AIクイズページを追加 */}
        <Route
          path="/Aiquiz"
          element={
            auth ? <Aiquiz auth={auth} /> : <Navigate to="/" />
          }
        />
      </Routes>
    </Router>
  );
}