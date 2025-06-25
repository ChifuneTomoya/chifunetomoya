import React, { useState } from "react"; // ReactとuseStateフックをインポート
import { useNavigate } from "react-router-dom"; // ページ遷移のためのuseNavigateをインポート

export default function Aiquiz({ auth }) { // Aiquizコンポーネントの定義（authは親コンポーネントから受け取る認証情報）
  const navigate = useNavigate(); // ページ遷移のための関数を定義

  // 状態変数の定義
  const [quiz, setQuiz] = useState(null); // クイズの内容
  const [loading, setLoading] = useState(false); // 読み込み中かどうか
  const [selected, setSelected] = useState(null); // 選択された選択肢
  const [showExplanation, setShowExplanation] = useState(false); // 解説表示フラグ
  const [error, setError] = useState(""); // エラーメッセージ
  const [category, setCategory] = useState("国語"); // 教科カテゴリー
  const [question, setQuestion] = useState(""); // 質問テーマ

  // クイズ取得処理
  const fetchQuiz = async () => {
    if (!auth?.idToken) { // ログインしていなければ
      setError("ログインが必要です");
      return;
    }

    setLoading(true); // 読み込み中に設定
    setError(""); // エラー初期化
    try {
      // APIへPOSTリクエスト
      const res = await fetch("http://localhost:8000/generate_quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.idToken}`, // JWTトークンを付加
        },
        body: JSON.stringify({ category, question }), // リクエストボディ
      });

      const text = await res.text(); // レスポンステキストを取得

      if (!res.ok) { // エラー時
        let err;
        try {
          const json = JSON.parse(text); // JSONとして解釈できるか確認
          err = json.detail || "問題の取得に失敗しました"; // 詳細メッセージがあれば表示
        } catch {
          err = `エラー内容: ${text}`; // そうでなければ生テキストを表示
        }
        setError(err);
        return;
      }

      const data = JSON.parse(text); // 成功時はJSONパース
      setQuiz(data.quiz); // クイズ内容をセット
      setSelected(null); // 選択肢初期化
      setShowExplanation(false); // 解説非表示に
    } catch (err) {
      setError("通信に失敗しました"); // 通信エラー時
    } finally {
      setLoading(false); // ローディング解除
    }
  };

  // 選択肢を選んだときの処理
  const checkAnswer = (choice) => {
    setSelected(choice); // 選択肢を記録
    setShowExplanation(true); // 解説表示
  };

  const getCorrectChoiceText = () => {
  if (!quiz || !quiz.選択肢) return "";
  const correct = quiz.選択肢.find(choice => choice.startsWith(quiz.正解));
  return correct ? correct.slice(2) : "";
};


  return (
    <div style={styles.container}> {/* 全体コンテナ */}
      <h2 style={styles.heading}>AI生成クイズ</h2>

      {/* カテゴリ選択 */}
      <div style={styles.inputGroup}>
        <label>カテゴリ：</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={styles.input}
        >
          <option>国語</option>
          <option>数学</option>
          <option>英語</option>
          <option>理科</option>
          <option>社会</option>
        </select>
      </div>

      {/* テーマ入力 */}
      <div style={styles.inputGroup}>
        <label>質問のテーマ：</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={styles.textarea}
        />
      </div>

      {/* クイズ生成ボタン */}
      <button onClick={fetchQuiz} disabled={loading} style={styles.generateButton}>
        {loading ? "問題を生成中..." : "AIでクイズを生成"}
      </button>

      {/* エラー表示 */}
      {error && <p style={styles.error}>{error}</p>}

      {/* クイズ表示 */}
      {quiz && (
        <div style={styles.quizBox}>
          <h3>{quiz.問題文}</h3>
          <ul style={styles.choiceList}>
            {quiz.選択肢.map((choice) => {
              const choiceLabel = choice.slice(0, 1); // 先頭文字（A〜D）
              const isCorrect = choiceLabel === quiz.正解; // 正誤判定
              const isSelected = selected === choice; // 選択済みか

              // スタイル初期化
              let backgroundColor = "#ffffff";
              let borderColor = "#ccc";
              let color = "#000";
              let icon = "";

              if (selected !== null) {
                if (isSelected) {
                  if (isCorrect) {
                    backgroundColor = "#d4edda";
                    borderColor = "#28a745";
                    color = "#155724";
                    icon = "✅ ";
                  } else {
                    backgroundColor = "#f8d7da";
                    borderColor = "#dc3545";
                    color = "#721c24";
                    icon = "❌ ";
                  }
                } else {
                  if (isCorrect) {
                    backgroundColor = "#e2f0d9";
                    borderColor = "#28a745";
                    color = "#155724";
                    icon = "✅ ";
                  } else {
                    backgroundColor = "#f0f0f0";
                    color = "#999";
                  }
                }
              }

              return (
                <li key={choice} style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => checkAnswer(choice)}
                    disabled={selected !== null}
                    style={{
                      ...styles.choiceButton,
                      backgroundColor,
                      borderColor,
                      color,
                    }}
                  >
                    {icon}{choice}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 解説表示 */}
          {showExplanation && (
            <div style={styles.explanationBox}>
              <strong>正解：</strong> {quiz.正解}：{getCorrectChoiceText()}<br />
              <strong>解説：</strong> {quiz.解説}
            </div>
          )}
        </div>
      )}

      {/* ホームに戻るボタン */}
      <button onClick={() => navigate("/home")} style={styles.homeButton}>
        ホームに戻る
      </button>
    </div>
  );
}
const styles = {
  container: {
    maxWidth: 600,
    margin: "40px auto",
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    fontFamily: "sans-serif",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
  },
  heading: {
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  inputGroup: {
    marginBottom: 15,
  },
  input: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    borderRadius: 6,
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    height: 80,
    padding: 10,
    fontSize: 16,
    borderRadius: 6,
    border: "1px solid #ccc",
    resize: "vertical",
  },
  generateButton: {
    padding: "10px 20px",
    fontSize: 16,
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    width: "100%",
    marginTop: 10,
  },
  error: {
    color: "red",
    marginTop: 10,
  },
  quizBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    border: "1px solid #ddd",
  },
  choiceList: {
    listStyle: "none",
    padding: 0,
  },
  choiceButton: {
    width: "100%",
    padding: "10px 16px",
    fontSize: 16,
    border: "1px solid #ccc",
    borderRadius: 6,
    cursor: "pointer",
    textAlign: "left",
    backgroundColor: "#fff",
    transition: "background-color 0.2s",
  },
  explanationBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    border: "1px solid #ddd",
    color: "#333",
  },
  homeButton: {
    marginTop: 30,
    padding: "10px 20px",
    backgroundColor: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    width: "100%",
  },
}