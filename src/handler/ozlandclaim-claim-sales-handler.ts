import type { Request, Response } from 'express';
import { getClaimSaleListings } from '../service/land-claim-service.js';
import { AppConfig } from '../utils/app-config.js';
import { InvalidLastChangeError, parseLastChange } from '../validator/last-change-validator.js';

export function ozLandClaimClaimSalesHandler(req: Request, res: Response): void {
  if (!AppConfig.exposeOzLandClaim) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  try {
    res.json(getClaimSaleListings(parseLastChange(req.query.lastChange)));
  } catch (error) {
    if (error instanceof InvalidLastChangeError) {
      res.status(400).json({ error: 'invalid_last_change', message: error.message });
      return;
    }
    res.status(503).json({ error: 'landclaim_unavailable' });
  }
}
