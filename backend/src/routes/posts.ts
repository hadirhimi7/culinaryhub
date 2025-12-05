import { Router } from 'express';
import { z } from 'zod';
import { AuthedRequest, requireAuth, requireRole } from '../middleware/auth';
import { db } from '../db';
import { securityLogger } from '../middleware/logging';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();

// Setup upload directory for post images
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'posts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for post images
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp' , ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Forbidden words list - posts cannot contain these words
const FORBIDDEN_WORDS = ['security'];

function containsForbiddenWords(text: string): { hasForbidden: boolean; word?: string } {
  const lowerText = text.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasForbidden: true, word };
    }
  }
  return { hasForbidden: false };
}

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  nationality: z.string().max(100).optional(),
});

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  nationality: z.string().max(100).optional(),
});

interface PostRow {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  nationality: string | null;
  author_id: number;
  author_name: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Serve post images - MUST be before parameterized routes
 */
router.get('/image/:filename', (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = path.join(uploadDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

/**
 * GET /api/posts/pending - Get pending posts (admin only)
 * MUST be before /:id route
 */
router.get('/pending', requireAuth, requireRole(['admin']), (req: AuthedRequest, res, next) => {
  db.all<PostRow>('SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC', ['pending'], (err, rows) => {
    if (err) return next(err);
    res.json({
      posts: (rows || []).map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        imageUrl: p.image_url,
        nationality: p.nationality,
        authorId: p.author_id,
        authorName: p.author_name,
        status: p.status,
        approvedBy: p.approved_by,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    });
  });
});

/**
 * GET /api/posts - List posts
 * - Regular users see only approved posts
 * - Editors and admins see all posts
 */
router.get('/', requireAuth, (req: AuthedRequest, res, next) => {
  const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'editor';
  
  const query = isPrivileged
    ? 'SELECT * FROM posts ORDER BY created_at DESC'
    : 'SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC';
  const params = isPrivileged ? [] : ['approved'];

  db.all<PostRow>(query, params, (err, rows) => {
    if (err) return next(err);
    res.json({
      posts: (rows || []).map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        imageUrl: p.image_url,
        nationality: p.nationality,
        authorId: p.author_id,
        authorName: p.author_name,
        status: p.status,
        approvedBy: p.approved_by,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    });
  });
});

/**
 * GET /api/posts/:id - Get single post
 */
router.get('/:id', requireAuth, (req: AuthedRequest, res, next) => {
  const postId = parseInt(req.params.id, 10);
  const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'editor';

  db.get<PostRow>('SELECT * FROM posts WHERE id = ?', [postId], (err, row) => {
    if (err) return next(err);
    if (!row) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Regular users can only see approved posts
    if (!isPrivileged && row.status !== 'approved') {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({
      post: {
        id: row.id,
        title: row.title,
        content: row.content,
        imageUrl: row.image_url,
        nationality: row.nationality,
        authorId: row.author_id,
        authorName: row.author_name,
        status: row.status,
        approvedBy: row.approved_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  });
});

/**
 * POST /api/posts - Create new post with optional image
 * ALL authenticated users can create posts
 * Admin posts are auto-approved, others need approval
 */
router.post(
  '/',
  requireAuth,
  upload.single('image'),
  (req: AuthedRequest, res, next) => {
    try {
      const { title, content, nationality } = createPostSchema.parse(req.body);

      // Check for forbidden words in title
      const titleCheck = containsForbiddenWords(title);
      if (titleCheck.hasForbidden) {
        // Delete uploaded file if validation fails
        if (req.file) fs.unlinkSync(req.file.path);
        securityLogger.warn('forbidden_word_attempt', {
          userId: req.user?.id,
          field: 'title',
          word: titleCheck.word,
        });
        return res.status(400).json({
          error: `The word "${titleCheck.word}" is not allowed in the title`,
        });
      }

      // Check for forbidden words in content
      const contentCheck = containsForbiddenWords(content);
      if (contentCheck.hasForbidden) {
        if (req.file) fs.unlinkSync(req.file.path);
        securityLogger.warn('forbidden_word_attempt', {
          userId: req.user?.id,
          field: 'content',
          word: contentCheck.word,
        });
        return res.status(400).json({
          error: `The word "${contentCheck.word}" is not allowed in the content`,
        });
      }

      const now = new Date().toISOString();
      const user = req.user!;
      
      // Admin posts are auto-approved, all others need approval
      const status = user.role === 'admin' ? 'approved' : 'pending';
      const approvedBy = user.role === 'admin' ? user.id : null;
      
      // Get image URL if uploaded
      const imageUrl = req.file ? `/api/posts/image/${req.file.filename}` : null;

      db.run(
        'INSERT INTO posts (title, content, image_url, nationality, author_id, author_name, status, approved_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, content, imageUrl, nationality || null, user.id, user.name, status, approvedBy, now, now],
        function (err) {
          if (err) {
            if (req.file) fs.unlinkSync(req.file.path);
            return next(err);
          }

          const newId = this.lastID;
          securityLogger.info('post_created', {
            postId: newId,
            authorId: user.id,
            authorName: user.name,
            title,
            status,
            hasImage: !!req.file,
            description: `${user.name} created post "${title}"${status === 'pending' ? ' (pending approval)' : ''}`,
          });

          res.status(201).json({
            post: {
              id: newId,
              title,
              content,
              imageUrl,
              nationality: nationality || null,
              authorId: user.id,
              authorName: user.name,
              status,
              approvedBy,
              createdAt: now,
              updatedAt: now,
            },
          });
        }
      );
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid payload', details: err.errors });
      }
      next(err);
    }
  }
);

/**
 * PUT /api/posts/:id/approve - Approve a post (admin only)
 */
router.put(
  '/:id/approve',
  requireAuth,
  requireRole(['admin']),
  (req: AuthedRequest, res, next) => {
    const postId = parseInt(req.params.id, 10);

    db.get<PostRow>('SELECT * FROM posts WHERE id = ?', [postId], (err, existing) => {
      if (err) return next(err);
      if (!existing) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const now = new Date().toISOString();

      db.run(
        'UPDATE posts SET status = ?, approved_by = ?, updated_at = ? WHERE id = ?',
        ['approved', req.user!.id, now, postId],
        (updateErr) => {
          if (updateErr) return next(updateErr);

          securityLogger.info('post_approved', {
            postId,
            approvedBy: req.user?.id,
            approvedByName: req.user?.name,
            postTitle: existing.title,
            postAuthor: existing.author_name,
            description: `${req.user?.name} approved post "${existing.title}" by ${existing.author_name}`,
          });

          res.json({
            post: {
              id: postId,
              title: existing.title,
              content: existing.content,
              imageUrl: existing.image_url,
              nationality: existing.nationality,
              authorId: existing.author_id,
              authorName: existing.author_name,
              status: 'approved',
              approvedBy: req.user!.id,
              createdAt: existing.created_at,
              updatedAt: now,
            },
          });
        }
      );
    });
  }
);

/**
 * PUT /api/posts/:id/reject - Reject a post (admin only)
 */
router.put(
  '/:id/reject',
  requireAuth,
  requireRole(['admin']),
  (req: AuthedRequest, res, next) => {
    const postId = parseInt(req.params.id, 10);

    db.get<PostRow>('SELECT * FROM posts WHERE id = ?', [postId], (err, existing) => {
      if (err) return next(err);
      if (!existing) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const now = new Date().toISOString();

      db.run(
        'UPDATE posts SET status = ?, updated_at = ? WHERE id = ?',
        ['rejected', now, postId],
        (updateErr) => {
          if (updateErr) return next(updateErr);

          securityLogger.info('post_rejected', {
            postId,
            rejectedBy: req.user?.id,
            rejectedByName: req.user?.name,
            postTitle: existing.title,
            postAuthor: existing.author_name,
            description: `${req.user?.name} rejected post "${existing.title}" by ${existing.author_name}`,
          });

          res.json({ success: true });
        }
      );
    });
  }
);

/**
 * PUT /api/posts/:id - Update post (editors and admins only)
 */
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin', 'editor']),
  (req: AuthedRequest, res, next) => {
    try {
      const postId = parseInt(req.params.id, 10);
      const updates = updatePostSchema.parse(req.body);

      if (!updates.title && !updates.content && !updates.nationality) {
        return res.status(400).json({ error: 'Nothing to update' });
      }

      // Check for forbidden words
      if (updates.title) {
        const titleCheck = containsForbiddenWords(updates.title);
        if (titleCheck.hasForbidden) {
          securityLogger.warn('forbidden_word_attempt', {
            userId: req.user?.id,
            field: 'title',
            word: titleCheck.word,
            postId,
          });
          return res.status(400).json({
            error: `The word "${titleCheck.word}" is not allowed in the title`,
          });
        }
      }

      if (updates.content) {
        const contentCheck = containsForbiddenWords(updates.content);
        if (contentCheck.hasForbidden) {
          securityLogger.warn('forbidden_word_attempt', {
            userId: req.user?.id,
            field: 'content',
            word: contentCheck.word,
            postId,
          });
          return res.status(400).json({
            error: `The word "${contentCheck.word}" is not allowed in the content`,
          });
        }
      }

      db.get<PostRow>('SELECT * FROM posts WHERE id = ?', [postId], (err, existing) => {
        if (err) return next(err);
        if (!existing) {
          return res.status(404).json({ error: 'Post not found' });
        }

        const newTitle = updates.title || existing.title;
        const newContent = updates.content || existing.content;
        const newNationality = updates.nationality !== undefined ? updates.nationality : existing.nationality;
        const now = new Date().toISOString();

        db.run(
          'UPDATE posts SET title = ?, content = ?, nationality = ?, updated_at = ? WHERE id = ?',
          [newTitle, newContent, newNationality, now, postId],
          (updateErr) => {
            if (updateErr) return next(updateErr);

            securityLogger.info('post_updated', {
              postId,
              updatedBy: req.user?.id,
              updatedByName: req.user?.name,
              postTitle: newTitle,
              description: `${req.user?.name} updated post "${newTitle}"`,
            });

            res.json({
              post: {
                id: postId,
                title: newTitle,
                content: newContent,
                imageUrl: existing.image_url,
                nationality: newNationality,
                authorId: existing.author_id,
                authorName: existing.author_name,
                status: existing.status,
                approvedBy: existing.approved_by,
                createdAt: existing.created_at,
                updatedAt: now,
              },
            });
          }
        );
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      next(err);
    }
  }
);

/**
 * DELETE /api/posts/:id - Delete post
 * - Users can only delete their own posts
 * - Admins can delete any post
 */
router.delete(
  '/:id',
  requireAuth,
  (req: AuthedRequest, res, next) => {
    const postId = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    db.get<PostRow>('SELECT * FROM posts WHERE id = ?', [postId], (err, existing) => {
      if (err) return next(err);
      if (!existing) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check ownership: only author or admin can delete
      if (existing.author_id !== userId && !isAdmin) {
        securityLogger.warn('unauthorized_post_delete_attempt', {
          userId,
          postId,
          postAuthor: existing.author_id,
        });
        return res.status(403).json({ error: 'You can only delete your own posts' });
      }

      // Delete associated image if exists
      if (existing.image_url) {
        const filename = existing.image_url.split('/').pop();
        if (filename) {
          const filePath = path.join(uploadDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }

      db.run('DELETE FROM posts WHERE id = ?', [postId], (delErr) => {
        if (delErr) return next(delErr);

        securityLogger.info('post_deleted', {
          postId,
          deletedBy: userId,
          deletedByName: req.user?.name,
          title: existing.title,
          authorName: existing.author_name,
          description: `${req.user?.name} deleted post "${existing.title}"${existing.author_id !== userId ? ` (by ${existing.author_name})` : ''}`,
        });

        res.status(204).end();
      });
    });
  }
);

export { router as postsRouter };
