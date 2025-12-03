import { Request, Response, NextFunction } from 'express';
import { findUserById } from '../db';
import { securityLogger } from './logging';

export interface AuthedRequest extends Request {
  user?: {
    id: number;
    role: 'admin' | 'editor' | 'user';
    name: string;
    email: string;
  };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const sessionUserId = (req.session as any).userId as number | undefined;

  if (!sessionUserId) {
    // Log unauthorized access attempt
    securityLogger.warn('unauthorized_access_attempt', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      reason: 'no_session',
    });
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const dbUser = await findUserById(sessionUserId);
    if (!dbUser) {
      securityLogger.warn('unauthorized_access_attempt', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        sessionUserId,
        reason: 'user_not_found',
      });
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: dbUser.id,
      role: dbUser.role,
      name: dbUser.name,
      email: dbUser.email,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(roles: Array<'admin' | 'editor' | 'user'>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      securityLogger.warn('unauthorized_access_attempt', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        reason: 'no_user_in_request',
      });
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      // Log forbidden access attempt (wrong role)
      securityLogger.warn('forbidden_access_attempt', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        reason: 'insufficient_role',
      });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}


