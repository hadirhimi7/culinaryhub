/**
 * Database Seed Script
 * Creates sample users with different roles for testing.
 * 
 * Run with: npx ts-node src/seed.ts
 */

import bcrypt from 'bcryptjs';
import { db, initDb } from './db';
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

const SAMPLE_USERS = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    name: 'Editor User',
    email: 'editor@example.com',
    password: 'Editor123!',
    role: 'editor',
  },
  {
    name: 'Regular User',
    email: 'user@example.com',
    password: 'User123!',
    role: 'user',
  },
];

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Initialize DB tables
  initDb();

  // Wait a moment for tables to be created
  await new Promise((resolve) => setTimeout(resolve, 500));

  for (const user of SAMPLE_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const createdAt = new Date().toISOString();

    // Save hashed password to file
    saveHashedPassword(user.email.toLowerCase(), passwordHash);

    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`,
        [user.name, user.email.toLowerCase(), passwordHash, user.role, createdAt],
        (err) => {
          if (err) {
            console.error(`❌ Failed to create ${user.email}:`, err.message);
            reject(err);
          } else {
            console.log(`✅ Created: ${user.email} (role: ${user.role})`);
            resolve();
          }
        }
      );
    });
  }

  console.log('\n📋 Sample Users Created:');
  console.log('┌─────────────────────────┬─────────────┬────────────┐');
  console.log('│ Email                   │ Password    │ Role       │');
  console.log('├─────────────────────────┼─────────────┼────────────┤');
  for (const user of SAMPLE_USERS) {
    const email = user.email.padEnd(23);
    const pass = user.password.padEnd(11);
    const role = user.role.padEnd(10);
    console.log(`│ ${email} │ ${pass} │ ${role} │`);
  }
  console.log('└─────────────────────────┴─────────────┴────────────┘');

  console.log('\n✨ Seeding complete! You can now log in with these accounts.\n');

  db.close();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

