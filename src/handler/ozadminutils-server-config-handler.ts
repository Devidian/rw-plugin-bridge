import type { Request, Response } from 'express';
import { getMaskedServerConfig } from '../service/ozadminutils-service.js';
import { AppConfig } from '../utils/app-config.js';

export function ozAdminUtilsServerConfigHandler(_req: Request, res: Response): void {
  if (!AppConfig.exposeOzAdminUtilsServerConfig) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  try {
    res.json(getMaskedServerConfig());
  } catch {
    res.status(503).json({ error: 'server_config_unavailable' });
  }
}
