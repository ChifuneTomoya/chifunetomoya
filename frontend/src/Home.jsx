import React, { useState } from 'react';

export default function Home({ auth }) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuestion = async () => {
    setLoading(true);
    try {
      const credentials = btoa(`${auth.username}:${auth.password}`);
      const res = await fetch('http://localhost:8000/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (res.ok) {
        setResponse(data.response);
      } else {
        setResponse(data.detail || 'エラーが発生しました');
      }
    } catch {
      setResponse('通信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>AI 質問画面</h2>
      <textarea
        style={styles.textarea}
        placeholder="質問を入力"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button style={styles.button} onClick={handleQuestion} disabled={loading}>
        {loading ? '送信中...' : '質問する'}
      </button>
      <div style={styles.responseBox}>
        <p>{response || '← AIの回答がここに表示されます'}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '90%',
    maxWidth: 600,
    margin: '40px auto',
    padding: '30px',
    border: '2px solid black',
    borderRadius: '30px',
    fontFamily: 'sans-serif',
    backgroundColor: '#f0f0ff',
  },
  textarea: {
    width: '100%',
    height: '100px',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid #333',
    marginBottom: 15,
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
  },
  responseBox: {
    marginTop: 20,
    padding: '15px',
    border: '1px solid #ccc',
    borderRadius: '10px',
    backgroundColor: '#fff',
  },
};
