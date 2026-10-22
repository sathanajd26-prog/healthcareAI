import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/api';
import { env } from './config/env';

const app = express();

// Trust proxy for reverse proxy SSL & IP rate limiting
app.set('trust proxy', 1);

// Hardened Security & Transport Headers (Phase 2 Requirement 8)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    strictTransportSecurity:
      env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    hidePoweredBy: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Versioned API Routes
app.use('/api/v1', apiRoutes);

// Health check root
app.get('/', (req, res) => {
  res.json({
    name: 'Healthcare Super-App Core API',
    status: 'ONLINE',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.url} does not exist on this healthcare gateway.`,
    },
  });
});

// Standard Centralized Error Handler (Section 61 Compliance)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected clinical service error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
});

export default app;
