import { Router } from 'express';
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth';
import { db } from '../db';
import { securityLogger } from '../middleware/logging';
import fs from 'fs';
import path from 'path';

const router = Router();

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

router.get(
  '/status',
  requireAuth,
  requireRole(['admin']),
  (req: AuthedRequest, res) => {
    res.json({
      ok: true,
      user: req.user,
    });
  },
);

// Get all users (admin only)
router.get(
  '/users',
  requireAuth,
  requireRole(['admin']),
  (req: AuthedRequest, res, next) => {
    db.all<UserRow>(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC',
      (err, rows) => {
        if (err) return next(err);
        res.json({
          users: (rows || []).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.created_at,
          })),
        });
      }
    );
  }
);

// Delete a user (admin only) - cannot delete self or other admins
router.delete(
  '/users/:id',
  requireAuth,
  requireRole(['admin']),
  (req: AuthedRequest, res, next) => {
    const targetUserId = parseInt(req.params.id, 10);
    const adminId = req.user!.id;

    // Cannot delete yourself
    if (targetUserId === adminId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists and get their info
    db.get<UserRow>('SELECT * FROM users WHERE id = ?', [targetUserId], (err, user) => {
      if (err) return next(err);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Cannot delete other admins
      if (user.role === 'admin') {
        return res.status(403).json({ error: 'Cannot delete admin users' });
      }

      // Delete user's posts first
      db.run('DELETE FROM posts WHERE author_id = ?', [targetUserId], (postsErr) => {
        if (postsErr) return next(postsErr);

        // Delete user's files
        db.run('DELETE FROM file_uploads WHERE user_id = ?', [targetUserId], (filesErr) => {
          if (filesErr) return next(filesErr);

          // Delete user's OTP codes
          db.run('DELETE FROM otp_codes WHERE user_id = ?', [targetUserId], (otpErr) => {
            if (otpErr) return next(otpErr);

            // Finally delete the user
            db.run('DELETE FROM users WHERE id = ?', [targetUserId], (deleteErr) => {
              if (deleteErr) return next(deleteErr);

              securityLogger.info('user_deleted', {
                action: 'user_deleted',
                deletedUserId: targetUserId,
                deletedUserEmail: user.email,
                deletedUserName: user.name,
                deletedBy: adminId,
                deletedByName: req.user!.name,
                description: `Admin "${req.user!.name}" deleted user "${user.name}" (${user.email})`,
              });

              res.json({ success: true, message: `User ${user.name} has been deleted` });
            });
          });
        });
      });
    });
  }
);

// Get recent security logs (admin only) - formatted for display
router.get(
  '/logs',
  requireAuth,
  requireRole(['admin']),
  (req: AuthedRequest, res) => {
    try {
      const logFile = path.join(__dirname, '..', '..', 'logs', 'security.log');
      
      if (!fs.existsSync(logFile)) {
        return res.json({ logs: [] });
      }

      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.trim().split('\n').slice(-100); // Last 100 entries
      
      const logs = lines
        .map((line) => {
          try {
            const parsed = JSON.parse(line);
            // Format the log entry for better display
            return formatLogEntry(parsed);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .reverse(); // Most recent first

      res.json({ logs });
    } catch (err) {
      res.json({ logs: [] });
    }
  }
);

// Helper to format log entries for human-readable display
function formatLogEntry(log: Record<string, unknown>): {
  timestamp: string;
  level: string;
  message: string;
  description: string;
  type: string;
} {
  const timestamp = (log.timestamp as string) || new Date().toISOString();
  const level = (log.level as string) || 'info';
  const message = (log.message as string) || '';
  
  let description = '';
  let type = 'system';

  // If there's a description field in the log, use that first (more readable)
  if (log.description) {
    description = log.description as string;
  }

  // Format based on message type
  switch (message) {
    case 'login_success':
      description = description || `User "${log.email}" logged in successfully`;
      type = 'auth';
      break;
    case 'login_failed':
      description = description || `Failed login attempt for "${log.email}" (${log.reason})`;
      type = 'security';
      break;
    case 'user_register':
      description = description || `New user registered: "${log.name || log.email}"`;
      type = 'auth';
      break;
    case 'logout':
      description = description || `User "${log.userName || log.userId}" logged out`;
      type = 'auth';
      break;
    case 'otp_generated':
      description = description || `OTP sent to "${log.email}" for ${log.action}`;
      type = 'auth';
      break;
    case 'otp_verified':
      description = description || `OTP verified for "${log.email}"`;
      type = 'auth';
      break;
    case 'otp_failed':
      description = description || `OTP verification failed for user ID ${log.userId}`;
      type = 'security';
      break;
    case 'post_created':
      description = description || `${log.authorName || 'User'} created post "${log.title}"`;
      type = 'content';
      break;
    case 'post_approved':
      description = description || `${log.approvedByName || 'Admin'} approved post "${log.postTitle}"`;
      type = 'moderation';
      break;
    case 'post_rejected':
      description = description || `${log.rejectedByName || 'Admin'} rejected post "${log.postTitle}"`;
      type = 'moderation';
      break;
    case 'post_deleted':
      description = description || `${log.deletedByName || 'User'} deleted post "${log.title}"`;
      type = 'content';
      break;
    case 'post_updated':
      description = description || `${log.updatedByName || 'User'} updated post "${log.postTitle}"`;
      type = 'content';
      break;
    case 'forbidden_word_attempt':
      description = description || `Blocked word "${log.word}" attempted in ${log.field} by user ID ${log.userId}`;
      type = 'security';
      break;
    case 'user_deleted':
      description = description || `Admin deleted a user`;
      type = 'admin';
      break;
    case 'file_upload_success':
      description = description || `File "${log.original}" uploaded`;
      type = 'content';
      break;
    case 'file_deleted':
      description = description || `File deleted`;
      type = 'content';
      break;
    case 'unauthorized_post_delete_attempt':
      description = description || `Unauthorized delete attempt on post ID ${log.postId} by user ID ${log.userId}`;
      type = 'security';
      break;
    case 'http_request':
      // Skip HTTP request logs in the UI
      return null as unknown as ReturnType<typeof formatLogEntry>;
    case 'server_error':
      description = description || `Server error: ${(log.stack as string)?.split('\n')[0] || 'Unknown error'}`;
      type = 'error';
      break;
    default:
      if (!description) {
        description = message || JSON.stringify(log);
      }
      type = level === 'error' ? 'error' : 'system';
  }

  return { timestamp, level, message, description, type };
}

export { router as adminRouter };
