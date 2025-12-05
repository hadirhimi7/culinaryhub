import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createUser, findUserByEmail, findUserById, createOtpCode, verifyOtpCode } from '../db';
import { securityLogger } from '../middleware/logging';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Save hashed password to file
function saveHashedPassword(email: string, passwordHash: string): void {
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const filePath = path.join(logsDir, 'hashed_passwords.txt');
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] Email: ${email} | Hash: ${passwordHash}\n`;
  fs.appendFileSync(filePath, entry);
}

const router = Router();

// Generate 6-digit OTP
function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const otpVerifySchema = z.object({
  userId: z.number(),
  otp: z.string().length(6),
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const role: 'admin' | 'editor' | 'user' = 'user';

    // Save hashed password to file
    saveHashedPassword(email.toLowerCase(), passwordHash);

    const user = await createUser(name, email.toLowerCase(), passwordHash, role);

    // For regular users, require OTP verification
    if (user.role === 'user') {
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
      await createOtpCode(user.id, otp, expiresAt);
      
      securityLogger.info('otp_generated', {
        userId: user.id,
        email: user.email,
        action: 'register',
      });

      // In a real app, send OTP via email/SMS
      // For demo, we return it in response (REMOVE IN PRODUCTION)
      return res.status(201).json({
        requiresOtp: true,
        userId: user.id,
        message: 'Please verify OTP to complete registration',
        // DEMO ONLY - remove in production
        demoOtp: otp,
      });
    }

    // Admin/Editor don't need OTP
    (req.session as any).userId = user.id;
    req.session.regenerate((err) => {
      if (err) return next(err);
      (req.session as any).userId = user.id;
      securityLogger.info('user_register', {
        email: user.email,
        userId: user.id,
        name: user.name,
        description: `${user.name} registered a new account`,
      });
      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(email.toLowerCase());
    if (!user) {
      securityLogger.warn('login_failed', { email, reason: 'user_not_found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      securityLogger.warn('login_failed', { email, reason: 'bad_password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Regular users need OTP verification
    if (user.role === 'user') {
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
      await createOtpCode(user.id, otp, expiresAt);
      
      securityLogger.info('otp_generated', {
        userId: user.id,
        email: user.email,
        action: 'login',
      });

      // In a real app, send OTP via email/SMS
      // For demo, we return it in response (REMOVE IN PRODUCTION)
      return res.json({
        requiresOtp: true,
        userId: user.id,
        message: 'Please enter OTP sent to your email',
        // DEMO ONLY - remove in production
        demoOtp: otp,
      });
    }

    // Admin/Editor login directly
    req.session.regenerate((err) => {
      if (err) return next(err);
      (req.session as any).userId = user.id;
      (req.session as any).lastActivity = Date.now();
      securityLogger.info('login_success', { 
        userId: user.id, 
        email: user.email,
        name: user.name,
        description: `${user.name} logged in`,
      });
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    next(err);
  }
});

// OTP verification endpoint
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { userId, otp } = otpVerifySchema.parse(req.body);
    
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await verifyOtpCode(userId, otp);
    if (!valid) {
      securityLogger.warn('otp_failed', { userId, reason: 'invalid_or_expired' });
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      (req.session as any).userId = user.id;
      (req.session as any).lastActivity = Date.now();
      securityLogger.info('otp_verified', { 
        userId: user.id, 
        email: user.email,
        name: user.name,
        description: `${user.name} verified OTP and logged in`,
      });
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    next(err);
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { userId } = z.object({ userId: z.number() }).parse(req.body);
    
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'user') {
      return res.status(400).json({ error: 'OTP not required for this user' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await createOtpCode(user.id, otp, expiresAt);
    
    securityLogger.info('otp_resent', { userId: user.id, email: user.email });

    res.json({
      message: 'New OTP sent',
      // DEMO ONLY - remove in production
      demoOtp: otp,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  const userId = (req.session as any).userId;
  let userName = 'Unknown';
  if (userId) {
    const user = await findUserById(userId);
    if (user) userName = user.name;
  }
  req.session.destroy((err) => {
    if (err) return next(err);
    securityLogger.info('logout', { 
      userId,
      userName,
      description: `${userName} logged out`,
    });
    res.clearCookie('sid');
    res.status(204).end();
  });
});

router.get('/me', async (req, res, next) => {
  try {
    const userId = (req.session as any).userId as number | undefined;
    if (!userId) {
      return res.json({ user: null });
    }
    
    // Update last activity
    (req.session as any).lastActivity = Date.now();
    
    const user = await findUserById(userId);
    if (!user) {
      return res.json({ user: null });
    }
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Activity heartbeat endpoint for AFK tracking
router.post('/heartbeat', (req, res) => {
  const userId = (req.session as any).userId;
  if (userId) {
    (req.session as any).lastActivity = Date.now();
    res.json({ active: true });
  } else {
    res.status(401).json({ active: false });
  }
});

// Check if session is still valid (not AFK)
router.get('/check-activity', (req, res) => {
  const userId = (req.session as any).userId;
  const lastActivity = (req.session as any).lastActivity;
  
  if (!userId) {
    return res.json({ active: false, reason: 'not_logged_in' });
  }
  
  const AFK_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes
  const now = Date.now();
  
  if (lastActivity && (now - lastActivity) > AFK_TIMEOUT_MS) {
    // Session expired due to inactivity
    req.session.destroy(() => {
      res.clearCookie('sid');
      res.json({ active: false, reason: 'afk_timeout' });
    });
  } else {
    res.json({ active: true });
  }
});

export { router as authRouter };
