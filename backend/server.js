const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import database connection
const pool = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');
const attemptRoutes = require('./routes/attempts');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const aiPracticeRoutes = require('./routes/aiPractice');

// Import middleware
const { generalRateLimit } = require('./middleware/rateLimit');

const app = express();

// Enhanced CORS for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  /\.onrender\.com$/
].filter(Boolean);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://openrouter.ai"]
    }
  } : false
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
if (process.env.ENABLE_RATE_LIMITING !== 'false') {
  app.use(generalRateLimit);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-practice', aiPracticeRoutes);

// Root endpoint for health check
app.get('/', (req, res) => {
  res.json({
    message: 'ExamGenius AI API is running successfully!',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    features: ['AI Question Generation', 'Adaptive Testing', 'Performance Analytics']
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const db = require('./models/db');
    const healthCheck = await db.healthCheck();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ExamGenius AI Backend',
      version: '1.0.0',
      database: healthCheck.database,
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced health check with database status
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({
      status: 'OK',
      message: 'ExamGenius AI Server is running optimally',
      database: 'Connected',
      environment: process.env.NODE_ENV,
      timestamp: result.rows[0].current_time,
      postgres_version: result.rows[0].pg_version.split(',')[0]
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      message: 'Server running but database connection failed',
      database: 'Disconnected',
      environment: process.env.NODE_ENV,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database unavailable'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} does not exist`,
    availableRoutes: [
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login', 
      'GET /api/tests',
      'POST /api/attempts',
      'POST /api/ai/generate-similar',
      'GET /api/admin/users'
    ]
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('=== EXAMGENIUS AI ERROR HANDLER ===');
  console.error('URL:', req.url);
  console.error('Method:', req.method);
  console.error('Error:', error.message);
  
  if (process.env.NODE_ENV === 'development') {
    console.error('Body:', req.body);
    console.error('Stack:', error.stack);
  }
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      body: req.body
    })
  });
});

const PORT = process.env.PORT || 5000;

// Enhanced startup function
async function startServer() {
  try {
    console.log('🚀 Starting ExamGenius AI Platform...');
    console.log('📍 Environment:', process.env.NODE_ENV);
    console.log('🔌 Port:', PORT);

    // Test database connection
    const result = await pool.query('SELECT NOW() as server_start_time, version() as pg_version');
    console.log('✅ Connected to PostgreSQL database');
    console.log(`🐘 PostgreSQL Version: ${result.rows[0].pg_version.split(',')[0]}`);
    console.log(`⏰ Database Time: ${result.rows[0].server_start_time}`);

    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎯 ExamGenius AI API running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🎯 Root endpoint: http://localhost:${PORT}/`);
      console.log('🤖 AI-powered features enabled');
      console.log('✅ ExamGenius AI server ready for connections');
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start ExamGenius AI server:', error.message);
    console.error('🔧 Check your DATABASE_URL and environment variables');
    if (error.message.includes('ECONNREFUSED')) {
      console.error('🔧 Database connection refused - check PostgreSQL service');
    }
    process.exit(1);
  }
}

// Graceful shutdown handlers
const shutdown = async (signal) => {
  console.log(`📝 Received ${signal}, shutting down ExamGenius AI gracefully...`);
  try {
    await pool.end();
    console.log('🔌 Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// CORS configuration - ADD cache-control to allowed headers
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    process.env.FRONTEND_URL,
    /\.onrender\.com$/
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Cache-Control',  // ✅ ADD this to fix CORS error
    'Pragma'
  ]
}));


// Start the server
const server = startServer();

module.exports = app;