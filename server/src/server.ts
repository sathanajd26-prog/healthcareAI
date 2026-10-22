import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from './app';
import { connectDB, isDbConnected, disconnectDB } from './config/db';
import { Doctor } from './models/Doctor';
import { User } from './models/User';
import { Patient } from './models/Patient';
import { Appointment } from './models/Appointment';
import { seedDatabase } from './seed/seedData';
import { env } from './config/env';

const PORT = env.PORT;

const server = http.createServer(app);

// Initialize Socket.io with strict CORS and Secure Authentication Middleware
const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io Authentication Middleware: Reject unauthenticated connections
io.use(async (socket, next) => {
  try {
    const rawToken =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!rawToken) {
      return next(new Error('AUTHENTICATION_REQUIRED: Valid Bearer token required to connect to clinical WebSocket'));
    }

    const decoded = jwt.verify(rawToken, env.JWT_SECRET) as any;
    if (!decoded || !decoded.id) {
      return next(new Error('INVALID_TOKEN: Invalid clinical session token'));
    }

    const userDoc = await User.findById(decoded.id);
    if (!userDoc) {
      return next(new Error('USER_NOT_FOUND: User record does not exist'));
    }

    socket.data.user = {
      id: userDoc._id.toString(),
      fullName: userDoc.fullName,
      role: userDoc.role,
      permissions: userDoc.permissions || [],
    };

    next();
  } catch (err: any) {
    return next(new Error('AUTHENTICATION_FAILED: ' + (err.message || 'Token verification failed')));
  }
});

