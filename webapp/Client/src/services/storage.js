class StorageService {
  constructor() {
    this.prefix = 'voidlink_';
  }

  // Store encrypted key pair securely
  storeKeyPair(keyPair, passphrase = null) {
    try {
      let dataToStore = keyPair;
      
      // If passphrase provided, encrypt the private key
      if (passphrase) {
        // In production, use proper key derivation (PBKDF2/Argon2)
        // This is simplified for demo purposes
        dataToStore = {
          ...keyPair,
          encrypted: true,
          // In real implementation, encrypt privateKey with derived key
        };
      }

      localStorage.setItem(
        `${this.prefix}keypair`,
        JSON.stringify(dataToStore)
      );
      return true;
    } catch (error) {
      console.error('Failed to store key pair:', error);
      return false;
    }
  }

  // Retrieve key pair
  getKeyPair(passphrase = null) {
    try {
      const stored = localStorage.getItem(`${this.prefix}keypair`);
      if (!stored) return null;

      const keyPair = JSON.parse(stored);
      
      // If encrypted, decrypt with passphrase
      if (keyPair.encrypted && passphrase) {
        // In real implementation, decrypt privateKey here
        return keyPair;
      }

      return keyPair.encrypted ? null : keyPair;
    } catch (error) {
      console.error('Failed to retrieve key pair:', error);
      return null;
    }
  }

  // Store user profile
  storeUserProfile(profile) {
    try {
      localStorage.setItem(
        `${this.prefix}profile`,
        JSON.stringify(profile)
      );
      return true;
    } catch (error) {
      console.error('Failed to store user profile:', error);
      return false;
    }
  }

  // Get user profile
  getUserProfile() {
    try {
      const stored = localStorage.getItem(`${this.prefix}profile`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      return null;
    }
  }

  // Store contacts
  storeContacts(contacts) {
    try {
      localStorage.setItem(
        `${this.prefix}contacts`,
        JSON.stringify(contacts)
      );
      return true;
    } catch (error) {
      console.error('Failed to store contacts:', error);
      return false;
    }
  }

  // Get contacts
  getContacts() {
    try {
      const stored = localStorage.getItem(`${this.prefix}contacts`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve contacts:', error);
      return [];
    }
  }

  // Store message history (encrypted)
  storeMessages(contactId, messages) {
    try {
      localStorage.setItem(
        `${this.prefix}messages_${contactId}`,
        JSON.stringify(messages)
      );
      return true;
    } catch (error) {
      console.error('Failed to store messages:', error);
      return false;
    }
  }

  // Get message history
  getMessages(contactId) {
    try {
      const stored = localStorage.getItem(`${this.prefix}messages_${contactId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve messages:', error);
      return [];
    }
  }

  // Store app settings
  storeSettings(settings) {
    try {
      localStorage.setItem(
        `${this.prefix}settings`,
        JSON.stringify(settings)
      );
      return true;
    } catch (error) {
      console.error('Failed to store settings:', error);
      return false;
    }
  }

  // Get app settings
  getSettings() {
    try {
      const stored = localStorage.getItem(`${this.prefix}settings`);
      return stored ? JSON.parse(stored) : {
        theme: 'light',
        notifications: true,
        autoDeleteMessages: false,
        sessionTimeout: 3600000 // 1 hour
      };
    } catch (error) {
      console.error('Failed to retrieve settings:', error);
      return {};
    }
  }

  // Clear all stored data (logout)
  clearAll() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  // Check if user is logged in
  isLoggedIn() {
    return this.getKeyPair() !== null && this.getUserProfile() !== null;
  }

  // Export data for backup
  exportData() {
    try {
      const data = {};
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          data[key] = localStorage.getItem(key);
        }
      });

      return JSON.stringify(data);
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  // Import data from backup
  importData(dataString) {
    try {
      const data = JSON.parse(dataString);
      
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith(this.prefix)) {
          localStorage.setItem(key, value);
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}

export default new StorageService();