import { createServer } from './setup/app';
import { initDb } from './db';

// Initialize database tables
initDb();

const app = createServer();
const port = process.env.PORT || 4000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`\n🚀 Backend server listening on port ${port}`);
  console.log(`📍 API: http://localhost:${port}/api`);
  console.log(`❤️  Health: http://localhost:${port}/health\n`);
});


