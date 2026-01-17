import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Simple mock data for UI showcase
const mockContacts = [
  { username: "alice", isOnline: true, lastSeen: "Online" },
  { username: "bob", isOnline: false, lastSeen: "2 hours ago" },
  { username: "charlie", isOnline: true, lastSeen: "Online" },
];

const mockMessages = {
  alice: [
    {
      id: 1,
      content: "Hey! How are you doing?",
      sender: "alice",
      timestamp: "10:30 AM",
      isOwn: false,
    },
    {
      id: 2,
      content: "I'm doing great! Thanks for asking 😊",
      sender: "demo",
      timestamp: "10:32 AM",
      isOwn: true,
    },
    {
      id: 3,
      content: "That's awesome! Want to grab coffee later?",
      sender: "alice",
      timestamp: "10:35 AM",
      isOwn: false,
    },
    {
      id: 4,
      content: "Sure! Let's meet at 3 PM",
      sender: "demo",
      timestamp: "10:36 AM",
      isOwn: true,
    },
  ],
  bob: [
    {
      id: 1,
      content: "Welcome to VoidLink! 🎉",
      sender: "bob",
      timestamp: "Yesterday",
      isOwn: false,
    },
    {
      id: 2,
      content: "Thanks! This looks amazing",
      sender: "demo",
      timestamp: "Yesterday",
      isOwn: true,
    },
    {
      id: 3,
      content: "The encryption is top-notch 🔒",
      sender: "bob",
      timestamp: "Yesterday",
      isOwn: false,
    },
  ],
  charlie: [
    {
      id: 1,
      content: "Hi there! 👋",
      sender: "charlie",
      timestamp: "Just now",
      isOwn: false,
    },
  ],
};

export const MockChat: React.FC = () => {
  const navigate = useNavigate();
  const [activeContact, setActiveContact] = useState("alice");
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState(mockMessages);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const newMsg = {
      id: Date.now(),
      content: newMessage,
      sender: "demo",
      timestamp: "Just now",
      isOwn: true,
    };

    setMessages((prev) => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), newMsg],
    }));
    setNewMessage("");
  };

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="logo.png" alt="VoidLink" className="h-5 w-auto" />
            <h1 className="text-xl font-bold text-white">VoidLink</h1>
            <div className="flex items-center gap-2 text-xs bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white/80">Demo Mode</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-white/80 text-sm">
              Welcome, <span className="font-semibold text-white">demo</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/15 text-white rounded-lg border border-white/20 transition-all duration-150"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Contacts Sidebar */}
        <div className="w-80 bg-black/20 backdrop-blur-sm border-r border-white/10">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contacts</h2>
            <div className="space-y-2">
              {mockContacts.map((contact) => (
                <button
                  key={contact.username}
                  onClick={() => setActiveContact(contact.username)}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-150 ${
                    activeContact === contact.username
                      ? "bg-white/20 border border-white/30"
                      : "bg-white/5 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {contact.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                          contact.isOnline ? "bg-green-400" : "bg-gray-400"
                        }`}
                      ></div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {contact.username}
                      </div>
                      <div className="text-xs text-white/60">
                        {contact.lastSeen}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-6 bg-black/10 backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {activeContact[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-white">{activeContact}</h3>
                <p className="text-xs text-white/60">
                  {mockContacts.find((c) => c.username === activeContact)
                    ?.isOnline
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {(messages[activeContact] || []).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    message.isOwn
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-white/10 backdrop-blur-sm text-white border border-white/20"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${message.isOwn ? "text-white/80" : "text-white/60"}`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-6 bg-black/10 backdrop-blur-sm border-t border-white/10">
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30"
              />
              <button
                onClick={handleSendMessage}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
