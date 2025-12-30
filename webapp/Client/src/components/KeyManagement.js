import React, { useState, useEffect } from 'react';
import { Key, Download, Upload, Copy, Eye, EyeOff, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import QRCode from 'react-qr-code';
import CryptoService from '../services/crypto';
import StorageService from '../services/storage';
import StarField from './StarField';
import './KeyManagement.css';

const KeyManagement = ({ userProfile }) => {
  const [keyPair, setKeyPair] = useState(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [sessionKeys, setSessionKeys] = useState([]);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadKeyData();
    loadSessionKeys();
  }, []);

  const loadKeyData = () => {
    const storedKeyPair = StorageService.getKeyPair();
    setKeyPair(storedKeyPair);
  };

  const loadSessionKeys = () => {
    // Get session keys from crypto service
    const sessions = Array.from(CryptoService.sessionKeys.entries()).map(([id, data]) => ({
      id,
      timestamp: data.timestamp,
      age: Date.now() - data.timestamp
    }));
    setSessionKeys(sessions);
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const exportKeys = () => {
    if (!keyPair) return;

    const exportData = {
      ...keyPair,
      profile: userProfile,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voidlink-keys-${userProfile.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const regenerateKeys = async () => {
    if (!window.confirm('Are you sure? This will generate new keys and you will lose access to existing conversations.')) {
      return;
    }

    try {
      // Generate new key pair
      const newKeyPair = CryptoService.generateKeyPair();
      
      // Update storage
      StorageService.storeKeyPair(newKeyPair);
      
      // Update profile
      const updatedProfile = {
        ...userProfile,
        publicKey: newKeyPair.publicKey,
        keysRegeneratedAt: new Date().toISOString()
      };
      StorageService.storeUserProfile(updatedProfile);
      
      setKeyPair(newKeyPair);
      
      // Clear old session keys
      CryptoService.sessionKeys.clear();
      setSessionKeys([]);
      
    } catch (error) {
      console.error('Failed to regenerate keys:', error);
    }
  };

  const cleanupOldSessions = () => {
    CryptoService.cleanupOldSessions();
    loadSessionKeys();
  };

  const formatKeyDisplay = (key, showFull = false) => {
    if (!key) return '';
    if (showFull) return key;
    return `${key.substring(0, 16)}...${key.substring(key.length - 16)}`;
  };

  const formatAge = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getSecurityLevel = () => {
    if (!keyPair) return { level: 'none', color: '#dc3545', text: 'No Keys' };
    
    const keyAge = Date.now() - new Date(userProfile.createdAt).getTime();
    const daysSinceCreation = keyAge / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation > 365) {
      return { level: 'warning', color: '#ffc107', text: 'Keys Aging' };
    }
    
    return { level: 'secure', color: '#28a745', text: 'Secure' };
  };

  const securityLevel = getSecurityLevel();

  return (
    <div className="key-management">
      <StarField />
      <div className="key-header">
        <div className="header-info">
          <h2>Key Management</h2>
          <p>Manage your cryptographic identity and session keys</p>
        </div>
        
        <div className="security-status">
          <div 
            className="security-indicator"
            style={{ backgroundColor: securityLevel.color }}
          />
          <span>{securityLevel.text}</span>
        </div>
      </div>

      {/* Main Key Pair */}
      <div className="key-section">
        <div className="section-header">
          <h3>
            <Key size={20} />
            Identity Keys
          </h3>
          <div className="section-actions">
            <button className="btn btn-secondary" onClick={exportKeys}>
              <Download size={16} />
              Export
            </button>
            <button 
              className="btn btn-warning" 
              onClick={regenerateKeys}
            >
              <RefreshCw size={16} />
              Regenerate
            </button>
          </div>
        </div>

        {keyPair ? (
          <div className="key-cards">
            {/* Public Key */}
            <div className="key-card">
              <div className="key-card-header">
                <h4>Public Key</h4>
                <div className="key-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => copyToClipboard(keyPair.publicKey, 'public')}
                  >
                    <Copy size={14} />
                    {copied === 'public' ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowQR(!showQR)}
                  >
                    QR Code
                  </button>
                </div>
              </div>
              
              <div className="key-display">
                <code>{formatKeyDisplay(keyPair.publicKey, true)}</code>
              </div>

              {showQR && (
                <div className="qr-container">
                  <QRCode
                    value={JSON.stringify({
                      type: 'voidlink_public_key',
                      publicKey: keyPair.publicKey,
                      username: userProfile.username,
                      version: '1.0'
                    })}
                    size={200}
                  />
                </div>
              )}
            </div>

            {/* Private Key */}
            <div className="key-card private-key">
              <div className="key-card-header">
                <h4>Private Key</h4>
                <div className="key-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    {showPrivateKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPrivateKey ? 'Hide' : 'Show'}
                  </button>
                  {showPrivateKey && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => copyToClipboard(keyPair.privateKey, 'private')}
                    >
                      <Copy size={14} />
                      {copied === 'private' ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="key-display">
                {showPrivateKey ? (
                  <code>{keyPair.privateKey}</code>
                ) : (
                  <div className="key-hidden">
                    <Shield size={20} />
                    <span>Private key hidden for security</span>
                  </div>
                )}
              </div>

              <div className="security-warning">
                <AlertTriangle size={16} />
                <span>Never share your private key. Keep it secure and backed up.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-keys">
            <Key size={48} />
            <h4>No Keys Found</h4>
            <p>Your cryptographic keys are missing or corrupted.</p>
            <button className="btn btn-primary" onClick={regenerateKeys}>
              Generate New Keys
            </button>
          </div>
        )}
      </div>

      {/* Session Keys */}
      <div className="key-section">
        <div className="section-header">
          <h3>
            <RefreshCw size={20} />
            Session Keys ({sessionKeys.length})
          </h3>
          <div className="section-actions">
            <button 
              className="btn btn-secondary" 
              onClick={loadSessionKeys}
            >
              Refresh
            </button>
            <button 
              className="btn btn-warning" 
              onClick={cleanupOldSessions}
            >
              Cleanup Old
            </button>
          </div>
        </div>

        <div className="session-info">
          <p>
            Session keys provide forward secrecy by generating ephemeral keys for each conversation.
            Old keys are automatically cleaned up after 1 hour.
          </p>
        </div>

        {sessionKeys.length > 0 ? (
          <div className="session-keys">
            {sessionKeys.map(session => (
              <div key={session.id} className="session-key-item">
                <div className="session-info">
                  <div className="session-id">
                    Session: {formatKeyDisplay(session.id)}
                  </div>
                  <div className="session-age">
                    Age: {formatAge(session.age)}
                  </div>
                </div>
                <div className="session-status">
                  {session.age > 3600000 ? (
                    <span className="status-expired">Expired</span>
                  ) : (
                    <span className="status-active">Active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-sessions">
            <p>No active session keys. Session keys are created when you start conversations.</p>
          </div>
        )}
      </div>

      {/* Security Best Practices */}
      <div className="key-section">
        <div className="section-header">
          <h3>
            <Shield size={20} />
            Security Best Practices
          </h3>
        </div>

        <div className="security-tips">
          <div className="tip-item">
            <div className="tip-icon">🔐</div>
            <div className="tip-content">
              <h4>Backup Your Keys</h4>
              <p>Export and securely store your keys. Without them, you cannot decrypt your messages.</p>
            </div>
          </div>

          <div className="tip-item">
            <div className="tip-icon">🚫</div>
            <div className="tip-content">
              <h4>Never Share Private Keys</h4>
              <p>Your private key should never be shared with anyone. Only share your public key.</p>
            </div>
          </div>

          <div className="tip-item">
            <div className="tip-icon">🔄</div>
            <div className="tip-content">
              <h4>Regular Key Rotation</h4>
              <p>Consider regenerating keys periodically for enhanced security, especially if compromised.</p>
            </div>
          </div>

          <div className="tip-item">
            <div className="tip-icon">⚡</div>
            <div className="tip-content">
              <h4>Forward Secrecy</h4>
              <p>Session keys ensure that past communications remain secure even if current keys are compromised.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyManagement;