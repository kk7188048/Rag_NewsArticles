const { Pool } = require('pg');

class DatabaseService {
  constructor() {
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    } else {
      this.pool = null;
      console.log('Database not configured - transcripts will not be persisted');
    }
  }

  async initialize() {
    if (!this.pool) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS chat_transcripts (
          id SERIAL PRIMARY KEY,
          session_id UUID NOT NULL,
          messages JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  async saveTranscript(sessionId, messages) {
    if (!this.pool) return false;

    try {
      await this.pool.query(
        `INSERT INTO chat_transcripts (session_id, messages) 
         VALUES ($1, $2) 
         ON CONFLICT (session_id) 
         DO UPDATE SET messages = $2, updated_at = NOW()`,
        [sessionId, JSON.stringify(messages)]
      );
      return true;
    } catch (error) {
      console.error('Error saving transcript:', error);
      return false;
    }
  }
}

module.exports = DatabaseService;
