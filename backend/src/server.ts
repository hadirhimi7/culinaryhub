import { createServer } from './setup/app';
import { initDb, db } from './db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Save hashed password to file
function saveHashedPassword(email: string, passwordHash: string): void {
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const filePath = path.join(logsDir, 'hashed_passwords.txt');
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] Email: ${email} | Hash: ${passwordHash}\n`;
  fs.appendFileSync(filePath, entry);
}

// Auto-seed if no users exist (for fresh deployments)
async function autoSeed(): Promise<void> {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM users', async (err, row: { count: number } | undefined) => {
      if (err) {
        console.error('Error checking users:', err);
        resolve();
        return;
      }
      
      if (!row || row.count === 0) {
        console.log('🌱 Auto-seeding database with sample users...');
        const users = [
          { name: 'Admin User', email: 'admin@example.com', password: 'Admin123!', role: 'admin' },
          { name: 'Editor User', email: 'editor@example.com', password: 'Editor123!', role: 'editor' },
          { name: 'Regular User', email: 'user@example.com', password: 'User123!', role: 'user' },
        ];
        
        for (const user of users) {
          const hash = await bcrypt.hash(user.password, 12);
          const now = new Date().toISOString();
          
          // Save hashed password to file
          saveHashedPassword(user.email.toLowerCase(), hash);
          
          db.run(
            'INSERT OR IGNORE INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
            [user.name, user.email.toLowerCase(), hash, user.role, now],
            (insertErr) => {
              if (insertErr) {
                console.error(`Error inserting user ${user.email}:`, insertErr);
              }
            }
          );
        }
        console.log('✅ Sample users created:');
        console.log('   - admin@example.com / Admin123!');
        console.log('   - editor@example.com / Editor123!');
        console.log('   - user@example.com / User123!');
      } else {
        console.log(`📊 Database has ${row.count} existing user(s)`);
      }
      resolve();
    });
  });
}

async function startServer() {
  try {
    // Initialize database tables first
    await initDb();
    
    // Then seed if needed
    await autoSeed();
    
    // Create Express app (this also calls initDb but it's idempotent)
    const app = createServer();
    const port = process.env.PORT || 4000;
    
    app.listen(port, () => {
      console.log(`\n🚀 Backend server listening on port ${port}`);
      console.log(`📍 API: http://localhost:${port}/api`);
      console.log(`❤️  Health: http://localhost:${port}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
