import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { connectDB } from './config/db';
import { Doctor } from './models/Doctor';
import { seedDatabase } from './seed/seedData';
import { env } from './config/env';

const PORT = env.PORT;

const server = http.createServer(app);

// Initialize Socket.io for Real-time Telemedicine Signaling & Secure Chat
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Connected: ${socket.id}`);

  // Join Telemedicine Encounter Room
  socket.on('join-room', ({ roomId, userId, userName, role }) => {
    socket.join(roomId);
    console.log(`[Telehealth] User ${userName} (${role}) joined ${roomId}`);
    socket.to(roomId).emit('user-joined', { userId, userName, role });
  });

  // WebRTC Signal Forwarding
  socket.on('signal', ({ roomId, signalData }) => {
    socket.to(roomId).emit('signal', signalData);
  });

  // Secure In-Call Chat Message
  socket.on('send-message', ({ roomId, message, senderName, role, timestamp }) => {
    io.to(roomId).emit('receive-message', {
      id: Math.random().toString(36).substring(2, 9),
      message,
      senderName,
      role,
      timestamp: timestamp || new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  await connectDB();

  // Auto-seed if doctors collection is empty
  const docCount = await Doctor.countDocuments();
  if (docCount === 0) {
    console.log('[Bootstrap] No doctors detected. Running initial seed...');
    await seedDatabase();
  }

  server.listen(PORT, () => {
    console.log(`
======================================================
  HEALTHCARE SUPER-APP BACKEND SERVICE ONLINE
  HTTP Gateway : http://localhost:${PORT}
  Socket.IO    : ws://localhost:${PORT}
  Health Check : http://localhost:${PORT}/api/v1/health
======================================================
    `);
  });
};

startServer();
