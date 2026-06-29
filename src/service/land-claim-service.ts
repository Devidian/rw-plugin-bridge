import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { OzLandClaimClaimSalesResponse } from '../dto/ozlandclaim-claim-sales-response.js';
import type { MapClaimSaleListing } from '../interfaces/map-layer.js';
import { AppConfig } from '../utils/app-config.js';
import { getWorldName } from './server-config-service.js';

interface ClaimSaleListingRow {
  id: unknown;
  world: unknown;
  area_id: unknown;
  owner_uuid: unknown;
  owner_dbid: unknown;
  price: unknown;
  listed_at: unknown;
  status: unknown;
}

export class LandClaimSourceUnavailableError extends Error {}

export function getClaimSaleListings(lastChange?: number): OzLandClaimClaimSalesResponse {
  const worldName = getWorldName(AppConfig.serverRoot);
  const database = openLandClaimDatabase();
  try {
    if (
      !tableHasColumns(database, 'claimSaleListings', [
        'id',
        'world',
        'area_id',
        'owner_uuid',
        'owner_dbid',
        'price',
        'listed_at',
        'status',
      ])
    ) {
      throw new LandClaimSourceUnavailableError('claimSaleListings missing required columns');
    }
    const rows = database.prepare(`
      SELECT id, world, area_id, owner_uuid, owner_dbid, price, listed_at, status
      FROM claimSaleListings
      WHERE world = ? AND status = 'ACTIVE' AND listed_at > ?
      ORDER BY listed_at DESC, id DESC
    `).all(worldName, lastChange ?? -1) as ClaimSaleListingRow[];
    return {
      schemaVersion: 1,
      worldName,
      generatedAt: new Date().toISOString(),
      listings: rows.flatMap(mapListingRow),
    };
  } finally {
    database.close();
  }
}

function openLandClaimDatabase(): Database.Database {
  const databasePath = landClaimDatabasePath();
  if (!existsSync(databasePath)) {
    throw new LandClaimSourceUnavailableError(`LandClaim database not found at ${databasePath}`);
  }
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  database.pragma(`busy_timeout = ${AppConfig.sqliteBusyTimeoutMs}`);
  return database;
}

function landClaimDatabasePath(rootPath: string = AppConfig.serverRoot): string {
  return path.join(rootPath, 'Plugins', 'OZLandClaim', `${getWorldName(rootPath)}.db`);
}

function mapListingRow(row: ClaimSaleListingRow): MapClaimSaleListing[] {
  if (
    !Number.isSafeInteger(row.id) ||
    typeof row.world !== 'string' ||
    !Number.isSafeInteger(row.area_id) ||
    typeof row.owner_uuid !== 'string' ||
    !Number.isSafeInteger(row.owner_dbid) ||
    !Number.isSafeInteger(row.price) ||
    !Number.isSafeInteger(row.listed_at) ||
    row.status !== 'ACTIVE' ||
    (row.listed_at as number) <= 0
  ) {
    return [];
  }
  return [{
    id: row.id as number,
    world: row.world,
    areaId: row.area_id as number,
    ownerUuid: row.owner_uuid,
    ownerDbId: row.owner_dbid as number,
    price: row.price as number,
    listedAt: new Date(row.listed_at as number).toISOString(),
    status: 'ACTIVE',
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
