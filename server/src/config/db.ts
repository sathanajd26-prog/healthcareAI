import mongoose from 'mongoose';
import { env } from './env';

let isConnecting = false;

export const isDbConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

export const getDbState = (): string => {
  switch (mongoose.connection.readyState) {
    case 0:
      return 'DISCONNECTED';
    case 1:
      return 'CONNECTED';
    case 2:
      return 'CONNECTING';
    case 3:
      return 'DISCONNECTING';
    default:
      return 'UNKNOWN';
  }
};

export const connectDB = async (): Promise<boolean> => {
  if (isDbConnected()) {
    return true;
  }
  if (isConnecting) {
    return false;
  }

  isConnecting = true;
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error: any) {
    console.error(`[MongoDB] Connection error (${env.MONGODB_URI}):`, error.message);
    if (env.NODE_ENV === 'production') {
      console.error('[MongoDB] Critical error: Halting process in production due to database unavailability.');
      process.exit(1);
    }
    return false;
  } finally {
    isConnecting = false;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected cleanly.');
  }
};

// Monitor connection lifecycle
mongoose.connection.on('disconnected', () => {
  if (env.NODE_ENV !== 'test') {
    console.warn('[MongoDB] Connection lost. Reconnect will be attempted on next query.');
  }
});
