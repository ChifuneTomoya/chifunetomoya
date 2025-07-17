import React, { useState, useRef } from 'react';

const VoiceInput = () => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const handleMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('このブラウザは音声認識に対応していません（Chromeを使ってください）');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setText(transcript);
      };

      recognition.onerror = (event) => {
        alert(`音声認識エラー: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }

    setIsListening((prev) => !prev);
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h2>音声入力</h2>
      <input
        type="text"
        value={text}
        placeholder="ここに音声が表示されます"
        readOnly
        style={{ width: '80%', padding: '0.5rem', fontSize: '1rem' }}
      />
      <br /><br />
      <button onClick={handleMicClick} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
        {isListening ? '話してください' : 'マイクをON'}
      </button>
    </div>
  );
};

export default VoiceInput;