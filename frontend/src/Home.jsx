import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ auth, setAuth }) {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewList, setReviewList] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);

  const navigate = useNavigate();
  const categories = ['問題集', '基本情報', '応用情報', 'その他'];

  const addQuizToHistory = (newQuiz) => {
    setQuizHistory((prev) => {
      const updated = [...prev.slice(0, currentIndex + 1), newQuiz];
      return updated;
    });
    setCurrentIndex((prev) => prev + 1);
    setQuiz(newQuiz);
    setSelectedChoice(null);
    setShowAnswer(false);
  };

  const fetchNewQuiz = async () => {
    if (!category) {
      setError('カテゴリーを選択してください');
      return;
    }
    if (!auth?.idToken) {
      setError('ログインが必要です。');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/generate_quiz', {
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
        addQuizToHistory(data.quiz);
      } else {
        setError(data.detail || 'エラーが発生しました');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStudy = async () => {
    setReviewMode(false);
    setReviewList([]);
    setReviewIndex(0);
    setReviewDone(false);
    await fetchNewQuiz();
  };

  const handleNext = async () => {
    if (reviewMode) {
      if (reviewIndex + 1 < reviewList.length) {
        setReviewIndex((prev) => prev + 1);
        setQuiz(reviewList[reviewIndex + 1]);
        setSelectedChoice(null);
        setShowAnswer(false);
      } else {
        if (!showAnswer) return; // 正解表示前は止める
        setReviewMode(false);
        setReviewDone(true);
        setReviewList([]);
        setReviewIndex(0);
      }
    } else {
      if (currentIndex < quizHistory.length - 1) {
        const nextQuiz = quizHistory[currentIndex + 1];
        setCurrentIndex((prev) => prev + 1);
        setQuiz(nextQuiz);
        setSelectedChoice(null);
        setShowAnswer(false);
      } else {
        await fetchNewQuiz();
      }
    }
  };

  const handlePrev = () => {
    if (!reviewMode && currentIndex > 0) {
      const prevQuiz = quizHistory[currentIndex - 1];
      setCurrentIndex((prev) => prev - 1);
      setQuiz(prevQuiz);
      setSelectedChoice(null);
      setShowAnswer(false);
    }
  };

  const handleChoiceSelect = (choice) => {
    setSelectedChoice(choice);
    setShowAnswer(true);

    const isCorrect = (() => {
      const letterIndex = ['A', 'B', 'C', 'D'].indexOf(quiz.正解);
      const correctChoice = quiz.選択肢[letterIndex];
      return choice === correctChoice;
    })();

    if (!isCorrect && !reviewMode) {
      setReviewList((prev) => [...prev, quiz]);
    }

    if (isCorrect && reviewMode) {
      const updatedList = [...reviewList];
      updatedList.splice(reviewIndex, 1);
      setReviewList(updatedList);

      if (updatedList.length === 0) {
        setReviewDone(true);
      }
    }
  };

  const startReview = () => {
    if (reviewList.length === 0) {
      alert('復習対象の問題がありません。');
      return;
    }
    setReviewMode(true);
    setReviewIndex(0);
    setQuiz(reviewList[0]);
    setSelectedChoice(null);
    setShowAnswer(false);
    setReviewDone(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    if (typeof setAuth === 'function') setAuth(null);
    navigate('/');
  };

  const renderReviewStatus = () => {
    if (reviewMode) {
      return <p style={{ color: '#17a2b8' }}>復習モード：残り {reviewList.length - reviewIndex} 問</p>;
    } else if (reviewDone) {
      return <p style={{ color: 'green' }}>復習終了！通常モードに戻りました</p>;
    }
    return null;
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
          placeholder="例：理科に関する問題出して"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button
        onClick={handleStudy}
        disabled={loading}
        style={{
          ...styles.button,
          backgroundColor: loading ? '#6c757d' : '#007bff',
        }}
      >
        {loading ? '作成中...' : '問題を作成'}
      </button>

      {!reviewMode && reviewList.length > 0 && (
        <button style={styles.reviewButton} onClick={startReview}>
          復習モードへ（{reviewList.length}問）
        </button>
      )}

      {renderReviewStatus()}

      {quiz && (
        <div style={styles.quizBox}>
          <h3>{quiz.問題文}</h3>
          <p><strong>カテゴリ:</strong> {category}</p>

          <ul style={styles.choiceList}>
            {quiz.選択肢.map((choice, index) => {
              const letter = ['A', 'B', 'C', 'D'][index];
              const isCorrect = quiz.正解 === letter;
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
                    {icon && <span style={{ float: 'right', fontWeight: 'bold' }}>{icon}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {showAnswer && (
            <div style={styles.explanationBox}>
              <strong>正解：</strong> {quiz.正解}. {
                quiz.選択肢[['A','B','C','D'].indexOf(quiz.正解)] || '不明'
              }
              <br />
              <strong>解説：</strong> {quiz.解説}
              {quiz.出典ページ && (
                <>
                  <br />
                  <strong>出典ページ：</strong> {quiz["出典ページ"]}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {quiz && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button
            onClick={handlePrev}
            disabled={reviewMode || currentIndex <= 0}
            style={{
              ...styles.button,
              backgroundColor: reviewMode || currentIndex <= 0 ? '#6c757d' : '#007bff',
              width: '48%',
            }}
          >
            前の問題へ
          </button>

          <button
            onClick={handleNext}
            disabled={loading || (reviewMode && !showAnswer)}
            style={{
              ...styles.button,
              backgroundColor: loading || (reviewMode && !showAnswer) ? '#6c757d' : '#28a745',
              width: '48%',
            }}
          >
            {reviewMode
              ? reviewIndex + 1 >= reviewList.length
                ? '復習完了'
                : '次の復習へ'
              : loading
                ? '読み込み中...'
                : '次の問題へ'}
          </button>
        </div>
      )}

      <button style={styles.logoutButton} onClick={handleLogout}>
        ログアウト
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
  },
  reviewButton: {
    marginTop: 10,
    padding: '10px 20px',
    backgroundColor: '#17a2b8',
    color: '#fff',
    fontSize: 16,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
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
    backgroundColor: '#f1f1f1',
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
  logoutButton: {
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    fontSize: 16,
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 30,
    width: '100%',
  },
};