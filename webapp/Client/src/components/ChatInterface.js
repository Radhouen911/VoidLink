import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, Shield, AlertTriangle, Users, Plus } from 'lucide-react';
import CryptoService from '../services/crypto';
import StorageService from '../services/storage';
import ApiService from '../services/api';
import StarField from './StarField';
import './ChatInterface.css';

const TypingIndicator = () => (
  <div className="typing-indicator">
    <div className="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <span className="typing-text">Encrypting message...</span>
  </div>
);

const ChatInterface = ({ userProfile }) => {
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [showAddContact, setShowAddContact] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    loadContacts();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (activeContact) {
      loadMessages(activeContact.id);
    }
  }, [activeContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadContacts = () => {
    const storedContacts = StorageService.getContacts();
    setContacts(storedContacts);
    
    if (storedContacts.length > 0 && !activeContact) {
      setActiveContact(storedContacts[0]);
    }
  };

  const loadMessages = (contactId) => {
    const storedMessages = StorageService.getMessages(contactId);
    setMessages(storedMessages);
  };

  const connectWebSocket = () => {
    try {
      setConnectionStatus('connecting');
      
      wsRef.current = ApiService.connectWebSocket(
        userProfile.id,
        handleIncomingMessage,
        handleStatusChange
      );

      wsRef.current.onopen = () => {
        setConnectionStatus('online');
      };

      wsRef.current.onclose = () => {
        setConnectionStatus('offline');
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setConnectionStatus('offline');
    }
  };

  const handleIncomingMessage = async (encryptedMessage) => {
    try {
      // Find the sender in contacts
      const sender = contacts.find(c => c.id === encryptedMessage.senderId);
      if (!sender) {
        console.warn('Received message from unknown sender');
        return;
      }

      // Decrypt the message
      const decryptedText = CryptoService.decryptMessage(
        encryptedMessage,
        sender.publicKey
      );

      const message = {
        id: encryptedMessage.id,
        text: decryptedText,
        senderId: encryptedMessage.senderId,
        timestamp: encryptedMessage.timestamp,
        type: 'received'
      };

      // Update messages if this is the active contact
      if (activeContact && activeContact.id === encryptedMessage.senderId) {
        setMessages(prev => [...prev, message]);
      }

      // Store message
      const contactMessages = StorageService.getMessages(encryptedMessage.senderId);
      contactMessages.push(message);
      StorageService.storeMessages(encryptedMessage.senderId, contactMessages);

    } catch (error) {
      console.error('Failed to decrypt incoming message:', error);
    }
  };

  const handleStatusChange = (statusUpdate) => {
    setContacts(prev => prev.map(contact => 
      contact.id === statusUpdate.userId
        ? { ...contact, status: statusUpdate.status }
        : contact
    ));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeContact || loading) return;

    setLoading(true);
    setIsTyping(true);
    
    try {
      // Simulate encryption delay for animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Encrypt message for recipient
      const encryptedMessage = CryptoService.encryptMessage(
        newMessage,
        activeContact.publicKey
      );

      // Send to server
      await ApiService.sendMessage(
        encryptedMessage,
        activeContact.id,
        userProfile.id
      );

      // Add to local messages
      const message = {
        id: Date.now().toString(),
        text: newMessage,
        senderId: userProfile.id,
        timestamp: Date.now(),
        type: 'sent'
      };

      setMessages(prev => [...prev, message]);
      
      // Store message
      const contactMessages = StorageService.getMessages(activeContact.id);
      contactMessages.push(message);
      StorageService.storeMessages(activeContact.id, contactMessages);

      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show error to user
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addContact = async (contactData) => {
    try {
      // Validate public key format
      if (!contactData.publicKey || contactData.publicKey.length !== 64) {
        throw new Error('Invalid public key format');
      }

      const newContact = {
        id: contactData.id || Date.now().toString(),
        username: contactData.username,
        publicKey: contactData.publicKey,
        status: 'offline',
        addedAt: new Date().toISOString()
      };

      const updatedContacts = [...contacts, newContact];
      setContacts(updatedContacts);
      StorageService.storeContacts(updatedContacts);
      setShowAddContact(false);
      
      if (!activeContact) {
        setActiveContact(newContact);
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <div className="status-indicator status-online" />;
      case 'connecting':
        return <div className="status-indicator status-connecting" />;
      default:
        return <div className="status-indicator status-offline" />;
    }
  };

  const renderContactList = () => (
    <div className="contact-list">
      <div className="contact-header">
        <h3>Contacts</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddContact(true)}
        >
          <Plus size={16} />
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="empty-contacts">
          <Users size={48} />
          <p>No contacts yet</p>
          <button
            className="btn btn-secondary"
            onClick={() => setShowAddContact(true)}
          >
            Add Contact
          </button>
        </div>
      ) : (
        <div className="contacts">
          {contacts.map(contact => (
            <div
              key={contact.id}
              className={`contact-item ${activeContact?.id === contact.id ? 'active' : ''}`}
              onClick={() => setActiveContact(contact)}
            >
              <div className="contact-avatar">
                {contact.username.charAt(0).toUpperCase()}
              </div>
              <div className="contact-info">
                <div className="contact-name">{contact.username}</div>
                <div className="contact-status">
                  {getStatusIcon(contact.status)}
                  <span>{contact.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMessages = () => (
    <div className="messages-container">
      {messages.length === 0 ? (
        <div className="empty-messages">
          <Lock size={48} />
          <h4>Secure conversation</h4>
          <p>Messages are end-to-end encrypted and never stored on the server.</p>
        </div>
      ) : (
        <div className="messages">
          {messages.map(message => (
            <div
              key={message.id}
              className={`message-bubble ${message.type === 'sent' ? 'message-sent' : 'message-received'}`}
            >
              <div className="message-text">{message.text}</div>
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );

  const renderChatHeader = () => (
    <div className="chat-header">
      {activeContact ? (
        <>
          <div className="chat-contact-info">
            <div className="contact-avatar">
              {activeContact.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="contact-name">{activeContact.username}</div>
              <div className="contact-status">
                {getStatusIcon(activeContact.status)}
                <span>{activeContact.status}</span>
              </div>
            </div>
          </div>
          <div className="security-indicators">
            <div className="security-badge">
              <Shield size={16} />
              <span>E2E Encrypted</span>
            </div>
            {connectionStatus !== 'online' && (
              <div className="security-badge warning">
                <AlertTriangle size={16} />
                <span>Offline</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="no-contact-selected">
          <h4>Select a contact to start messaging</h4>
        </div>
      )}
    </div>
  );

  const renderMessageInput = () => (
    <div className="message-input-container">
      <div className="message-input">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your encrypted message..."
          disabled={!activeContact || loading}
          rows={1}
        />
        <button
          className="btn btn-primary send-button"
          onClick={sendMessage}
          disabled={!newMessage.trim() || !activeContact || loading}
        >
          <Send size={20} />
        </button>
      </div>
      <div className="encryption-notice">
        <Lock size={12} />
        <span>Messages are encrypted end-to-end</span>
      </div>
    </div>
  );

  return (
    <div className="chat-interface">
      <StarField />
      {renderContactList()}
      
      <div className="chat-area">
        {renderChatHeader()}
        {renderMessages()}
        {renderMessageInput()}
      </div>

      {showAddContact && (
        <AddContactModal
          onAdd={addContact}
          onClose={() => setShowAddContact(false)}
        />
      )}
    </div>
  );
};

// Add Contact Modal Component
const AddContactModal = ({ onAdd, onClose }) => {
  const [username, setUsername] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !publicKey.trim()) return;

    setLoading(true);
    try {
      await onAdd({
        username: username.trim(),
        publicKey: publicKey.trim()
      });
    } catch (error) {
      console.error('Failed to add contact:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add Contact</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-content">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Public Key</label>
            <textarea
              className="input"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="Paste their public key here"
              rows={3}
              required
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;