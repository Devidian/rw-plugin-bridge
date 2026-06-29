import type { Request, Response } from 'express';
import { getMarketplaceOffers } from '../service/marketplace-service.js';
import { AppConfig } from '../utils/app-config.js';
import { InvalidLastChangeError, parseLastChange } from '../validator/last-change-validator.js';

const INVALID_AREA_ID_MESSAGE = 'areaId must be a positive integer';

export function ozMarketplaceOffersHandler(req: Request, res: Response): void {
  if (!AppConfig.exposeOzMarketplace) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const areaId = Number(req.query.areaId);
  if (!Number.isSafeInteger(areaId) || areaId <= 0) {
    res.status(400).json({ error: 'invalid_area_id', message: INVALID_AREA_ID_MESSAGE });
    return;
  }
  try {
    res.json(getMarketplaceOffers(areaId, parseLastChange(req.query.lastChange)));
  } catch (error) {
    if (error instanceof InvalidLastChangeError) {
      res.status(400).json({ error: 'invalid_last_change', message: error.message });
      return;
    }
    res.status(503).json({ error: 'marketplace_unavailable' });
  }
}
