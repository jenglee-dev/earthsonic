import { buildServer } from './app.js';

const PORT = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
const HOST = process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');

async function start() {
  const app = await buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`[EarthSonic API Server] Listening on http://${HOST}:${PORT}/api/v1`);
  } catch (err) {
    console.error('[EarthSonic API Server] Failed to start:', err);
    process.exit(1);
  }
}

start();
