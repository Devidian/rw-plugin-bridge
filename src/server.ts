import express from 'express';
import { pluginRouter } from './router/plugin-router.js';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'rw-plugin-bridge' });
  });

  app.use('/plugins', pluginRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}
