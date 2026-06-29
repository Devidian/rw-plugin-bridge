import type { Request, Response } from 'express';
import { getPluginList } from '../service/ozadminutils-service.js';
import { AppConfig } from '../utils/app-config.js';

export async function ozAdminUtilsPluginsHandler(_req: Request, res: Response): Promise<void> {
  if (!AppConfig.exposeOzAdminUtilsPlugins) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  try {
    res.json(await getPluginList());
  } catch {
    res.status(503).json({ error: 'plugin_inventory_unavailable' });
  }
}
