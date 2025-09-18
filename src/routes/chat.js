const express = require('express');
const ChatController = require('../controllers/chatController'); // ✅ Import the class

const router = express.Router();

// ✅ Create instance here
const chatController = new ChatController();

// Initialize controller (ensure RAG pipeline is ready)
router.use(async (req, res, next) => {
  try {
    await chatController.initialize();
    next();
  } catch (error) {
    console.error('Failed to initialize chat controller:', error);
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable'
    });
  }
});

// Routes
router.post('/session', chatController.createSession);
router.post('/message', chatController.sendMessage);
router.get('/history/:sessionId', chatController.getChatHistory);
router.delete('/session/:sessionId', chatController.clearSession);
router.get('/stats', chatController.getStats);

module.exports = router;
