const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const chatRoutes = require('./routes/chat');
const ChatController = require('./controllers/chatController');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));


// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/chat', chatRoutes);

// Enhanced health check with Chroma Cloud verification
app.get('/health', async (req, res) => {
  try {
    const chatController = require('./controllers/chatController');
    await chatController.initialize();
    
    // Get Chroma Cloud status
    const stats = await chatController.ragService.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      dependencies: {
        redis: 'connected',
        chroma_cloud: stats.isInitialized ? 'connected' : 'disconnected',
        article_count: stats.articleCount || 0
      },
      chroma_info: {
        tenant: process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE,
        collection: 'news_articles'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: 'unknown',
        chroma_cloud: 'failed'
      }
    });
  }
});


// Socket.io implementation
// io.on('connection', async (socket) => {
//   console.log(`User connected: ${socket.id}`);
  
//   // Initialize chat controller
//   const chatController = new ChatController();
//   await chatController.initialize();

//   // Create new session on connection
//   socket.on('create_session', () => {
//     const sessionId = chatController.sessionService.createSession();
//     socket.emit('session_created', { sessionId });
//     socket.join(sessionId); // Join room for this session
//   });

//   // Handle chat messages
//   socket.on('send_message', async (data) => {
//     try {
//       const { sessionId, message } = data;
      
//       if (!sessionId || !message) {
//         socket.emit('error', { message: 'Session ID and message are required' });
//         return;
//       }

//       // Emit typing indicator
//       socket.emit('bot_typing', true);

//       // Extend session TTL
//       await chatController.sessionService.extendSession(sessionId);

//       // Save user message
//       await chatController.sessionService.saveMessage(sessionId, {
//         type: 'user',
//         content: message
//       });

//       // Emit user message confirmation
//       socket.emit('message_sent', {
//         type: 'user',
//         content: message,
//         timestamp: Date.now()
//       });

//       // Process query through RAG pipeline
//       const result = await chatController.ragService.processQuery(message);

//       // Save bot response
//       await chatController.sessionService.saveMessage(sessionId, {
//         type: 'bot',
//         content: result.response,
//         sources: result.sources
//       });

//       // Stop typing indicator
//       socket.emit('bot_typing', false);

//       // Emit bot response
//       socket.emit('message_received', {
//         type: 'bot',
//         content: result.response,
//         sources: result.sources,
//         timestamp: Date.now()
//       });

//     } catch (error) {
//       console.error('Error processing message:', error);
//       socket.emit('bot_typing', false);
//       socket.emit('error', { message: 'Failed to process message' });
//     }
//   });

//   // Get chat history
//   socket.on('get_history', async (data) => {
//     try {
//       const { sessionId } = data;
//       const history = await chatController.sessionService.getSessionHistory(sessionId);
//       socket.emit('history_loaded', { history });
//     } catch (error) {
//       socket.emit('error', { message: 'Failed to load history' });
//     }
//   });

//   // Clear session
//   socket.on('clear_session', async (data) => {
//     try {
//       const { sessionId } = data;
//       await chatController.sessionService.clearSession(sessionId);
//       socket.emit('session_cleared');
//     } catch (error) {
//       socket.emit('error', { message: 'Failed to clear session' });
//     }
//   });

//   socket.on('disconnect', () => {
//     console.log(`User disconnected: ${socket.id}`);
//   });
// });

// Socket.io implementation
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // ✅ Create instance, don't use 'new' with imported instance
  const ChatController = require('./controllers/chatController');
  const chatController = new ChatController();
  await chatController.initialize();

  // Create new session on connection
  socket.on('create_session', () => {
    const sessionId = chatController.sessionService.createSession();
    socket.emit('session_created', { sessionId });
    socket.join(sessionId); // Join room for this session
  });

  // Handle chat messages
  socket.on('send_message', async (data) => {
    try {
      const { sessionId, message } = data;
      
      if (!sessionId || !message) {
        socket.emit('error', { message: 'Session ID and message are required' });
        return;
      }

      // Emit typing indicator
      socket.emit('bot_typing', true);

      // Extend session TTL
      await chatController.sessionService.extendSession(sessionId);

      // Save user message
      await chatController.sessionService.saveMessage(sessionId, {
        type: 'user',
        content: message
      });

      // Emit user message confirmation
      socket.emit('message_sent', {
        type: 'user',
        content: message,
        timestamp: Date.now()
      });

      // Process query through RAG pipeline
      const result = await chatController.ragService.processQuery(message);

      // Save bot response
      await chatController.sessionService.saveMessage(sessionId, {
        type: 'bot',
        content: result.response,
        sources: result.sources
      });

      // Stop typing indicator
      socket.emit('bot_typing', false);

      // Emit bot response
      socket.emit('message_received', {
        type: 'bot',
        content: result.response,
        sources: result.sources,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('bot_typing', false);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  // Rest of your socket handlers...
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
