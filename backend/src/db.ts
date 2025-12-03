import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

sqlite3.verbose();

const dbFile = process.env.DB_FILE || path.join(__dirname, '..', '..', 'data', 'database.sqlite');

const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbFile);

export function initDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('📦 Initializing database tables...');
    db.serialize(() => {
      // Users table
      db.run(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TEXT NOT NULL
        )`,
      );

      // File uploads table
      db.run(
        `CREATE TABLE IF NOT EXISTS file_uploads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          original_name TEXT NOT NULL,
          stored_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
      );

      // Recipe posts table
      db.run(
        `CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          image_url TEXT,
          nationality TEXT,
          author_id INTEGER NOT NULL,
          author_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          approved_by INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (author_id) REFERENCES users(id),
          FOREIGN KEY (approved_by) REFERENCES users(id)
        )`,
      );

      // OTP table for user login verification
      db.run(
        `CREATE TABLE IF NOT EXISTS otp_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          code TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          used INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
      );

      // Sessions table for activity tracking - final table, resolve when done
      db.run(
        `CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_id TEXT NOT NULL,
          last_activity TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        (err) => {
          if (err) {
            console.error('❌ Database initialization error:', err);
            reject(err);
          } else {
            console.log('✅ Database tables initialized');
            resolve();
          }
        }
      );
    });
  });
}

export interface DbUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'editor' | 'user';
  created_at: string;
}

export interface OtpCode {
  id: number;
  user_id: number;
  code: string;
  expires_at: string;
  used: number;
  created_at: string;
}

export function findUserByEmail(email: string): Promise<DbUser | undefined> {
  return new Promise((resolve, reject) => {
    db.get<DbUser>('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) return reject(err);
      resolve(row || undefined);
    });
  });
}

export function findUserById(id: number): Promise<DbUser | undefined> {
  return new Promise((resolve, reject) => {
    db.get<DbUser>('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || undefined);
    });
  });
}

export function createUser(
  name: string,
  email: string,
  password_hash: string,
  role: 'admin' | 'editor' | 'user' = 'user',
): Promise<DbUser> {
  const createdAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [name, email, password_hash, role, createdAt],
      function cb(err) {
        if (err) return reject(err);
        const newId = this.lastID as number;
        findUserById(newId)
          .then((user) => {
            if (!user) return reject(new Error('Failed to fetch newly created user'));
            resolve(user);
          })
          .catch(reject);
      },
    );
  });
}

// OTP functions
export function createOtpCode(userId: number, code: string, expiresAt: string): Promise<number> {
  const createdAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    // First invalidate any existing OTPs for this user
    db.run('UPDATE otp_codes SET used = 1 WHERE user_id = ? AND used = 0', [userId], (err) => {
      if (err) return reject(err);
      
      db.run(
        'INSERT INTO otp_codes (user_id, code, expires_at, created_at) VALUES (?, ?, ?, ?)',
        [userId, code, expiresAt, createdAt],
        function (insertErr) {
          if (insertErr) return reject(insertErr);
          resolve(this.lastID);
        }
      );
    });
  });
}

export function verifyOtpCode(userId: number, code: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.get<OtpCode>(
      'SELECT * FROM otp_codes WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > ?',
      [userId, code, now],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(false);
        
        // Mark as used
        db.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [row.id], (updateErr) => {
          if (updateErr) return reject(updateErr);
          resolve(true);
        });
      }
    );
  });
}

// Session activity tracking
export function updateSessionActivity(userId: number, sessionId: string): Promise<void> {
  const now = new Date().toISOString();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_sessions (user_id, session_id, last_activity, created_at) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET last_activity = ?`,
      [userId, sessionId, now, now, now],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}
