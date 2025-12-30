import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, QrCode, UserPlus, Trash2, Eye, Copy } from 'lucide-react';
import QRCode from 'react-qr-code';
import CryptoService from '../services/crypto';
import StorageService from '../services/storage';
import ApiService from '../services/api';
import StarField from './StarField';
import './ContactManager.css';

const ContactManager = ({ userProfile }) => {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    const storedContacts = StorageService.getContacts();
    setContacts(storedContacts);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.publicKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addContact = async (contactData) => {
    try {
      // Validate public key format
      if (!contactData.publicKey || contactData.publicKey.length !== 64) {
        throw new Error('Invalid public key format');
      }

      // Check if contact already exists
      const existingContact = contacts.find(c => 
        c.publicKey === contactData.publicKey || 
        c.username === contactData.username
      );

      if (existingContact) {
        throw new Error('Contact already exists');
      }

      const newContact = {
        id: contactData.id || Date.now().toString(),
        username: contactData.username,
        publicKey: contactData.publicKey,
        status: 'offline',
        addedAt: new Date().toISOString(),
        verified: false
      };

      const updatedContacts = [...contacts, newContact];
      setContacts(updatedContacts);
      StorageService.storeContacts(updatedContacts);
      setShowAddModal(false);
      
      return newContact;
    } catch (error) {
      throw error;
    }
  };

  const removeContact = (contactId) => {
    if (!window.confirm('Are you sure you want to remove this contact?')) {
      return;
    }

    const updatedContacts = contacts.filter(c => c.id !== contactId);
    setContacts(updatedContacts);
    StorageService.storeContacts(updatedContacts);
    
    // Also remove message history
    StorageService.storeMessages(contactId, []);
  };

  const verifyContact = async (contact) => {
    // In a real implementation, this would involve a verification process
    // For now, we'll just mark as verified
    const updatedContacts = contacts.map(c =>
      c.id === contact.id ? { ...c, verified: true } : c
    );
    setContacts(updatedContacts);
    StorageService.storeContacts(updatedContacts);
  };

  const copyPublicKey = async (publicKey) => {
    try {
      await navigator.clipboard.writeText(publicKey);
      // Show success feedback
    } catch (error) {
      console.error('Failed to copy public key:', error);
    }
  };

  const generateMyQRCode = () => {
    return JSON.stringify({
      type: 'voidlink_contact',
      username: userProfile.username,
      publicKey: userProfile.publicKey,
      version: '1.0'
    });
  };

  const renderContactCard = (contact) => (
    <div key={contact.id} className="contact-card">
      <div className="contact-avatar">
        {contact.username.charAt(0).toUpperCase()}
      </div>
      
      <div className="contact-details">
        <div className="contact-header">
          <h4 className="contact-name">
            {contact.username}
            {contact.verified && (
              <span className="verified-badge">✓</span>
            )}
          </h4>
          <div className="contact-status">
            <div className={`status-indicator status-${contact.status}`} />
            <span>{contact.status}</span>
          </div>
        </div>
        
        <div className="contact-key">
          <span className="key-label">Public Key:</span>
          <code className="key-value">
            {contact.publicKey.substring(0, 16)}...{contact.publicKey.substring(-8)}
          </code>
        </div>
        
        <div className="contact-meta">
          <span>Added: {new Date(contact.addedAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="contact-actions">
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => copyPublicKey(contact.publicKey)}
          title="Copy Public Key"
        >
          <Copy size={14} />
        </button>
        
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setSelectedContact(contact)}
          title="View Details"
        >
          <Eye size={14} />
        </button>
        
        {!contact.verified && (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => verifyContact(contact)}
            title="Verify Contact"
          >
            <UserPlus size={14} />
          </button>
        )}
        
        <button
          className="btn btn-sm btn-danger"
          onClick={() => removeContact(contact.id)}
          title="Remove Contact"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="contact-manager">
      <StarField />
      <div className="contact-header">
        <div className="header-info">
          <h2>Contact Manager</h2>
          <p>Manage your secure contacts and their public keys</p>
        </div>
        
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowQRModal(true)}
          >
            <QrCode size={16} />
            My QR Code
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            Add Contact
          </button>
        </div>
      </div>

      <div className="contact-controls">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="contact-stats">
          <span>{contacts.length} total contacts</span>
          <span>{contacts.filter(c => c.verified).length} verified</span>
          <span>{contacts.filter(c => c.status === 'online').length} online</span>
        </div>
      </div>

      <div className="contacts-grid">
        {filteredContacts.length > 0 ? (
          filteredContacts.map(renderContactCard)
        ) : (
          <div className="empty-contacts">
            <Users size={64} />
            <h3>No contacts found</h3>
            <p>
              {searchQuery 
                ? 'No contacts match your search criteria'
                : 'Add contacts to start secure messaging'
              }
            </p>
            {!searchQuery && (
              <button
                className="btn btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                Add Your First Contact
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal
          onAdd={addContact}
          onClose={() => setShowAddModal(false)}
          loading={loading}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          qrData={generateMyQRCode()}
          userProfile={userProfile}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* Contact Details Modal */}
      {selectedContact && (
        <ContactDetailsModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onVerify={() => verifyContact(selectedContact)}
          onRemove={() => {
            removeContact(selectedContact.id);
            setSelectedContact(null);
          }}
        />
      )}
    </div>
  );
};

// Add Contact Modal Component
const AddContactModal = ({ onAdd, onClose, loading }) => {
  const [method, setMethod] = useState('manual'); // 'manual' or 'qr'
  const [username, setUsername] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !publicKey.trim()) {
      setError('Username and public key are required');
      return;
    }

    try {
      await onAdd({
        username: username.trim(),
        publicKey: publicKey.trim()
      });
    } catch (error) {
      setError(error.message);
    }
  };

  const handleQRScan = (data) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'voidlink_contact' && parsed.username && parsed.publicKey) {
        setUsername(parsed.username);
        setPublicKey(parsed.publicKey);
        setMethod('manual');
      } else {
        setError('Invalid QR code format');
      }
    } catch (error) {
      setError('Failed to parse QR code');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add Contact</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="method-selector">
            <button
              className={`method-btn ${method === 'manual' ? 'active' : ''}`}
              onClick={() => setMethod('manual')}
            >
              Manual Entry
            </button>
            <button
              className={`method-btn ${method === 'qr' ? 'active' : ''}`}
              onClick={() => setMethod('qr')}
            >
              Scan QR Code
            </button>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          {method === 'manual' ? (
            <form onSubmit={handleSubmit}>
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
          ) : (
            <div className="qr-scanner">
              <p>Use your camera to scan a VoidLink contact QR code</p>
              {/* QR Scanner would go here - simplified for demo */}
              <div className="qr-placeholder">
                <QrCode size={48} />
                <p>QR Scanner not implemented in demo</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => setMethod('manual')}
                >
                  Use Manual Entry Instead
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// QR Code Modal Component
const QRCodeModal = ({ qrData, userProfile, onClose }) => {
  const copyQRData = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
    } catch (error) {
      console.error('Failed to copy QR data:', error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>My Contact QR Code</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content qr-modal-content">
          <div className="qr-display">
            <QRCode value={qrData} size={256} />
          </div>
          
          <div className="qr-info">
            <h4>{userProfile.username}</h4>
            <p>Share this QR code to let others add you as a contact</p>
          </div>
          
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={copyQRData}>
              <Copy size={16} />
              Copy Data
            </button>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contact Details Modal Component
const ContactDetailsModal = ({ contact, onClose, onVerify, onRemove }) => {
  const copyPublicKey = async () => {
    try {
      await navigator.clipboard.writeText(contact.publicKey);
    } catch (error) {
      console.error('Failed to copy public key:', error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Contact Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="contact-detail-card">
            <div className="contact-avatar large">
              {contact.username.charAt(0).toUpperCase()}
            </div>
            
            <div className="contact-info">
              <h4>
                {contact.username}
                {contact.verified && (
                  <span className="verified-badge">✓ Verified</span>
                )}
              </h4>
              
              <div className="detail-row">
                <label>Status:</label>
                <span className={`status-${contact.status}`}>
                  {contact.status}
                </span>
              </div>
              
              <div className="detail-row">
                <label>Added:</label>
                <span>{new Date(contact.addedAt).toLocaleString()}</span>
              </div>
              
              <div className="detail-row">
                <label>Public Key:</label>
                <div className="key-display-full">
                  <code>{contact.publicKey}</code>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={copyPublicKey}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            {!contact.verified && (
              <button className="btn btn-primary" onClick={onVerify}>
                <UserPlus size={16} />
                Verify Contact
              </button>
            )}
            <button className="btn btn-danger" onClick={onRemove}>
              <Trash2 size={16} />
              Remove Contact
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactManager;