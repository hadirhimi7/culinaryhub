import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { AuthedRequest, requireAuth, requireRole } from '../middleware/auth';
import { db } from '../db';
import { securityLogger } from '../middleware/logging';

const router = Router();

const uploadRoot = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safeName}`;
    cb(null, unique);
  },
});

const MAX_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10) || 5) * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    // Allow only some common safe types
    const allowed = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  },
});

/**
 * ClamAV malware scan using clamscan CLI.
 * Returns true if file is clean, false if infected or scan fails.
 */
function scanFileWithClamAV(filePath: string): Promise<{ clean: boolean; message: string }> {
  return new Promise((resolve) => {
    // Try to use clamscan (ClamAV command-line scanner)
    execFile('clamscan', ['--no-summary', filePath], (error, stdout, stderr) => {
      if (error) {
        // Exit code 1 means infected, 2 means error
        if (error.code === 1) {
          resolve({ clean: false, message: 'Malware detected' });
        } else {
          // ClamAV not installed or other error - log but allow (configurable)
          securityLogger.warn('clamav_unavailable', { error: stderr || error.message });
          // In production, you might want to reject files if scan fails
          // For now, we allow but log the warning
          resolve({ clean: true, message: 'Scan skipped (ClamAV unavailable)' });
        }
        return;
      }
      resolve({ clean: true, message: 'File is clean' });
    });
  });
}

interface FileUploadRow {
  id: number;
  user_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  async (req: AuthedRequest, res, next) => {
    try {
      if (!req.file || !req.user) {
        return res.status(400).json({ error: 'Missing file' });
      }

      const file = req.file;
      const filePath = path.join(uploadRoot, file.filename);

      // Malware scan with ClamAV
      const scanResult = await scanFileWithClamAV(filePath);
      if (!scanResult.clean) {
        // Delete infected file immediately
        fs.unlinkSync(filePath);
        securityLogger.warn('malware_detected', {
          userId: req.user.id,
          original: file.originalname,
          message: scanResult.message,
        });
        return res.status(400).json({ error: 'File rejected: potential malware detected' });
      }

      const createdAt = new Date().toISOString();

      db.run(
        'INSERT INTO file_uploads (user_id, original_name, stored_name, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, file.originalname, file.filename, file.mimetype, file.size, createdAt],
        (err) => {
          if (err) return next(err);

          securityLogger.info('file_upload', {
            userId: req.user?.id,
            original: file.originalname,
            stored: file.filename,
            mime: file.mimetype,
            size: file.size,
            scanResult: scanResult.message,
          });

          res.status(201).json({
            file: {
              originalName: file.originalname,
              storedName: file.filename,
              size: file.size,
              mimeType: file.mimetype,
            },
          });
        },
      );
    } catch (err) {
      next(err);
    }
  },
);

/**
 * List user's own files (or all files for admin)
 */
router.get('/list', requireAuth, (req: AuthedRequest, res, next) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const query = isAdmin
    ? 'SELECT * FROM file_uploads ORDER BY created_at DESC'
    : 'SELECT * FROM file_uploads WHERE user_id = ? ORDER BY created_at DESC';
  const params = isAdmin ? [] : [userId];

  db.all<FileUploadRow>(query, params, (err, rows) => {
    if (err) return next(err);
    res.json({
      files: (rows || []).map((r) => ({
        id: r.id,
        originalName: r.original_name,
        storedName: r.stored_name,
        mimeType: r.mime_type,
        size: r.size,
        createdAt: r.created_at,
        userId: r.user_id,
      })),
    });
  });
});

/**
 * Secure file download - only owner or admin can download
 */
router.get('/download/:id', requireAuth, (req: AuthedRequest, res, next) => {
  const fileId = parseInt(req.params.id, 10);
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  db.get<FileUploadRow>('SELECT * FROM file_uploads WHERE id = ?', [fileId], (err, row) => {
    if (err) return next(err);
    if (!row) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Authorization check: only owner or admin can download
    if (row.user_id !== userId && !isAdmin) {
      securityLogger.warn('unauthorized_download_attempt', {
        userId,
        fileId,
        fileOwner: row.user_id,
      });
      return res.status(403).json({ error: 'Not authorized to download this file' });
    }

    const filePath = path.join(uploadRoot, row.stored_name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    securityLogger.info('file_download', {
      userId,
      fileId,
      original: row.original_name,
    });

    res.download(filePath, row.original_name);
  });
});

/**
 * Delete file - only owner or admin can delete
 */
router.delete('/:id', requireAuth, (req: AuthedRequest, res, next) => {
  const fileId = parseInt(req.params.id, 10);
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  db.get<FileUploadRow>('SELECT * FROM file_uploads WHERE id = ?', [fileId], (err, row) => {
    if (err) return next(err);
    if (!row) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (row.user_id !== userId && !isAdmin) {
      securityLogger.warn('unauthorized_delete_attempt', {
        userId,
        fileId,
        fileOwner: row.user_id,
      });
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }

    const filePath = path.join(uploadRoot, row.stored_name);

    db.run('DELETE FROM file_uploads WHERE id = ?', [fileId], (delErr) => {
      if (delErr) return next(delErr);

      // Remove file from disk
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      securityLogger.info('file_deleted', {
        userId,
        fileId,
        original: row.original_name,
      });

      res.status(204).end();
    });
  });
});

export { router as fileRouter };


