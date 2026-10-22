import http from 'http';
import { server as mainServer, io, startServer } from '../server';
import { connectDB, disconnectDB } from '../config/db';

export async function ensureTestServer(): Promise<void> {
  await connectDB();

  if (mainServer.listening) {
    return;
  }

  // Check if an external server is already running on port 5001
  const isExternalListening = await new Promise<boolean>((resolve) => {
    const req = http.get('http://127.0.0.1:5001/api/v1/live', (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
  });

  if (isExternalListening) {
    return;
  }

  await startServer();
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
