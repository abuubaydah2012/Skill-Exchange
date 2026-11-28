import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { initSocket } from './socket.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import classRoutes from './routes/classRoutes.js';
import { ensureDefaultCategoriesAndMigrateSkills } from './utils/categorySeed.js';
import { ClassSession } from './models/ClassSession.js';
import { User } from './models/User.js';
import { Skill } from './models/Skill.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// 1. CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    const defaultAllowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ];
    const envAllowed = CLIENT_URL === '*' ? ['*'] : CLIENT_URL.split(',').map((u) => u.trim());
    const allowed = [...defaultAllowed, ...envAllowed];
    if (allowed.includes('*') || allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev to guarantee local connectivity
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 1.1 Initialize Socket.IO with matching CORS and transport configuration
initSocket(httpServer, corsOptions);

// 2. Request parsing middleware: 35mb safely accommodates 10MB PDF + 5MB image + certificate base64 payloads
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

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
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/classes', classRoutes);

// 6. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export const ensureDefaultDemoAccounts = async () => {
  try {
    let learner = await User.findOne({ email: 'learner@skillexchange.io' });
    if (!learner) {
      learner = await User.create({
        name: 'Elena Rostova',
        email: 'learner@skillexchange.io',
        password: 'password123',
        role: 'learner',
        avatarBgColor: '#0284c7',
        headline: 'Junior Product Designer & Language Enthusiast',
        bio: 'Passionate UX apprentice eager to level up my front-end React skills. In exchange, I teach conversational Russian and wireframing.',
        location: 'Berlin, Germany',
        languages: ['English', 'Russian', 'German'],
        learningInterests: ['React & TypeScript', 'Node.js Backend', 'Acoustic Guitar'],
        phoneNumber: '+49 152 984102',
        isProfileVerified: true,
        accountVerificationStatus: 'Verified',
        rating: 4.9,
        reviewCount: 14,
      });
      console.log('[Seed] Ensured default demo learner: Elena Rostova (learner@skillexchange.io)');
    }

    let teacher = await User.findOne({ email: 'teacher@skillexchange.io' });
    if (!teacher) {
      teacher = await User.create({
        name: 'Marcus Vance',
        email: 'teacher@skillexchange.io',
        password: 'password123',
        role: 'teacher',
        avatarBgColor: '#059669',
        headline: 'Senior Full-Stack Architect & Engineering Mentor',
        bio: '10+ years architecting web applications with React, TypeScript, and distributed Node systems.',
        location: 'Austin, TX, USA',
        languages: ['English', 'Spanish'],
        learningInterests: ['Conversational Russian', 'Jazz Guitar'],
        phoneNumber: '+1 512 809 3421',
        isProfileVerified: true,
        accountVerificationStatus: 'Verified',
        rating: 4.95,
        reviewCount: 38,
        totalEarnings: 4250,
      });
      console.log('[Seed] Ensured default demo teacher: Marcus Vance (teacher@skillexchange.io)');
    }

    let admin = await User.findOne({ email: 'admin@skillexchange.io' });
    if (!admin) {
      admin = await User.create({
        name: 'Sarah Jenkins',
        email: 'admin@skillexchange.io',
        password: 'password123',
        role: 'admin',
        avatarBgColor: '#7c3aed',
        headline: 'Platform Moderator & Community Quality Lead',
        bio: 'Overseeing member verifications, dispute resolutions, and trust & safety.',
        location: 'London, UK',
        languages: ['English', 'French'],
        isProfileVerified: true,
        accountVerificationStatus: 'Verified',
      });
      console.log('[Seed] Ensured default demo admin: Sarah Jenkins (admin@skillexchange.io)');
    }

    // Ensure teacher skills exist
    if (teacher) {
      const existingTeacherSkill = await Skill.findOne({ userId: teacher._id });
      if (!existingTeacherSkill) {
        await Skill.create({
          userId: teacher._id,
          name: 'React & TypeScript Architecture',
          category: 'Development',
          description: 'Component architecture, custom hooks, state machines, and type safety.',
          proficiency: 'Expert',
          skillType: 'Teaching',
          yearsExperience: 9,
          freeSwapAvailable: true,
          paidLessonAvailable: true,
          hourlyPrice: 65,
          availabilitySchedule: 'Mon-Thu 17:00 - 21:00 CST',
          verificationStatus: 'Verified',
        });
        console.log('[Seed] Ensured default skill for Marcus Vance: React & TypeScript Architecture');
      }

      // Ensure initial public workshops exist (with empty enrolledUserIds so new students start with 0 enrollments)
      const existingClassCount = await ClassSession.countDocuments();
      if (existingClassCount === 0) {
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
        await ClassSession.insertMany([
          {
            teacherId: teacher._id,
            teacherName: teacher.name,
            title: 'TypeScript Generics & Advanced Utility Types Workshop',
            skillName: 'React & TypeScript Architecture',
            category: 'Technology & Programming',
            description: 'Deep dive into conditional types, mapped types, and strict API contracts in TypeScript.',
            dateTime: nextWeek,
            durationMinutes: 90,
            capacity: 20,
            enrolledUserIds: [],
            isFree: true,
            price: 0,
            format: 'Interactive Workshop',
            meetingLink: 'https://meet.skillexchange.io/room/ts-generics',
            status: 'Scheduled',
          },
          {
            teacherId: teacher._id,
            teacherName: teacher.name,
            title: 'Building Your First Machine Learning Classifier',
            skillName: 'Machine Learning',
            category: 'Technology & Programming',
            description: 'Hands-on workshop covering data preprocessing, model training, and evaluation metrics.',
            dateTime: inTenDays,
            durationMinutes: 75,
            capacity: 15,
            enrolledUserIds: [],
            isFree: false,
            price: 25,
            format: 'Practice Lab',
            meetingLink: 'https://meet.skillexchange.io/room/ml-classifier',
            status: 'Scheduled',
          },
        ]);
      }
    }
  } catch (err) {
    console.warn('[Seed Warning] Could not ensure default demo accounts:', err);
  }
};

// 7. Establish database connection and start HTTP server
const startServer = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
      await ensureDefaultCategoriesAndMigrateSkills();
      await ensureDefaultDemoAccounts();
    } else {
      console.warn('[Server Warning] MONGODB_URI is not set. Database operations will fail until configured.');
    }

    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`[Server] Skill Exchange API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
      console.log(`[Server] Health check available at: http://localhost:${PORT}/api/health`);
      console.log(`[Server] Socket.IO real-time server ready`);
    });
  } catch (error) {
    console.error('[Server Fatal] Could not connect to database on startup:', error);
    // Still start server so /api/health can report status, but database calls will indicate failure
    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`[Server] Running in degraded mode (Database offline) on port ${PORT}`);
    });
  }
};

startServer();

export { app, httpServer };
export default app;
