import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';

async function start() {
  try {
    await prisma.$connect();
    const PORT = Number(process.env.PORT || env.port || 5000);
    app.listen(PORT, () => {
      console.log(`AXON PRIME backend listening on ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
