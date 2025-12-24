import React, { useState } from "react";

const Chat: React.FC = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ id: string; text: string; sender: string }>
  >([]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // TODO: Implement encryption and sending
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      sender: "me",
    };
    setMessages([...messages, newMessage]);
    setMessage("");
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>🔒 Secure Chat</h3>
        <span className="status">Encrypted</span>
      </div>

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat;
