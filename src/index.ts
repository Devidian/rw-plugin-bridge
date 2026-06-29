import { createServer } from 'node:http';
import { createApp } from './server.js';
import { AppConfig } from './utils/app-config.js';
import { defaultLogger } from './utils/logger.js';

const app = createApp();

createServer(app).listen(AppConfig.port, AppConfig.host, () => {
  defaultLogger.info(`RW plugin bridge listening on http://${AppConfig.host}:${AppConfig.port}`);
});
