import express from 'express';
import { pluginRouter } from './router/plugin-router.js';
import { defaultLogger } from './utils/logger.js';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.once('finish', () => {
      defaultLogger.debug('HTTP request completed:', {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'rw-plugin-bridge' });
  });

  app.use('/plugins', pluginRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}
