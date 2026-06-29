import type { Request, Response } from 'express';
import { getGpsMarkers } from '../service/gps-marker-service.js';
import { AppConfig } from '../utils/app-config.js';
import { InvalidLastChangeError, parseLastChange } from '../validator/last-change-validator.js';

export function ozGpsMarkerHandler(req: Request, res: Response): void {
  if (!AppConfig.exposeOzGpsMarkers) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    res.json(getGpsMarkers(type, parseLastChange(req.query.lastChange)));
  } catch (error) {
    if (error instanceof InvalidLastChangeError) {
      res.status(400).json({ error: 'invalid_last_change', message: error.message });
      return;
    }
    res.status(503).json({ error: 'gps_markers_unavailable' });
  }
}
