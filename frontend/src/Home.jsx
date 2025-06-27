import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ auth, setAuth }) {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const navigate = useNavigate();
  const categories = ['問題集', '基本情報', '応用情報', 'その他'];

  const handleStudy = async () => {
    if (!category) {
      setError('カテゴリーを選択してください');
      return;
    }

    if (!auth?.idToken) {
      setError('ログインが必要です。');
      return;
    }

    setError('');
    setLoading(true);
    setQuiz(null);
    setSelectedChoice(null);
    setShowAnswer(false);

    try {
      const res = await fetch('http://localhost:8000/study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.idToken}`,
        },
        body: JSON.stringify({
          category,
          question: question.trim() || '（AIによる自動生成）',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setQuiz(data.quiz);
      } else {
        setError(data.detail || 'エラーが発生しました');
      }
    } catch (e) {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    if (typeof setAuth === 'function') setAuth(null);
    navigate('/');
  };

  const handleChoiceSelect = (choice) => {
    setSelectedChoice(choice);
    setShowAnswer(true);
  };

  return (
    <div style={styles.container}>
      <h2>資格学習アプリ</h2>

      <div style={styles.inputGroup}>
        <label>試験カテゴリ</label>
        <select
          style={styles.input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">▼ 選択してください</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div style={styles.inputGroup}>
        <label>問題内容</label>
        <textarea
          style={styles.textarea}
          placeholder="例：OSI参照モデルについて知りたい"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      {error && (
        <div style={{ color: 'red' }}>
          {(() => {
            if (typeof error === 'string') return error;
            if (Array.isArray(error))
              return error.map((e, i) => <p key={i}>{e?.msg || JSON.stringify(e)}</p>);
            if (typeof error === 'object') return <p>{error?.msg || JSON.stringify(error)}</p>;
            return '不明なエラーが発生しました';
          })()}
        </div>
      )}

      <button
        onClick={handleStudy}
        disabled={loading}
        style={{
          ...styles.button,
          backgroundColor: loading ? '#6c757d' : '#007bff',
        }}
      >
        {loading ? 'AIが問題を作成中...' : '問題を作成'}
      </button>

      {quiz && (
        <div style={styles.quizBox}>
          <h3>
            {quiz.問題文 === '（AIによる自動生成）'
              ? 'AIがランダムに出題しました'
              : quiz.問題文}
          </h3>
          <p><strong>カテゴリ:</strong> {category}</p>

          <ul style={styles.choiceList}>
            {quiz.選択肢.map((choice, index) => {
              const letter = ['A', 'B', 'C', 'D'][index];
              const isCorrect = letter === quiz.正解;
              const isSelected = selectedChoice === choice;

              let backgroundColor = '#fff';
              let borderColor = '#ccc';
              let color = '#000';
              let icon = null;

              if (selectedChoice) {
                if (isSelected && isCorrect) {
                  backgroundColor = '#d4edda';
                  borderColor = '#28a745';
                  color = '#155724';
                  icon = '✓ 正解';
                } else if (isSelected && !isCorrect) {
                  backgroundColor = '#f8d7da';
                  borderColor = '#dc3545';
                  color = '#721c24';
                  icon = '✗ 不正解';
                } else if (isCorrect) {
                  backgroundColor = '#e2f0d9';
                  borderColor = '#28a745';
                  color = '#155724';
                  icon = '✓ 正解';
                } else {
                  color = '#999';
                }
              }

              return (
                <li key={choice} style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => handleChoiceSelect(choice)}
                    disabled={!!selectedChoice}
                    style={{
                      ...styles.choiceButton,
                      backgroundColor,
                      borderColor,
                      color,
                    }}
                  >
                    {letter}. {choice}
                    {icon && (
                      <span style={{ float: 'right', fontWeight: 'bold' }}>{icon}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {showAnswer && (
            <div style={styles.explanationBox}>
              <strong>正解：</strong> {quiz.正解}. {quiz.選択肢[['A', 'B', 'C', 'D'].indexOf(quiz.正解)]}
              <br />
              <strong>解説：</strong> {quiz.解説}
              {quiz.出典ページ && (
                <>
                  <br />
                  <strong>出典ページ：</strong> {quiz.出典ページ}ページ
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div style={styles.buttonGroup}>
        <button
          style={{ ...styles.button, backgroundColor: '#007bff' }}
          onClick={() => navigate('/Aiquiz')}
        >
          AIクイズページへ
        </button>
        <button
          style={styles.logoutButton}
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: '30px auto',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    fontFamily: 'sans-serif',
  },
  inputGroup: {
    marginBottom: 15,
  },
  input: {
    width: '100%',
    padding: 10,
    fontSize: 16,
    borderRadius: 6,
    border: '1px solid #ccc',
  },
  textarea: {
    width: '100%',
    height: 100,
    padding: 10,
    fontSize: 16,
    borderRadius: 6,
    border: '1px solid #ccc',
    resize: 'vertical',
  },
  button: {
    padding: '10px 20px',
    fontSize: 16,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 10,
    width: '100%',
  },
  choiceList: {
    listStyle: 'none',
    padding: 0,
  },
  choiceButton: {
    width: '100%',
    padding: '10px 16px',
    fontSize: 16,
    border: '1px solid #ccc',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'left',
  },
  explanationBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    border: '1px solid #ddd',
    color: '#333',
  },
  quizBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #ddd',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 20,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    fontSize: 16,
    borderRadius: 6,
    cursor: 'pointer',
    width: '100%',
  },
};