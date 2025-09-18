const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class SessionService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.defaultTTL = 3600;
    
    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  // Create new session
  createSession() {
    const sessionId = uuidv4();
    console.log(`Created new session: ${sessionId}`);
    return sessionId;
  }

  // Save message to session history
  async saveMessage(sessionId, message) {
    try {
      const key = `session:${sessionId}:messages`;
      const messageData = {
        ...message,
        timestamp: Date.now()
      };

      await this.redis.lpush(key, JSON.stringify(messageData));
      
      await this.redis.expire(key, this.defaultTTL);
      
      return true;
    } catch (error) {
      console.error('Error saving message:', error);
      return false;
    }
  }

  async getSessionHistory(sessionId, limit = 50) {
    try {
      const key = `session:${sessionId}:messages`;
      const messages = await this.redis.lrange(key, 0, limit - 1);
      
      return messages.map(msg => JSON.parse(msg)).reverse(); // Reverse to get chronological order
    } catch (error) {
      console.error('Error getting session history:', error);
      return [];
    }
  }

  // Clear session
  async clearSession(sessionId) {
    try {
      const key = `session:${sessionId}:messages`;
      await this.redis.del(key);
      console.log(`Cleared session: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  }

  // Update session TTL
  async extendSession(sessionId) {
    try {
      const key = `session:${sessionId}:messages`;
      await this.redis.expire(key, this.defaultTTL);
      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }

  // Get session info
  async getSessionInfo(sessionId) {
    try {
      const key = `session:${sessionId}:messages`;
      const exists = await this.redis.exists(key);
      
      if (!exists) {
        return { exists: false, messageCount: 0, ttl: 0 };
      }

      const messageCount = await this.redis.llen(key);
      const ttl = await this.redis.ttl(key);

      return {
        exists: true,
        messageCount,
        ttl
      };
    } catch (error) {
      console.error('Error getting session info:', error);
      return { exists: false, messageCount: 0, ttl: 0 };
    }
  }
}

module.exports = SessionService;
