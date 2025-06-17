import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ auth }) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();

  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [submittedCategory, setSubmittedCategory] = useState('');

  const categories = ['ITパスポート', '簿記3級', '英検', '宅建', 'その他'];

  const handleStudy = async () => {
    if (!question.trim() || !nickname.trim() || !category) {
      setError('全ての項目を入力してください。');
      return;
    }

    setError('');
    setLoading(true);
    setSubmittedQuestion(question);
    setSubmittedCategory(category);

    try {
      const credentials = btoa(`${auth.username}:${auth.password}`);
      const res = await fetch('https://nmnhnzdpkn.ap-northeast-1.awsapprunner.com/study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify({ question, nickname, category }),
      });

      const data = await res.json();
      setResponse(res.ok ? data.response : data.detail || 'エラーが発生しました');
    } catch {
      setResponse('通信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <h2>資格学習アプリ</h2>

      <div style={styles.inputGroup}>
        <label>ニックネーム</label>
        <input style={styles.input} value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </div>

      <div style={styles.inputGroup}>
        <label>試験カテゴリ</label>
        <select style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">カテゴリを選択してください</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <textarea
        style={styles.textarea}
        placeholder="学習したい問題や内容を入力"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button style={styles.button} onClick={handleStudy} disabled={loading}>
        {loading ? '解説中...' : '解説を依頼'}
      </button>

      <div style={styles.responseBox}>
        {response ? (
          <p>
            <strong>{nickname} さん（{submittedCategory}）の問題:</strong><br />
            {submittedQuestion}<br />
            <strong>AI解説:</strong><br />
            {response}
          </p>
        ) : (
          <p>← ここにAIの解説が表示されます</p>
        )}
      </div>
      <button onClick={handleLogout} style={{ marginTop: 20 }}>ログアウト</button>
    </div>
  );
}

const styles = {
  container: { maxWidth: 600, margin: '30px auto', padding: 20, backgroundColor: '#f8f9fa', borderRadius: 10 },
  inputGroup: { marginBottom: 15 },
  input: { width: '100%', padding: 10, fontSize: 16, borderRadius: 6 },
  textarea: { width: '100%', height: 120, padding: 10, fontSize: 16, borderRadius: 6 },
  button: { padding: '10px 20px', fontSize: 16, backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: 6 },
  responseBox: { marginTop: 20, padding: 15, border: '1px solid #ccc', borderRadius: 6, backgroundColor: '#fff' },
};
