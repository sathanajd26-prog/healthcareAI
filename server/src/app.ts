import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/api';
import { env } from './config/env';
import path from 'path';
import fs from 'fs';

const app = express();

// Trust proxy for reverse proxy SSL & IP rate limiting
app.set('trust proxy', 1);

// Resolve trusted CORS origins list
export const trustedOrigins: string[] = Array.isArray(env.CORS_ORIGIN) ? env.CORS_ORIGIN : [env.CORS_ORIGIN];

export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (e.g. mobile native clients, curl, server-to-server, same-origin)
  if (!origin) return true;
  return trustedOrigins.includes(origin);
};

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      // Rejects untrusted origin by returning false (does NOT reflect untrusted origin in Access-Control-Allow-Origin header)
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours preflight cache
};

// Hardened Security & Transport Headers (Phase 2 Requirement 8 + CSP Hardening)
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
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        mediaSrc: ["'self'", 'blob:', 'data:'],
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          ...trustedOrigins,
        ],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
  })
);

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}


// Versioned API Routes
app.use('/api/v1', apiRoutes);

// Static client assets and Single-Page Application (SPA) wildcard serving
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // Wildcard SPA fallback: all non-API GET requests serve the React frontend index.html
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    if (fs.existsSync(indexHtmlPath)) {
      return res.sendFile(indexHtmlPath);
    }
    return next();
  });
} else {
  // Fallback API root when client build is not present
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Healthcare Super-App Core API',
      status: 'ONLINE',
      version: '1.0.0',
      documentation: '/api/v1/health',
    });
  });
}

// 404 Route Handler for unmatched API endpoints
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
  const status = typeof err.status === 'number' && err.status >= 400 && err.status <= 599 ? err.status : 500;
  const currentEnv = process.env.NODE_ENV || env.NODE_ENV;
  const isProd = currentEnv === 'production';
  const isDev = currentEnv === 'development';

  // Operational errors: intentional client-facing errors (4xx status or explicit isOperational flag)
  const isOperational = err.isOperational === true || (status >= 400 && status < 500);

  // Safe server-side diagnostic logging without leaking request payloads or auth credentials
  console.error('[Unhandled Error]', {
    method: req.method,
    path: req.path,
    status,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message,
    ...(isDev ? { stack: err.stack } : {}),
  });

  const safeMessage =
    isProd && !isOperational
      ? 'An unexpected clinical service error occurred. Please try again later.'
      : err.message || 'An unexpected clinical service error occurred. Please try again.';

  const safeCode =
    isProd && !isOperational && !err.code
      ? 'INTERNAL_SERVER_ERROR'
      : err.code || 'INTERNAL_SERVER_ERROR';

  res.status(status).json({
    success: false,
    error: {
      code: safeCode,
      message: safeMessage,
      details: isDev ? err.stack : undefined,
    },
  });
});

export default app;
