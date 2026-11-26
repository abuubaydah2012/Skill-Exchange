import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// 1. CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (CLIENT_URL === '*' || CLIENT_URL.split(',').map((u) => u.trim()).includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, can restrict in strict prod
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Global API rate limiting
app.use('/api', apiLimiter);

// 4. Health & diagnostic check endpoint
app.get('/api/health', (_req, res) => {
  const dbStateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'UP' : 'DATABASE_NOT_READY',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: dbStateMap[dbState] || 'unknown',
      readyState: dbState,
      name: mongoose.connection.name || 'none',
    },
    version: '1.0.0',
  });
});

// 5. REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/certificates', certificateRoutes);

// 6. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// 7. Establish database connection and start HTTP server
const startServer = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    } else {
      console.warn('[Server Warning] MONGODB_URI is not set. Database operations will fail until configured.');
    }

    app.listen(PORT, () => {
      console.log(`[Server] Skill Exchange API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
      console.log(`[Server] Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Server Fatal] Could not connect to database on startup:', error);
    // Still start server so /api/health can report status, but database calls will indicate failure
    app.listen(PORT, () => {
      console.log(`[Server] Running in degraded mode (Database offline) on port ${PORT}`);
    });
  }
};

startServer();

export default app;
