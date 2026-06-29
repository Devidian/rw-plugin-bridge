import type { Request, Response } from 'express';
import { getPlayerList } from '../service/ozadminutils-service.js';
import { AppConfig } from '../utils/app-config.js';

export function ozAdminUtilsPlayerlistHandler(_req: Request, res: Response): void {
  if (!AppConfig.exposeOzAdminUtilsPlayerlist) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  try {
    res.json(getPlayerList());
  } catch {
    res.status(503).json({ error: 'playerlist_unavailable' });
  }
}