io.on('connection', (socket) => {
  const authUser = socket.data.user;
  console.log(`[Socket.io] Authenticated user connected: ${authUser.fullName} (${authUser.role}) [socket: ${socket.id}]`);

  // Join Telemedicine Encounter Room with Strict Clinical Authorization Guard
  socket.on('join-room', async ({ roomId }, callback) => {
    const ack = typeof callback === 'function' ? callback : () => {};

    if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
      const errorMsg = 'A valid roomId is required.';
      socket.emit('error', { code: 'INVALID_ROOM_ID', message: errorMsg });
      return ack({ success: false, error: 'INVALID_ROOM_ID', message: errorMsg });
    }

    const cleanRoomId = roomId.trim();

    try {
      // Resolve appointment by ObjectId or telemedicineRoomId
      let appointment: any = null;
      if (mongoose.Types.ObjectId.isValid(cleanRoomId)) {
        appointment = await Appointment.findById(cleanRoomId);
      }
      if (!appointment) {
        appointment = await Appointment.findOne({ telemedicineRoomId: cleanRoomId });
      }

      let authorized = false;

      if (appointment) {
        if (authUser.role === 'SUPER_ADMIN' || authUser.role === 'HOSPITAL_ADMIN') {
          authorized = true;
        } else if (authUser.role === 'PATIENT') {
          const patient = await Patient.findOne({ userId: authUser.id });
          if (patient && appointment.patientId.toString() === patient._id.toString()) {
            authorized = true;
          }
        } else if (authUser.role === 'DOCTOR') {
          let doctor = await Doctor.findOne({ userId: authUser.id });
          if (!doctor) {
            doctor = await Doctor.findById(authUser.id);
          }
          if (doctor && appointment.doctorId.toString() === doctor._id.toString()) {
            authorized = true;
          }
        }
      } else {
        // Rooms not associated with an existing appointment require administrative privileges
        if (authUser.role === 'SUPER_ADMIN' || authUser.role === 'HOSPITAL_ADMIN') {
          authorized = true;
        }
      }

      if (!authorized) {
        const forbiddenMsg = 'Unauthorized: You are not a designated participant in this clinical encounter.';
        socket.emit('error', { code: 'FORBIDDEN_ROOM_ACCESS', message: forbiddenMsg });
        return ack({ success: false, error: 'FORBIDDEN_ROOM_ACCESS', message: forbiddenMsg });
      }

      socket.join(cleanRoomId);
      console.log(`[Telehealth] Authenticated ${authUser.fullName} (${authUser.role}) authorized and joined ${cleanRoomId}`);

      // Broadcast verified participant info (server-authoritative identity)
      socket.to(cleanRoomId).emit('user-joined', {
        userId: authUser.id,
        userName: authUser.fullName,
        role: authUser.role,
      });

      return ack({
        success: true,
        roomId: cleanRoomId,
        userName: authUser.fullName,
        role: authUser.role,
      });
    } catch (err: any) {
      console.error('[Telehealth] Room authorization error:', err);
      const errorMsg = 'Server error validating clinical room access.';
      socket.emit('error', { code: 'SERVER_ERROR', message: errorMsg });
      return ack({ success: false, error: 'SERVER_ERROR', message: errorMsg });
    }
  });

  // WebRTC Signal Forwarding with Room Guard
  socket.on('signal', ({ roomId, signalData }, callback) => {
    const ack = typeof callback === 'function' ? callback : () => {};

    if (!roomId || !socket.rooms.has(roomId)) {
      const errorMsg = 'Cannot forward signal: You are not an authorized member of this consultation room.';
      socket.emit('error', { code: 'NOT_IN_ROOM', message: errorMsg });
      return ack({ success: false, error: 'NOT_IN_ROOM', message: errorMsg });
    }

    socket.to(roomId).emit('signal', {
      senderId: authUser.id,
      signalData,
    });
    return ack({ success: true });
  });

  // Secure In-Call Chat Message (Spoofing-Proof: identity taken from verified session)
  socket.on('send-message', ({ roomId, message }, callback) => {
    const ack = typeof callback === 'function' ? callback : () => {};

    if (!roomId || !socket.rooms.has(roomId)) {
      const errorMsg = 'Cannot send message: You are not an authorized member of this consultation room.';
      socket.emit('error', { code: 'NOT_IN_ROOM', message: errorMsg });
      return ack({ success: false, error: 'NOT_IN_ROOM', message: errorMsg });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return ack({ success: false, error: 'EMPTY_MESSAGE' });
    }

    const payload = {
      id: Math.random().toString(36).substring(2, 9),
      message: message.trim(),
      senderName: authUser.fullName, // Server-enforced, prevents client name spoofing
      role: authUser.role,           // Server-enforced, prevents client role spoofing
      senderId: authUser.id,
      timestamp: new Date().toISOString(),
    };

    io.to(roomId).emit('receive-message', payload);
    return ack({ success: true, data: payload });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Disconnected: ${socket.id}`);
  });
});

export const startServer = async (): Promise<http.Server> => {
  if (server.listening) {
    return server;
  }

  const connected = await connectDB();

  if (connected && isDbConnected()) {
    try {
      // Auto-seed if doctors collection is empty
      const docCount = await Doctor.countDocuments();
      if (docCount === 0) {
        console.log('[Bootstrap] No doctors detected. Running initial seed...');
        await seedDatabase();
      }
    } catch (seedErr: any) {
      console.warn('[Bootstrap] Auto-seed check skipped or deferred:', seedErr.message);
    }
  } else {
    console.warn('[Bootstrap] Warning: Starting server without active database connection. Database features will be degraded until connection is established.');
  }

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`
======================================================
  HEALTHCARE SUPER-APP BACKEND SERVICE ONLINE
  HTTP Gateway : http://localhost:${PORT}
  Socket.IO    : ws://localhost:${PORT}
  Health Check : http://localhost:${PORT}/api/v1/health
  Readiness    : http://localhost:${PORT}/api/v1/ready
  Liveness     : http://localhost:${PORT}/api/v1/live
======================================================
      `);
      resolve(server);
    });
  });
};

// Graceful termination handling
const shutdown = async (signal: string) => {
  console.log(`[Process] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await disconnectDB();
    console.log('[Process] Server and database closed cleanly. Exiting.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

export { server, io };
