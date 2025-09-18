// const RAGService = require('../services/ragService');
// const SessionService = require('../services/sessionService');

// class ChatController {
//   constructor() {
//     this.ragService = new RAGService();
//     this.sessionService = new SessionService();
//     this.isInitialized = false;
//   }

//   async initialize() {
//     if (!this.isInitialized) {
//       await this.ragService.initialize();
//       this.isInitialized = true;
//     }
//   }

//   // Create new chat session
//   createSession = async (req, res) => {
//     try {
//       const sessionId = this.sessionService.createSession();
      
//       res.json({
//         success: true,
//         sessionId,
//         message: 'New session created'
//       });
//     } catch (error) {
//       console.error('Error creating session:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to create session'
//       });
//     }
//   };

//   // Send message and get response
//   sendMessage = async (req, res) => {
//     try {
//       const { sessionId, message } = req.body;

//       if (!sessionId || !message) {
//         return res.status(400).json({
//           success: false,
//           error: 'Session ID and message are required'
//         });
//       }

//       // Extend session TTL
//       await this.sessionService.extendSession(sessionId);

//       // Save user message
//       await this.sessionService.saveMessage(sessionId, {
//         type: 'user',
//         content: message
//       });

//       // Process query through RAG pipeline
//       const result = await this.ragService.processQuery(message);

//       // Save bot response
//       await this.sessionService.saveMessage(sessionId, {
//         type: 'bot',
//         content: result.response,
//         sources: result.sources
//       });

//       res.json({
//         success: true,
//         response: result.response,
//         sources: result.sources,
//         retrievedCount: result.retrievedCount
//       });

//     } catch (error) {
//       console.error('Error processing message:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to process message'
//       });
//     }
//   };

//   // Get chat history
//   getChatHistory = async (req, res) => {
//     try {
//       const { sessionId } = req.params;

//       if (!sessionId) {
//         return res.status(400).json({
//           success: false,
//           error: 'Session ID is required'
//         });
//       }

//       const history = await this.sessionService.getSessionHistory(sessionId);
//       const sessionInfo = await this.sessionService.getSessionInfo(sessionId);

//       res.json({
//         success: true,
//         history,
//         sessionInfo
//       });

//     } catch (error) {
//       console.error('Error getting chat history:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to get chat history'
//       });
//     }
//   };

//   // Clear session
//   clearSession = async (req, res) => {
//     try {
//       const { sessionId } = req.params;

//       if (!sessionId) {
//         return res.status(400).json({
//           success: false,
//           error: 'Session ID is required'
//         });
//       }

//       const cleared = await this.sessionService.clearSession(sessionId);

//       res.json({
//         success: cleared,
//         message: cleared ? 'Session cleared successfully' : 'Failed to clear session'
//       });

//     } catch (error) {
//       console.error('Error clearing session:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to clear session'
//       });
//     }
//   };

//   // Get system stats
//   getStats = async (req, res) => {
//     try {
//       const stats = await this.ragService.getStats();
      
//       res.json({
//         success: true,
//         stats
//       });
//     } catch (error) {
//       console.error('Error getting stats:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to get stats'
//       });
//     }
//   };
// }

// module.exports = new ChatController();

const RAGService = require('../services/ragService');
const SessionService = require('../services/sessionService');

class ChatController {
  constructor() {
    this.ragService = new RAGService();
    this.sessionService = new SessionService();
    this.isInitialized = false;
  }

  async initialize() {
    if (!this.isInitialized) {
      await this.ragService.initialize();
      this.isInitialized = true;
    }
  }

  // Create new chat session
  createSession = async (req, res) => {
    try {
      const sessionId = this.sessionService.createSession();
      
      res.json({
        success: true,
        sessionId,
        message: 'New session created'
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }
  };

  // Send message and get response
  sendMessage = async (req, res) => {
    try {
      const { sessionId, message } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({
          success: false,
          error: 'Session ID and message are required'
        });
      }

      // Extend session TTL
      await this.sessionService.extendSession(sessionId);

      // Save user message
      await this.sessionService.saveMessage(sessionId, {
        type: 'user',
        content: message
      });

      // Process query through RAG pipeline
      const result = await this.ragService.processQuery(message);

      // Save bot response
      await this.sessionService.saveMessage(sessionId, {
        type: 'bot',
        content: result.response,
        sources: result.sources
      });

      res.json({
        success: true,
        response: result.response,
        sources: result.sources,
        retrievedCount: result.retrievedCount
      });

    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  };

  // Get chat history
  getChatHistory = async (req, res) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      const history = await this.sessionService.getSessionHistory(sessionId);
      const sessionInfo = await this.sessionService.getSessionInfo(sessionId);

      res.json({
        success: true,
        history,
        sessionInfo
      });

    } catch (error) {
      console.error('Error getting chat history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chat history'
      });
    }
  };

  // Clear session
  clearSession = async (req, res) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      const cleared = await this.sessionService.clearSession(sessionId);

      res.json({
        success: cleared,
        message: cleared ? 'Session cleared successfully' : 'Failed to clear session'
      });

    } catch (error) {
      console.error('Error clearing session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear session'
      });
    }
  };

  // Get system stats
  getStats = async (req, res) => {
    try {
      const stats = await this.ragService.getStats();
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get stats'
      });
    }
  };
}

// ✅ IMPORTANT: Export as class, not instance
module.exports = ChatController;
