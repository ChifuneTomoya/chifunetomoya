import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify, Auth } from 'aws-amplify';   // ← ここでAmplifyをimport
import awsExports from './aws-exports'; // 自動生成ファイル


import Login from './Login';
import Register from './Register';
import Home from './Home';

Amplify.configure(awsExports);

export default function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  Auth.currentAuthenticatedUser()
    .then(async user => {
      const session = await Auth.currentSession();
      const idToken = session.getIdToken().getJwtToken();

      setAuth({
        email: user.attributes.email,
        idToken: idToken,
      });
      setLoading(false);
    })
    .catch(() => {
      setAuth(null);
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
        <Route path="/home" element={auth ? <Home auth={auth} setAuth={handleSetAuth} /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}