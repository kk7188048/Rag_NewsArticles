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
    origin: [
   "https://ragfrontend-eight.vercel.app",
  "https://ragfrontend-kk7188048s-projects.vercel.app",
  "https://ragfrontend-git-main-kk7188048s-projects.vercel.app",
  "https://ragfrontend-oqglrngyp-kk7188048s-projects.vercel.app", 
    'http://localhost:3000'                  
  ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling']
});



const PORT = process.env.PORT || 5000;

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

app.use(morgan('combined'));

app.use(cors({
  origin: [
   "https://ragfrontend-eight.vercel.app",
  "https://ragfrontend-kk7188048s-projects.vercel.app",
  "https://ragfrontend-git-main-kk7188048s-projects.vercel.app",
  "https://ragfrontend-oqglrngyp-kk7188048s-projects.vercel.app",
    'http://localhost:3000'                  
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

app.get('/health', async (req, res) => {
  try {
    const chatController = require('./controllers/chatController');
    await chatController.initialize();
    
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

io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  const ChatController = require('./controllers/chatController');
  const chatController = new ChatController();
  await chatController.initialize();

  socket.on('create_session', () => {
    const sessionId = chatController.sessionService.createSession();
    socket.emit('session_created', { sessionId });
    socket.join(sessionId); // Join room for this session
  });

  socket.on('send_message', async (data) => {
    try {
      const { sessionId, message } = data;
      
      if (!sessionId || !message) {
        socket.emit('error', { message: 'Session ID and message are required' });
        return;
      }

      socket.emit('bot_typing', true);

      await chatController.sessionService.extendSession(sessionId);

      await chatController.sessionService.saveMessage(sessionId, {
        type: 'user',
        content: message
      });

      socket.emit('message_sent', {
        type: 'user',
        content: message,
        timestamp: Date.now()
      });

      const result = await chatController.ragService.processQuery(message);

      await chatController.sessionService.saveMessage(sessionId, {
        type: 'bot',
        content: result.response,
        sources: result.sources
      });

      socket.emit('bot_typing', false);
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
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
