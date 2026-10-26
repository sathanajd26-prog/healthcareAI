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

export const getSafeDbDiagnosticInfo = (uri: string): { protocol: string; host: string; database?: string } => {
  try {
    const match = uri.match(/^(mongodb(?:\+srv)?):\/\/(?:[^@/]+@)?([^/?#]+)(?:\/([^?#]*))?/i);
    if (match) {
      return {
        protocol: match[1],
        host: match[2],
        database: match[3] || undefined,
      };
    }
  } catch {
    // ignore parse error and fall through
  }
  return { protocol: 'mongodb', host: '[REDACTED_HOST]' };
};

export const sanitizeMongoUri = (uri: string): string => {
  if (!uri || typeof uri !== 'string') return '[REDACTED_URI]';
  return uri.replace(/\/\/(?:[^:]+:[^@]+@|[^@]+@)/g, '//***:***@');
};

/**
 * Production Indexing Strategy:
 * In production (NODE_ENV=production), autoIndex is disabled to prevent
 * collection locking and latency spikes during application startup.
 *
 * Required indexes defined in Mongoose schemas (e.g. User.phone, Doctor.specialization,
 * Appointment.telemedicineRoomId, OtpRecord TTL) should be verified and maintained
 * during deployment migrations or administrative maintenance via syncDatabaseIndexes().
 */
export const getMongooseConnectOptions = (nodeEnv: string = env.NODE_ENV): mongoose.ConnectOptions => {
  return {
    autoIndex: nodeEnv !== 'production',
    serverSelectionTimeoutMS: 5000,
  };
};

export const syncDatabaseIndexes = async (): Promise<void> => {
  if (!isDbConnected()) {
    throw new Error('Cannot sync indexes: Database is not connected.');
  }
  const models = mongoose.modelNames();
  for (const modelName of models) {
    await mongoose.model(modelName).syncIndexes();
  }
  console.log(`[MongoDB] Indexes synchronized successfully across ${models.length} models.`);
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
    const conn = await mongoose.connect(env.MONGODB_URI, getMongooseConnectOptions(env.NODE_ENV));

    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error: any) {
    const diag = getSafeDbDiagnosticInfo(env.MONGODB_URI);
    const safeTarget = `${diag.protocol}://${diag.host}${diag.database ? '/' + diag.database : ''}`;
    const rawMsg = error?.message || 'Database connection error';
    const safeErrorMessage = rawMsg.replace(/\/\/[^:]+:[^@]+@/g, '//***:***@');
    console.error(`[MongoDB] Connection failed to ${safeTarget}:`, safeErrorMessage);
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
