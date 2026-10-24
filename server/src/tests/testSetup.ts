import http from 'http';
import { server as mainServer, io, startServer } from '../server';
import { connectDB, disconnectDB } from '../config/db';

export const TEST_PORT = parseInt(process.env.PORT || process.env.TEST_PORT || '5002', 10);
export const TEST_API_BASE = process.env.API_BASE_URL || `http://127.0.0.1:${TEST_PORT}/api/v1`;
export const TEST_WS_BASE = process.env.WS_BASE_URL || `http://127.0.0.1:${TEST_PORT}`;

export async function ensureTestServer(): Promise<void> {
  await connectDB();

  if (mainServer.listening) {
    return;
  }

  // Check if an isolated test server is already running on the dedicated test port
  const isExternalListening = await new Promise<boolean>((resolve) => {
    const req = http.get(`http://127.0.0.1:${TEST_PORT}/api/v1/live`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
  });

  if (isExternalListening) {
    return;
  }

  await startServer(TEST_PORT);
}

export async function closeTestServer(): Promise<void> {
  try {
    if (io) {
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
      });
    }
  } catch (e) {
    // ignore
  }

  try {
    if (mainServer.listening) {
      if (typeof (mainServer as any).closeAllConnections === 'function') {
        (mainServer as any).closeAllConnections();
      }
      await new Promise<void>((resolve) => {
        mainServer.close(() => resolve());
      });
    }
  } catch (e) {
    // ignore
  }

  await disconnectDB();
}
