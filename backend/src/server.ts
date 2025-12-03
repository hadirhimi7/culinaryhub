import { createServer } from './setup/app';
import { initDb, db } from './db';
import bcrypt from 'bcryptjs';

// Initialize database tables
initDb();

// Auto-seed if no users exist (for fresh deployments)
async function autoSeed() {
  return new Promise<void>((resolve) => {
    db.get('SELECT COUNT(*) as count FROM users', async (err, row: { count: number } | undefined) => {
      if (err || !row || row.count === 0) {
        console.log('🌱 Auto-seeding database with sample users...');
        const users = [
          { name: 'Admin User', email: 'admin@example.com', password: 'Admin123!', role: 'admin' },
          { name: 'Editor User', email: 'editor@example.com', password: 'Editor123!', role: 'editor' },
          { name: 'Regular User', email: 'user@example.com', password: 'User123!', role: 'user' },
        ];
        
        for (const user of users) {
          const hash = await bcrypt.hash(user.password, 12);
          const now = new Date().toISOString();
          db.run(
            'INSERT OR IGNORE INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
            [user.name, user.email.toLowerCase(), hash, user.role, now]
          );
        }
        console.log('✅ Sample users created');
      }
      resolve();
    });
  });
}

const app = createServer();
const port = process.env.PORT || 4000;

autoSeed().then(() => {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`\n🚀 Backend server listening on port ${port}`);
    console.log(`📍 API: http://localhost:${port}/api`);
    console.log(`❤️  Health: http://localhost:${port}/health\n`);
  });
});


