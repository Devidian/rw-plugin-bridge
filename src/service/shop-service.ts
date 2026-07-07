import Database from 'better-sqlite3';
import path from 'node:path';
import type { OzShopZonesResponse } from '../dto/ozshop-zones-response.js';
import type { MapShopZone } from '../interfaces/map-layer.js';
import { AppConfig } from '../utils/app-config.js';
import { logSqliteError, openReadonlySqliteDatabase } from '../utils/sqlite.js';
import { getWorldName } from './server-config-service.js';

interface ShopZoneRow {
  area_id: unknown;
  area_name: unknown;
  created_by: unknown;
  created_at: unknown;
  system_shop: unknown;
  system_offers_file: unknown;
}

export class ShopSourceUnavailableError extends Error {}

export function getShopZones(lastChange?: number): OzShopZonesResponse {
  const database = openShopDatabase();
  try {
    if (
      !tableHasColumns(database, 'shop_zones', [
        'area_id',
        'area_name',
        'created_by',
        'created_at',
        'system_shop',
        'system_offers_file',
      ])
    ) {
      throw new ShopSourceUnavailableError('shop_zones missing required columns');
    }
    const rows = database.prepare(`
      SELECT area_id, area_name, created_by, created_at, system_shop, system_offers_file
      FROM shop_zones
      WHERE area_id > 0 AND created_at > ?
      ORDER BY area_name COLLATE NOCASE ASC, area_id ASC
    `).all(lastChange ?? -1) as ShopZoneRow[];
    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      zones: rows.flatMap(mapZoneRow),
    };
  } catch (error) {
    logSqliteError('Shop', error);
    throw error;
  } finally {
    database.close();
  }
}

function openShopDatabase(): Database.Database {
  const databasePath = shopDatabasePath();
  return openReadonlySqliteDatabase(databasePath, ShopSourceUnavailableError, 'Shop');
}

function shopDatabasePath(rootPath: string = AppConfig.serverRoot): string {
  return path.join(rootPath, 'Plugins', 'OZShop', `${getWorldName(rootPath)}.db`);
}

function mapZoneRow(row: ShopZoneRow): MapShopZone[] {
  if (
    !Number.isSafeInteger(row.area_id) ||
    typeof row.area_name !== 'string' ||
    typeof row.created_by !== 'string' ||
    !Number.isSafeInteger(row.created_at) ||
    !Number.isSafeInteger(row.system_shop) ||
    typeof row.system_offers_file !== 'string' ||
    (row.created_at as number) <= 0
  ) {
    return [];
  }
  return [{
    areaId: row.area_id as number,
    areaName: row.area_name,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at as number).toISOString(),
    systemShop: row.system_shop as number,
    systemOffersFile: row.system_offers_file,
  }];
}

function tableHasColumns(
  database: Database.Database,
  table: string,
  columns: string[],
): boolean {
  const actual = new Set(
    (database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
      .map((column) => column.name),
  );
  return columns.every((column) => actual.has(column));
}
