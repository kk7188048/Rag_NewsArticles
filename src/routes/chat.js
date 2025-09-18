const express = require('express');
const ChatController = require('../controllers/chatController'); 

const router = express.Router();

const chatController = new ChatController();

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
