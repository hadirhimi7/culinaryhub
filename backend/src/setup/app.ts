import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';
import { authRouter } from '../routes/auth';
import { adminRouter } from '../routes/admin';
import { fileRouter } from '../routes/files';
import { postsRouter } from '../routes/posts';
import { errorHandler } from '../middleware/errorHandler';
import { securityLogger, requestLogger } from '../middleware/logging';
import { initDb } from '../db';

const ONE_HOUR_MS = 1000 * 60 * 60;

export function createServer() {
  const app = express();
  
  // Trust proxy in production (for HTTPS behind Nginx/Cloudflare)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Initialize database schema
  initDb();

  // Basic security hardening
  app.use(helmet());

  const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.use(
    cors({
      origin: frontendOrigin,
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Session configuration
  const sessionSecret = process.env.SESSION_SECRET || 'change_me_session_secret';
  app.use(
    session({
      name: 'sid',
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ONE_HOUR_MS,
      },
    }),
  );

  // Rate limiting for basic DoS protection
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // CSRF protection (uses session + cookies)
  const csrfProtection = csrf({
    cookie: false,
  });

  // Attach CSRF token route for frontend
  app.get('/api/csrf-token', (req, res) => {
    // Initialize CSRF for this request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csrfReq: any = req;
    if (!csrfReq.csrfToken) {
      csrfProtection(req, res, () => {
        res.json({ csrfToken: csrfReq.csrfToken() });
      });
      return;
    }
    res.json({ csrfToken: csrfReq.csrfToken() });
  });

  // Apply request logging after basic middleware
  app.use(requestLogger);

  // API routes
  app.use('/api/auth', csrfProtection, authRouter);
  app.use('/api/admin', csrfProtection, adminRouter);
  app.use('/api/files', csrfProtection, fileRouter);
  app.use('/api/posts', csrfProtection, postsRouter);

  // Static serving for uploaded files is intentionally avoided.
  // Files are served via authenticated download endpoints only.

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Error handling and security logging
  app.use(errorHandler);

  // Example of logging server start
  securityLogger.info('Server initialized', {
    event: 'server_init',
    timestamp: new Date().toISOString(),
  });

  return app;
}


