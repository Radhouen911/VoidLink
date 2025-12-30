import axios from 'axios';

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.frontendOnly = !process.env.REACT_APP_API_URL; // Frontend-only mode when no API URL is set
    
    if (!this.frontendOnly) {
      this.client = axios.create({
        baseURL: this.baseURL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Register user with public key (passwordless)
  async registerUser(publicKey, username) {
    if (this.frontendOnly) {
      // Frontend-only mode: simulate successful registration
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      return {
        userId: `user_${Date.now()}`,
        username,
        publicKey,
        message: 'User registered successfully (frontend-only mode)'
      };
    }

    try {
      const response = await this.client.post('/auth/register', {
        publicKey,
        username,
        timestamp: Date.now()
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  // Authenticate using public key challenge
  async authenticateUser(publicKey, signature, challenge) {
    if (this.frontendOnly) {
      // Frontend-only mode: simulate successful authentication
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        token: `token_${Date.now()}`,
        message: 'Authentication successful (frontend-only mode)'
      };
    }

    try {
      const response = await this.client.post('/auth/login', {
        publicKey,
        signature,
        challenge,
        timestamp: Date.now()
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Authentication failed');
    }
  }

  // Get authentication challenge
  async getChallenge(publicKey) {
    if (this.frontendOnly) {
      // Frontend-only mode: return a mock challenge
      await new Promise(resolve => setTimeout(resolve, 200));
      return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    try {
      const response = await this.client.post('/auth/challenge', {
        publicKey
      });
      return response.data.challenge;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get challenge');
    }
  }

  // Send encrypted message (server never sees plaintext)
  async sendMessage(encryptedMessage, recipientId, senderId) {
    if (this.frontendOnly) {
      // Frontend-only mode: simulate message sending
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        messageId: `msg_${Date.now()}`,
        timestamp: Date.now(),
        message: 'Message sent successfully (frontend-only mode)'
      };
    }

    try {
      const response = await this.client.post('/messages/send', {
        ...encryptedMessage,
        recipientId,
        senderId,
        timestamp: Date.now()
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send message');
    }
  }

  // Get encrypted messages for user
  async getMessages(userId, lastMessageId = null) {
    if (this.frontendOnly) {
      // Frontend-only mode: return empty messages array
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        messages: [],
        hasMore: false
      };
    }

    try {
      const params = lastMessageId ? { lastMessageId } : {};
      const response = await this.client.get(`/messages/${userId}`, { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch messages');
    }
  }

  // Find user by public key or username
  async findUser(query) {
    if (this.frontendOnly) {
      // Frontend-only mode: simulate user search (return empty for demo)
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        users: [],
        message: 'No users found (frontend-only mode)'
      };
    }

    try {
      const response = await this.client.get(`/users/search`, {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'User not found');
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    if (this.frontendOnly) {
      // Frontend-only mode: return mock profile
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        id: userId,
        username: 'Demo User',
        status: 'online',
        lastSeen: Date.now()
      };
    }

    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get user profile');
    }
  }

  // Update user status
  async updateUserStatus(userId, status) {
    if (this.frontendOnly) {
      // Frontend-only mode: simulate status update
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        status,
        timestamp: Date.now(),
        message: 'Status updated successfully (frontend-only mode)'
      };
    }

    try {
      const response = await this.client.put(`/users/${userId}/status`, {
        status,
        timestamp: Date.now()
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update status');
    }
  }

  // WebSocket connection for real-time messaging
  connectWebSocket(userId, onMessage, onStatusChange) {
    if (this.frontendOnly) {
      // Frontend-only mode: return mock WebSocket
      console.log('WebSocket connected (frontend-only mode)');
      return {
        close: () => console.log('WebSocket closed (frontend-only mode)'),
        send: (data) => console.log('WebSocket send (frontend-only mode):', data)
      };
    }

    const wsUrl = this.baseURL.replace('http', 'ws').replace('/api', '/ws');
    const ws = new WebSocket(`${wsUrl}?userId=${userId}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        onMessage(data.payload);
      } else if (data.type === 'status') {
        onStatusChange(data.payload);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        this.connectWebSocket(userId, onMessage, onStatusChange);
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }
}

export default new ApiService();