import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Critical connection error:', error);
    if (env.NODE_ENV === 'production') {
      console.error('[MongoDB] Halting process in production due to database unavailability.');
      process.exit(1);
    }
  }
};
