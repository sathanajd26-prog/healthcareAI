import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';

const JWT_SECRET = env.JWT_SECRET;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions?: string[];
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization token' },
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || !decoded.id) {
      res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED_OR_INVALID', message: 'Session expired or token invalid' },
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
      res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED_OR_INVALID', message: 'Session expired or token invalid' },
      });
      return;
    }

    // Verify session revocation against User record
    const userDoc = await User.findById(decoded.id).select('tokenVersion isVerified');
    if (!userDoc) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User account not found' },
      });
      return;
    }

    const currentTokenVersion = userDoc.tokenVersion ?? 0;
    // Check revocation: If token has tokenVersion, ensure it matches currentTokenVersion.
    // Backward compatibility: If token has no tokenVersion, it is considered revoked if user has logged out (currentTokenVersion > 0).
    if (decoded.tokenVersion !== undefined) {
      if (decoded.tokenVersion !== currentTokenVersion) {
        res.status(401).json({
          success: false,
          error: { code: 'TOKEN_REVOKED', message: 'Session has been revoked or logged out. Please sign in again.' },
        });
        return;
      }
    } else if (currentTokenVersion > 0) {
      res.status(401).json({
        success: false,
        error: { code: 'TOKEN_REVOKED', message: 'Session has been revoked or logged out. Please sign in again.' },
      });
      return;
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED_OR_INVALID', message: 'Session expired or token invalid' },
    });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to access this clinical resource' },
      });
      return;
    }
    next();
  };
};
