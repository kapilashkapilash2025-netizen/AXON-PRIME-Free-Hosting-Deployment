import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';

async function start() {
  try {
    await prisma.$connect();
    app.listen(env.port, () => {
      console.log(`AXON PRIME backend listening on ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
