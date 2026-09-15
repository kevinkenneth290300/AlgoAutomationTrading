import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiRouter } from './server/apiRouter.ts';
import { appConfig } from './server/config/appConfig.ts';
import { DatabaseInitializer } from './server/database/dbInit.ts';
import { RedisInitializer } from './server/queue/redisInit.ts';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = appConfig.port || 3000;

  // Initialize infrastructure services with self-configuration
  await DatabaseInitializer.initialize();
  await RedisInitializer.initialize();

  // JSON request body parser
  app.use(express.json());

  // Mount API router
  app.use('/api/v1', createApiRouter());
  app.use('/api', createApiRouter());

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Alpha Quant Platform] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[Safety Guard] Application initialized in RESEARCH mode with LIVE_TRADING_ENABLED=${appConfig.liveTradingEnabled}`);
    if (appConfig.risk.isDevelopmentDefault) {
      console.log(`[Safety Guard] SAFE DEVELOPMENT DEFAULTS ACTIVE (Max leverage: 1x, Max daily loss: $${appConfig.risk.maxDailyLoss})`);
    }
  });
}

startServer().catch((err) => {
  console.error('[Alpha Quant Platform] Failed to start server:', err);
  process.exit(1);
});
