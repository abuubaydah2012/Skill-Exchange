import mongoose from 'mongoose';

/**
 * Connect to MongoDB Atlas cluster using Mongoose.
 * Never hardcodes connection credentials; reads strictly from MONGODB_URI.
 */
export const connectDB = async (): Promise<typeof mongoose> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    const errorMsg = 'MONGODB_URI environment variable is not defined. Please configure it in .env or your host environment.';
    console.error(`[Database Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: process.env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    console.log(`[Database] MongoDB Atlas Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('[Database] Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Warning: Disconnected from MongoDB Atlas.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] Successfully reconnected to MongoDB Atlas.');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] Runtime connection error:', err);
});
