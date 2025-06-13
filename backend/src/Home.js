import React, { useState } from 'react';

export default function Home() {
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');

  const handleClick = () => {
    setResponse(`こんにちは ${name} さん、内容を確認しました！`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <input
          type="text"
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleClick} style={styles.button}>ボタン</button>
      </div>

      <textarea
        placeholder="相談内容"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        style={styles.textarea}
      />

      <div style={styles.responseBox}>
        <p>{response || '返答内容'}</p>
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
    borderRadius: '50px',
    fontFamily: 'sans-serif',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '10px',
    fontSize: '16px',
    borderRadius: '15px',
    border: '2px solid black',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid black',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    height: '80px',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '20px',
    border: '2px solid black',
    marginBottom: 20,
  },
  responseBox: {
    width: '100%',
    minHeight: '100px',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '30px',
    border: '2px solid black',
    backgroundColor: '#f9f9f9',
  },
};
