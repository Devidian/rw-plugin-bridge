import type { Request, Response } from 'express';
import { AppConfig } from '../utils/app-config.js';
import { InvalidLastChangeError, parseLastChange } from '../validator/last-change-validator.js';
import { getWorldAreas } from '../service/world-area-service.js';

export function ozAdminUtilsWorldAreasHandler(req: Request, res: Response): void {
  if (!AppConfig.exposeOzAdminUtilsWorldAreas) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  try {
    res.json(getWorldAreas(parseLastChange(req.query.lastChange)));
  } catch (error) {
    if (error instanceof InvalidLastChangeError) {
      res.status(400).json({ error: 'invalid_last_change', message: error.message });
      return;
    }
    res.status(503).json({ error: 'world_areas_unavailable', message: (error as Error).toString() });
  }
}
