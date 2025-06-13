import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Home from './Home';

export default function App() {
  const [auth, setAuth] = useState({ username: '', password: '' });

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setAuth={setAuth} />} />
        <Route
          path="/home"
          element={auth.username && auth.password ? (
            <Home auth={auth} />
          ) : (
            <Navigate to="/" />
          )}
        />
      </Routes>
    </Router>
  );
}
