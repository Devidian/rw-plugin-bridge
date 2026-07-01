import type { Request, Response } from 'express';
import { getMapData } from '../service/ozadminutils-service.js';
import { AppConfig } from '../utils/app-config.js';
import { InvalidLastChangeError, parseLastChange } from '../validator/last-change-validator.js';

const MAX_PAGE_LIMIT = 5000;

export function ozAdminUtilsMapHandler(req: Request, res: Response): void {
  if (!AppConfig.exposeOzAdminUtilsMap) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  try {
    res.json(getMapData({
      lastChange: parseLastChange(req.query.lastChange),
      limit: parsePositiveInteger(req.query.limit, MAX_PAGE_LIMIT),
      offset: parseNonNegativeInteger(req.query.offset),
    }));
  } catch (error) {
    if (error instanceof InvalidLastChangeError) {
      res.status(400).json({ error: 'invalid_last_change', message: error.message });
      return;
    }
    res.status(503).json({ error: 'map_source_unavailable' });
  }
}

function parsePositiveInteger(value: unknown, maximum: number): number | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) throw new InvalidLastChangeError();
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new InvalidLastChangeError();
  }
  return parsed;
}

function parseNonNegativeInteger(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) throw new InvalidLastChangeError();
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) throw new InvalidLastChangeError();
  return parsed;
}
