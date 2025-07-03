// Reactの基本機能とフックを読み込む
import React, { useState, useEffect, useRef } from 'react';
// CSSスタイルを読み込む
import './ChatBot.css';

// ChatBotコンポーネントを定義（関数コンポーネント）
const ChatBot = () => {
  // 各種状態（state）を定義
  const [messages, setMessages] = useState([]); // メッセージ一覧
  const [input, setInput] = useState(''); // 入力欄の内容
  const [isSending, setIsSending] = useState(false); // 送信中かどうか
  const [menuOpen, setMenuOpen] = useState(false); // メニューボタンの開閉状態
  const [showNewMessageButton, setShowNewMessageButton] = useState(false); // 新しいメッセージボタン表示
  const [isAtBottom, setIsAtBottom] = useState(true); // チャット欄が一番下にスクロールされているか
  const [replyTo, setReplyTo] = useState(null); // 返信対象のメッセージ
  const [searchQuery, setSearchQuery] = useState(''); // 検索キーワード
  const [searchSender, setSearchSender] = useState('all'); // 検索対象の送信者（user/bot/all）
  const [searchInputFocused, setSearchInputFocused] = useState(false); // 検索欄にフォーカスしているかどうか

  // DOMの要素に直接アクセスするための参照
  const chatBoxRef = useRef(null); // チャットボックスのDOM参照
  const textareaRef = useRef(null); // テキストエリアのDOM参照

  // 入力欄の高さを自動調整する処理
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // 一度高さをリセット
      const scrollHeight = Math.min(textareaRef.current.scrollHeight, 120); // 最大120pxまで自動調整
      textareaRef.current.style.height = `${scrollHeight}px`; // 高さを反映
    }
  }, [input]); // 入力が変化するたびに実行

  // スクロールイベント時の処理
  const onScroll = () => {
    if (!chatBoxRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatBoxRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 20; // ほぼ一番下かを判定
    setIsAtBottom(atBottom);
    if (atBottom) setShowNewMessageButton(false); // 一番下ならボタン非表示
  };

  // メッセージが増えたときに自動スクロールする処理
  useEffect(() => {
    if (isAtBottom && chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; // 一番下までスクロール
      setShowNewMessageButton(false);
    } else {
      if (messages.length > 0) setShowNewMessageButton(true); // 新しいメッセージボタンを表示
    }
  }, [messages, isAtBottom]);

  // 現在の日時から曜日と時間を整形して返す関数
  const formatDateTime = (date) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dayName = days[date.getDay()];
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${dayName} ${hh}:${mm}`;
  };

  // メッセージ送信時の処理
  const handleSend = () => {
    const trimmed = input.trim(); // 入力から前後の空白を除く
    if (!trimmed || isSending) return; // 空 or 送信中なら無視

    setIsSending(true); // 送信中状態にする
    const now = new Date();
    const timeStr = formatDateTime(now); // 日時を整形

    let sendText = trimmed;
    if (replyTo) {
      const prefix =
        replyTo.type === 'text'
          ? `＞${replyTo.text}\n`
          : `＞ファイル: ${replyTo.fileName}\n`;
      sendText = prefix + trimmed; // 返信内容を追加
      setReplyTo(null); // 返信対象クリア
    }

    // 自分のメッセージを追加
    setMessages((prev) => [
      ...prev,
      { sender: 'user', type: 'text', text: sendText, time: timeStr },
    ]);
    setInput(''); // 入力欄クリア
    setMenuOpen(false); // メニューを閉じる

    // Botの返信（0.7秒後に擬似返信）
    setTimeout(() => {
      const botNow = new Date();
      const botTimeStr = formatDateTime(botNow);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          type: 'text',
          text: `Botの回答: ${sendText}`,
          time: botTimeStr,
        },
      ]);
      setIsSending(false); // 送信完了
    }, 700);
  };

  // Enterキーで送信、Shift+Enterで改行
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ファイルを選択したときの処理
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader(); // ファイル読み込み用
    reader.onload = () => {
      const fileUrl = reader.result; // base64エンコードされたファイル
      const now = formatDateTime(new Date());

      // ファイルメッセージを追加
      setMessages((prev) => [
        ...prev,
        {
          sender: 'user',
          type: 'file',
          fileName: file.name,
          fileUrl,
          time: now,
        },
      ]);
    };
    reader.readAsDataURL(file); // ファイルをbase64として読み込む
    setMenuOpen(false);
  };

  // テキストをクリップボードにコピー
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('コピーしました');
    } catch {
      alert('コピーに失敗しました');
    }
  };

  // テキストを共有する（新しいタブでシェアURLを開く）
  const handleShare = (text) => {
    const url = `https://example.com/share?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // 右クリックで返信対象を設定
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setReplyTo(msg);
  };

  // 「新しいメッセージ」ボタンを押したら一番下にスクロール
  const handleClickNewMessageButton = () => {
    if (!chatBoxRef.current) return;
    chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    setShowNewMessageButton(false);
    setIsAtBottom(true);
  };

  // 検索条件にマッチしたメッセージだけを抽出
  const filteredMessages = messages.filter((msg) => {
    const content =
      msg.type === 'text'
        ? msg.text || ''
        : msg.type === 'file'
        ? msg.fileName || ''
        : '';
    const matchesQuery = content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSender = searchSender === 'all' || msg.sender === searchSender;
    return matchesQuery && matchesSender;
  });

  return (
    <div className="chat-container">
      {/* 🔍 検索バー */}
      <div className="search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="キーワードで検索"
          onFocus={() => setSearchInputFocused(true)}
          onBlur={() => setSearchInputFocused(false)}
        />
        <select
          value={searchSender}
          onChange={(e) => setSearchSender(e.target.value)}
        >
          <option value="all">すべて</option>
          <option value="user">ユーザー</option>
          <option value="bot">ボット</option>
        </select>
      </div>

      {/* 💬 チャットエリア */}
      <div className="chat-box" ref={chatBoxRef} onScroll={onScroll} tabIndex={0}>
        {/* 検索中で該当メッセージなし */}
        {searchInputFocused && searchQuery !== '' && filteredMessages.length === 0 ? (
          <div className="no-results">該当するメッセージがありません</div>
        ) : (
          // フィルタ済みメッセージを表示
          filteredMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.sender}`}
              onContextMenu={(e) => handleContextMenu(e, msg)}
              title="右クリックで返信"
            >
              <div className="bubble">
                {msg.type === 'text' && msg.text}
                {msg.type === 'file' && (
                  <div>
                    📎 ファイル:{' '}
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                      {msg.fileName}
                    </a>
                  </div>
                )}
                <div className="message-actions">
                  <button
                    onClick={() =>
                      handleCopy(msg.type === 'text' ? msg.text : msg.fileName)
                    }
                    title="コピー"
                  >
                    📋
                  </button>
                  <button
                    onClick={() =>
                      handleShare(msg.type === 'text' ? msg.text : msg.fileName)
                    }
                    title="共有"
                  >
                    🔗
                  </button>
                </div>
                <span className="time">{msg.time}</span>
              </div>
            </div>
          ))
        )}

        {/* 送信中のロードアニメーション */}
        {isSending && (
          <div className="message bot typing">
            <div className="bubble dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}

        {/* 新しいメッセージボタン */}
        {showNewMessageButton && (
          <button
            className="new-message-button"
            onClick={handleClickNewMessageButton}
          >
            新しいメッセージ
          </button>
        )}
      </div>

      {/* ✏️ 返信中の表示 */}
      {replyTo && (
        <div className="reply-to">
          返信中:{' '}
          {replyTo.type === 'text' ? replyTo.text : `ファイル: ${replyTo.fileName}`}
          <button onClick={() => setReplyTo(null)}>×</button>
        </div>
      )}

      {/* 💬 入力欄とボタン */}
      <div className="input-area">
        {/* メニューボタン（＋） */}
        <button
          className="plus-button"
          onClick={() => setMenuOpen((prev) => !prev)}
          title="メニューを開く"
        >
          ＋
        </button>

        {/* メッセージ入力欄 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enterで送信、Shift + Enterで改行"
          disabled={isSending}
          rows={1}
        />

        {/* 送信ボタン */}
        <button onClick={handleSend} disabled={!input.trim() || isSending}>
          {isSending ? <div className="spinner"></div> : <span>&#9658;</span>}
        </button>

        {/* ファイル送信用のhidden input */}
        <input
          type="file"
          id="fileInput"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* ＋メニューの中身 */}
        {menuOpen && (
          <div className="plus-menu">
            <label htmlFor="fileInput">📁 ファイル送信</label>
            <div className="dummy-option">📷 画像送信（未実装）</div>
            <div className="dummy-option">📄 テンプレ選択（未実装）</div>
          </div>
        )}
      </div>
    </div>
  );
};

// このコンポーネントを他のファイルから利用できるようにエクスポート
export default ChatBot;