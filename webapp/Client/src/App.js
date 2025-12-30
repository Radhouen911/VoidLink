import React, { useState, useEffect } from 'react';
import { Shield, MessageCircle, Key, Users } from 'lucide-react';
import CryptoService from './services/crypto';
import StorageService from './services/storage';
import LoginScreen from './components/LoginScreen';
import ChatInterface from './components/ChatInterface';
import KeyManagement from './components/KeyManagement';
import ContactManager from './components/ContactManager';
import StarField from './components/StarField';
import FirstTimeSetup from './components/FirstTimeSetup';
import IntroAnimation from './components/IntroAnimation';
import './App.css';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('chat');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize crypto service
      await CryptoService.initialize();
      setIsInitialized(true);

      // Check if user is already logged in
      const profile = StorageService.getUserProfile();
      const keyPair = StorageService.getKeyPair();

      if (profile && keyPair) {
        CryptoService.loadKeyPair(keyPair.publicKey, keyPair.privateKey);
        setUserProfile(profile);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleLogin = (profile) => {
    setUserProfile(profile);
    setIsLoggedIn(true);
    
    // Check if this is a first-time user (no contacts)
    const contacts = StorageService.getContacts();
    if (contacts.length === 0) {
      setShowFirstTimeSetup(true);
    } else {
      setCurrentView('chat');
    }
  };

  const handleLogout = () => {
    StorageService.clearAll();
    setUserProfile(null);
    setIsLoggedIn(false);
    setCurrentView('chat');
    setShowFirstTimeSetup(false);
  };

  const handleFirstTimeSetupComplete = () => {
    setShowFirstTimeSetup(false);
    setCurrentView('chat');
  };

  const renderNavigation = () => (
    <nav className="navigation">
      <div className="nav-brand">
        <Shield className="nav-icon" />
        <span className="nav-title">VoidLink</span>
      </div>
      
      <div className="nav-menu">
        <button
          className={`nav-item ${currentView === 'chat' ? 'active' : ''}`}
          onClick={() => setCurrentView('chat')}
        >
          <MessageCircle size={20} />
          <span>Messages</span>
        </button>
        
        <button
          className={`nav-item ${currentView === 'contacts' ? 'active' : ''}`}
          onClick={() => setCurrentView('contacts')}
        >
          <Users size={20} />
          <span>Contacts</span>
        </button>
        
        <button
          className={`nav-item ${currentView === 'keys' ? 'active' : ''}`}
          onClick={() => setCurrentView('keys')}
        >
          <Key size={20} />
          <span>Keys</span>
        </button>
      </div>

      <div className="nav-user">
        <div className="user-info">
          <span className="username">{userProfile?.username}</span>
          <span className="user-status">Online</span>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );

  const renderContent = () => {
    if (showFirstTimeSetup) {
      return <FirstTimeSetup userProfile={userProfile} onComplete={handleFirstTimeSetupComplete} />;
    }
    
    switch (currentView) {
      case 'chat':
        return <ChatInterface userProfile={userProfile} />;
      case 'contacts':
        return <ContactManager userProfile={userProfile} />;
      case 'keys':
        return <KeyManagement userProfile={userProfile} />;
      default:
        return <ChatInterface userProfile={userProfile} />;
    }
  };

  if (showIntro) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <Shield className="loading-icon" />
        <h2>Initializing VoidLink</h2>
        <p>Setting up zero-trust encryption...</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="error-screen">
        <h2>Initialization Failed</h2>
        <p>Unable to initialize cryptographic services.</p>
        <button className="btn btn-primary" onClick={initializeApp}>
          Retry
        </button>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <StarField />
      <div className="cosmic-dust"></div>
      {renderNavigation()}
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;