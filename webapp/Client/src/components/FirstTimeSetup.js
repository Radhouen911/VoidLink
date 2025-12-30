import React, { useState } from 'react';
import { Users, Plus, QrCode, Copy, ArrowRight, CheckCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import StorageService from '../services/storage';
import StarField from './StarField';
import './FirstTimeSetup.css';

const FirstTimeSetup = ({ userProfile, onComplete }) => {
  const [step, setStep] = useState(1);
  const [showQR, setShowQR] = useState(false);
  const [newContact, setNewContact] = useState({ username: '', publicKey: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const copyPublicKey = async () => {
    try {
      await navigator.clipboard.writeText(userProfile.publicKey);
      // Show success feedback
    } catch (error) {
      console.error('Failed to copy public key:', error);
    }
  };

  const addContact = async () => {
    if (!newContact.username.trim() || !newContact.publicKey.trim()) {
      setError('Both username and public key are required');
      return;
    }

    if (newContact.publicKey.length !== 64) {
      setError('Invalid public key format');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const contact = {
        id: Date.now().toString(),
        username: newContact.username.trim(),
        publicKey: newContact.publicKey.trim(),
        status: 'offline',
        addedAt: new Date().toISOString(),
        verified: false
      };

      // Get existing contacts and add new one
      const contacts = StorageService.getContacts();
      contacts.push(contact);
      StorageService.storeContacts(contacts);

      setStep(3); // Move to completion step
    } catch (error) {
      setError('Failed to add contact: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const skipForNow = () => {
    onComplete();
  };

  const completeSetup = () => {
    onComplete();
  };

  const renderStep1 = () => (
    <div className="setup-step">
      <div className="step-header">
        <Users className="step-icon" />
        <h2>Welcome to VoidLink!</h2>
        <p>Let's add your first contact to start secure messaging</p>
      </div>

      <div className="setup-content">
        <div className="step-info">
          <h3>🎯 Next Step: Add Contact</h3>
          <p>
            To start messaging, you need to add a contact. You can share your public key 
            with someone or add their public key to your contacts.
          </p>
        </div>

        <div className="setup-actions">
          <button
            className="btn btn-primary setup-btn"
            onClick={() => setStep(2)}
          >
            <Plus size={20} />
            Add First Contact
          </button>
          
          <button
            className="btn btn-secondary setup-btn"
            onClick={skipForNow}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="setup-step">
      <div className="step-header">
        <Plus className="step-icon" />
        <h2>Add Your First Contact</h2>
        <p>Enter their username and public key to start secure messaging</p>
      </div>

      <div className="setup-content">
        <div className="add-contact-form">
          <div className="form-group">
            <label>Contact Username</label>
            <input
              type="text"
              className="input"
              value={newContact.username}
              onChange={(e) => setNewContact({...newContact, username: e.target.value})}
              placeholder="Enter their username"
            />
          </div>

          <div className="form-group">
            <label>Their Public Key</label>
            <textarea
              className="input"
              value={newContact.publicKey}
              onChange={(e) => setNewContact({...newContact, publicKey: e.target.value})}
              placeholder="Paste their public key here"
              rows={3}
            />
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="setup-actions">
            <button
              className="btn btn-primary setup-btn"
              onClick={addContact}
              disabled={loading || !newContact.username.trim() || !newContact.publicKey.trim()}
            >
              {loading ? 'Adding Contact...' : 'Add Contact'}
              <ArrowRight size={16} />
            </button>
            
            <button
              className="btn btn-secondary setup-btn"
              onClick={() => setStep(1)}
            >
              Back
            </button>
          </div>
        </div>

        <div className="divider">
          <span>or share your public key</span>
        </div>

        <div className="share-key-section">
          <h4>📤 Share Your Public Key</h4>
          <p>Give this to your contact so they can add you:</p>
          
          <div className="key-share-card">
            <div className="key-info">
              <strong>Username:</strong> {userProfile.username}
            </div>
            <div className="key-display">
              <code>{userProfile.publicKey}</code>
              <button
                className="btn btn-sm btn-secondary"
                onClick={copyPublicKey}
              >
                <Copy size={14} />
              </button>
            </div>
            
            <div className="key-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowQR(!showQR)}
              >
                <QrCode size={16} />
                {showQR ? 'Hide QR' : 'Show QR'}
              </button>
            </div>

            {showQR && (
              <div className="qr-container">
                <QRCode
                  value={JSON.stringify({
                    type: 'voidlink_contact',
                    username: userProfile.username,
                    publicKey: userProfile.publicKey,
                    version: '1.0'
                  })}
                  size={200}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="setup-step">
      <div className="step-header">
        <CheckCircle className="step-icon success" />
        <h2>Contact Added Successfully!</h2>
        <p>You're all set to start secure messaging</p>
      </div>

      <div className="setup-content">
        <div className="success-info">
          <div className="contact-added">
            <h4>✅ {newContact.username} has been added</h4>
            <p>You can now send encrypted messages to this contact.</p>
          </div>

          <div className="next-steps">
            <h4>🚀 What's Next?</h4>
            <ul>
              <li>Start a conversation in the Messages tab</li>
              <li>Verify your contact's identity for enhanced security</li>
              <li>Add more contacts anytime from the Contacts tab</li>
            </ul>
          </div>
        </div>

        <div className="setup-actions">
          <button
            className="btn btn-primary setup-btn"
            onClick={completeSetup}
          >
            Start Messaging
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="first-time-setup">
      <StarField />
      <div className="setup-container">
        <div className="setup-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <div className="progress-text">
            Step {step} of 3
          </div>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default FirstTimeSetup;