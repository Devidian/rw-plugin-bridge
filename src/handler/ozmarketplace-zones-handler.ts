import type { Request, Response } from 'express';
import { getMarketplaceZones } from '../service/marketplace-service.js';
import { AppConfig } from '../utils/app-config.js';
import { InvalidLastChangeError, parseLastChange } from '../validator/last-change-validator.js';

export function ozMarketplaceZonesHandler(req: Request, res: Response): void {
  if (!AppConfig.exposeOzMarketplace) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  try {
    res.json(getMarketplaceZones(parseLastChange(req.query.lastChange)));
  } catch (error) {
    if (error instanceof InvalidLastChangeError) {
      res.status(400).json({ error: 'invalid_last_change', message: error.message });
      return;
    }
    res.status(503).json({ error: 'marketplace_unavailable' });
  }
}
