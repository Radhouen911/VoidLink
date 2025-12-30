import React, { useState } from 'react';
import { Shield, Key, Download, Upload } from 'lucide-react';
import CryptoService from '../services/crypto';
import StorageService from '../services/storage';
import ApiService from '../services/api';
import QRCode from 'react-qr-code';
import StarField from './StarField';
import './LoginScreen.css';

const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('welcome'); // 'welcome', 'login', 'register', 'import'
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyPair, setKeyPair] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [step, setStep] = useState(1); // For multi-step flow
  const [isFlipping, setIsFlipping] = useState(false);

  // Smooth mode transition with flip animation
  const changeMode = (newMode) => {
    setIsFlipping(true);
    setTimeout(() => {
      setMode(newMode);
      setError('');
      setTimeout(() => setIsFlipping(false), 50);
    }, 300);
  };

  // Create floating particles effect
  const createParticles = () => {
    const particles = [];
    for (let i = 0; i < 50; i++) { // Increased from 20 to 50
      particles.push(
        <div
          key={i}
          className="galaxy-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${4 + Math.random() * 4}s`
          }}
        />
      );
    }
    return particles;
  };

  const renderWelcomeMode = () => (
    <div className="auth-form welcome-form">
      <div className="auth-header">
        <Shield className="auth-icon" />
        <h2>Welcome to VoidLink</h2>
        <p>Zero-trust messaging with provable privacy</p>
      </div>

      <div className="user-flow-options">
        <div className="flow-question">
          <h3>Are you a new user?</h3>
        </div>

        <div className="flow-buttons">
          <button
            className="btn btn-primary flow-btn"
            onClick={() => changeMode('register')}
          >
            <div className="btn-content">
              <div className="btn-icon">🆕</div>
              <div className="btn-text">
                <strong>Yes, I'm new</strong>
                <span>Create account & generate keys</span>
              </div>
            </div>
          </button>

          <button
            className="btn btn-secondary flow-btn"
            onClick={() => changeMode('login')}
          >
            <div className="btn-content">
              <div className="btn-icon">🔑</div>
              <div className="btn-text">
                <strong>No, I have keys</strong>
                <span>Sign in with existing account</span>
              </div>
            </div>
          </button>
        </div>

        <div className="flow-divider">
          <span>or</span>
        </div>

        <button
          className="btn btn-outline flow-btn-small"
          onClick={() => changeMode('import')}
        >
          <Upload size={16} />
          Restore from backup
        </button>
      </div>
    </div>
  );

  const handleRegister = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Initialize crypto service if not already done
      if (!CryptoService.isReady) {
        await CryptoService.initialize();
      }

      // Generate new key pair
      const newKeyPair = CryptoService.generateKeyPair();
      setKeyPair(newKeyPair);
      setStep(2); // Move to backup download step

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    setLoading(true);
    try {
      // Register with server
      const response = await ApiService.registerUser(keyPair.publicKey, username);

      // Store locally
      StorageService.storeKeyPair(keyPair);
      StorageService.storeUserProfile({
        id: response.userId,
        username,
        publicKey: keyPair.publicKey,
        createdAt: new Date().toISOString()
      });

      onLogin({
        id: response.userId,
        username,
        publicKey: keyPair.publicKey
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Initialize crypto service if not already done
      if (!CryptoService.isReady) {
        await CryptoService.initialize();
      }

      // Check if we have stored credentials
      const storedProfile = StorageService.getUserProfile();
      const storedKeyPair = StorageService.getKeyPair();

      if (!storedProfile || !storedKeyPair) {
        setError('No stored credentials found. Please register or import keys.');
        setMode('register');
        return;
      }

      // Load key pair into crypto service
      CryptoService.loadKeyPair(storedKeyPair.publicKey, storedKeyPair.privateKey);

      // Get authentication challenge
      const challenge = await ApiService.getChallenge(storedKeyPair.publicKey);
      
      // Sign challenge
      const signature = CryptoService.signMessage(challenge);
      
      // Authenticate
      await ApiService.authenticateUser(storedKeyPair.publicKey, signature, challenge);

      onLogin(storedProfile);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportKeys = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Initialize crypto service if not already done
        if (!CryptoService.isReady) {
          await CryptoService.initialize();
        }

        const importedData = JSON.parse(e.target.result);
        
        if (importedData.publicKey && importedData.privateKey) {
          // Import key pair
          StorageService.storeKeyPair(importedData);
          CryptoService.loadKeyPair(importedData.publicKey, importedData.privateKey);
          
          if (importedData.profile) {
            StorageService.storeUserProfile(importedData.profile);
            onLogin(importedData.profile);
          } else {
            setMode('register');
            setError('Keys imported. Please set a username to complete setup.');
          }
        } else {
          setError('Invalid key file format');
        }
      } catch (error) {
        setError('Failed to import keys: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const exportKeys = () => {
    if (!keyPair) return;

    const exportData = {
      ...keyPair,
      profile: {
        username,
        publicKey: keyPair.publicKey,
        createdAt: new Date().toISOString()
      },
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voidlink-keys-${username || 'backup'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRegisterMode = () => (
    <div className="auth-form">
      <div className="auth-header">
        <Shield className="auth-icon" />
        <h2>Create VoidLink Account</h2>
        <p>Generate your cryptographic identity</p>
      </div>

      {step === 1 ? (
        <>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>

          <button
            className="btn btn-primary auth-button"
            onClick={handleRegister}
            disabled={loading || !username.trim()}
          >
            {loading ? 'Generating Keys...' : 'Create Account'}
          </button>
        </>
      ) : (
        <div className="backup-step">
          <h3>🔐 Download Encrypted Backup</h3>
          <p>
            Your cryptographic keys have been generated. Download an encrypted backup 
            to restore your account if you lose access to this device.
          </p>

          <div className="backup-warning">
            <h4>⚠️ Important</h4>
            <p>
              Without this backup, you cannot recover your account or decrypt your messages 
              if you lose access to this device. Keep it safe!
            </p>
          </div>

          {keyPair && (
            <div className="key-preview">
              <h4>Your Public Key</h4>
              <div className="key-display">
                {keyPair.publicKey.substring(0, 32)}...
              </div>
              
              <div className="backup-actions">
                <button
                  className="btn btn-primary"
                  onClick={exportKeys}
                >
                  <Download size={16} />
                  Download Backup
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowQR(!showQR)}
                >
                  {showQR ? 'Hide QR' : 'Show QR Code'}
                </button>
              </div>

              {showQR && (
                <div className="qr-container">
                  <QRCode
                    value={JSON.stringify({
                      type: 'voidlink_key',
                      publicKey: keyPair.publicKey,
                      username: username,
                      version: '1.0'
                    })}
                    size={200}
                  />
                </div>
              )}
            </div>
          )}

          <div className="backup-actions">
            <button
              className="btn btn-primary auth-button"
              onClick={completeRegistration}
              disabled={loading}
            >
              {loading ? 'Completing Setup...' : 'Continue to Login'}
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={() => setStep(1)}
            >
              Back
            </button>
          </div>
        </div>
      )}

      <div className="auth-switch">
        Already have keys?{' '}
        <button onClick={() => changeMode('login')}>Sign In</button>
      </div>
    </div>
  );

  const renderLoginMode = () => (
    <div className="auth-form">
      <div className="auth-header">
        <Shield className="auth-icon" />
        <h2>Welcome Back</h2>
        <p>Sign in with your cryptographic identity</p>
      </div>

      <button
        className="btn btn-primary auth-button"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>

      <div className="auth-options">
        <button
          className="btn btn-secondary"
          onClick={() => setMode('import')}
        >
          <Upload size={16} />
          Import Keys
        </button>
      </div>

      <div className="auth-switch">
        New to VoidLink?{' '}
        <button onClick={() => changeMode('welcome')}>Create Account</button>
      </div>
    </div>
  );

  const renderImportMode = () => (
    <div className="auth-form">
      <div className="auth-header">
        <Key className="auth-icon" />
        <h2>Import Keys</h2>
        <p>Restore your VoidLink identity</p>
      </div>

      <div className="import-area">
        <input
          type="file"
          accept=".json"
          onChange={handleImportKeys}
          style={{ display: 'none' }}
          id="key-import"
        />
        <label htmlFor="key-import" className="import-button">
          <Upload size={24} />
          <span>Select Key File</span>
        </label>
      </div>

      <div className="auth-switch">
        <button onClick={() => changeMode('welcome')}>Back to Welcome</button>
      </div>
    </div>
  );

  return (
    <div className="login-screen">
      <StarField />
      {createParticles()}
      <div className="login-container">
        <div className="welcome-tagline">
          <h1 className="tagline-text space-text">Where privacy isn't a promise, it's provable</h1>
        </div>
        
        <div className="security-notice">
          <Shield size={20} />
          <span>Zero-trust • End-to-end encrypted • Passwordless</span>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className={`form-container ${isFlipping ? 'flipping' : ''}`}>
          {mode === 'welcome' && renderWelcomeMode()}
          {mode === 'register' && renderRegisterMode()}
          {mode === 'login' && renderLoginMode()}
          {mode === 'import' && renderImportMode()}
        </div>

        <div className="security-info">
          <h4>Security Features</h4>
          <ul>
            <li>🔐 Client-side encryption only</li>
            <li>🚫 Server never sees your messages</li>
            <li>🔑 Passwordless authentication</li>
            <li>⚡ Forward secrecy</li>
            <li>🛡️ Zero-trust architecture</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;