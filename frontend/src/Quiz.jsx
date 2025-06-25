import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Quiz({ auth }) {
  const navigate = useNavigate();

  // 問題リスト
  const [questions, setQuestions] = useState([]);
  // 現在の問題インデックス
  const [currentIndex, setCurrentIndex] = useState(0);
  // ユーザーの回答
  const [userAnswer, setUserAnswer] = useState('');
  // 正誤判定メッセージ
  const [resultMessage, setResultMessage] = useState('');
  // ローディング状態
  const [loading, setLoading] = useState(true);
  // エラー状態
  const [error, setError] = useState('');

  useEffect(() => {
    // 問題データをバックエンドから取得
    const fetchQuestions = async () => {
      try {
        const res = await fetch('http://localhost:8000/questions', {
          headers: {
            Authorization: `Bearer ${auth.idToken}`,
          },
        });
        if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
        const data = await res.json();
        setQuestions(data);
        setLoading(false);
      } catch (e) {
        setError('問題の取得に失敗しました。');
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [auth]);

  if (loading) return <p>問題を読み込み中...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (questions.length === 0) return <p>問題がありません。</p>;

  const currentQuestion = questions[currentIndex];

  const handleSubmit = () => {
    if (userAnswer === '') {
      alert('回答を選択してください。');
      return;
    }
    if (userAnswer === currentQuestion.正解) {
      setResultMessage('正解です！🎉');
    } else {
      setResultMessage(`不正解です。正解は「${currentQuestion.正解}」です。\n解説: ${currentQuestion.解説}`);
    }
  };

  const handleNext = () => {
    setUserAnswer('');
    setResultMessage('');
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert('これで全問終了です。ホームへ戻ります。');
      navigate('/home');
    }
  };

  return (
    <div style={styles.container}>
      <h2>クイズページ</h2>
      <div style={styles.questionBox}>
        <p><strong>問題 {currentIndex + 1} / {questions.length}</strong></p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{currentQuestion.問題文}</p>

        {/* 選択肢ラジオボタン */}
        {currentQuestion.選択肢.map((choice, idx) => (
          <label key={idx} style={styles.choiceLabel}>
            <input
              type="radio"
              name="answer"
              value={choice}
              checked={userAnswer === choice}
              onChange={() => setUserAnswer(choice)}
            />
            {choice}
          </label>
        ))}

        {/* 結果表示 */}
        {resultMessage && (
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{resultMessage}</p>
        )}

        {/* 回答・次へボタン */}
        {!resultMessage ? (
          <button style={styles.button} onClick={handleSubmit}>
            回答する
          </button>
        ) : (
          <button style={styles.button} onClick={handleNext}>
            次の問題へ
          </button>
        )}
      </div>

      <button style={styles.backButton} onClick={() => navigate('/home')}>
        ホームに戻る
      </button>
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
  questionBox: {
    border: '1px solid #ccc',
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  choiceLabel: {
    display: 'block',
    marginTop: 8,
    fontSize: 16,
    cursor: 'pointer',
  },
  button: {
    marginTop: 20,
    padding: '10px 20px',
    fontSize: 16,
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    fontSize: 16,
    borderRadius: 6,
    cursor: 'pointer',
  },
};
