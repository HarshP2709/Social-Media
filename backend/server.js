/**
 * Social Media Platform - Main Server
 * Express.js backend with Supabase PostgreSQL
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const likeRoutes = require('./routes/likeRoutes');
const followRoutes = require('./routes/followRoutes');
const searchRoutes = require('./routes/searchRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Import error handlers
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow frontend assets
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ─── CORS ───────────────────────────────────────────────────────────────────
// Allow requests from the Express server itself, VS Code Live Server,
// and any origin listed in CLIENT_URL env var.
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',   // VS Code Live Server
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Session ────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// ─── Static Files ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/like', likeRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/followers', followRoutes);
app.use('/api/following', followRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Social Media Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// ─── Serve frontend pages ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('*.html', (req, res, next) => {
  const filePath = path.join(__dirname, '../frontend', req.path);
  res.sendFile(filePath, (err) => {
    if (err) next();
  });
});

// ─── Error Handling ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Social Media Platform Server Started`);
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n✅ API Endpoints:`);
  console.log(`   Auth:          /api/register | /api/login | /api/logout | /api/me`);
  console.log(`   Users:         /api/users`);
  console.log(`   Posts:         /api/posts`);
  console.log(`   Comments:      /api/comments/:postId`);
  console.log(`   Likes:         /api/like`);
  console.log(`   Follow:        /api/follow`);
  console.log(`   Search:        /api/search/users | /api/search/posts`);
  console.log(`   Notifications: /api/notifications`);
  console.log(`\n📁 Static files served from: ../frontend`);
  console.log(`\n─────────────────────────────────────────────\n`);
});

module.exports = app;
