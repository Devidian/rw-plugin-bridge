import Database from 'better-sqlite3';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { OzLandClaimClaimSalesResponse } from '../dto/ozlandclaim-claim-sales-response.js';
import type {
  OzLandClaimRenewZoneDto,
  OzLandClaimRenewZonesResponse,
} from '../dto/ozlandclaim-renew-zones-response.js';
import type { MapClaimSaleListing } from '../interfaces/map-layer.js';
import { AppConfig } from '../utils/app-config.js';
import { logSqliteError, openReadonlySqliteDatabase } from '../utils/sqlite.js';
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

interface RenewZoneRow {
  world: unknown;
  area_id: unknown;
  interval_hours: unknown;
  last_reset_at: unknown;
  updated_at: unknown;
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
  } catch (error) {
    logSqliteError('LandClaim', error);
    throw error;
  } finally {
    database.close();
  }
}

export function getRenewZones(lastChange?: number): OzLandClaimRenewZonesResponse {
  const worldName = getWorldName(AppConfig.serverRoot);
  const database = openLandClaimDatabase();
  try {
    if (
      !tableHasColumns(database, 'renewZoneConfigs', [
        'world',
        'area_id',
        'interval_hours',
        'last_reset_at',
        'updated_at',
      ])
    ) {
      throw new LandClaimSourceUnavailableError('renewZoneConfigs missing required columns');
    }
    const rows = database.prepare(`
      SELECT world, area_id, interval_hours, last_reset_at, updated_at
      FROM renewZoneConfigs
      WHERE world = ? AND updated_at > ?
      ORDER BY area_id ASC
    `).all(worldName, lastChange ?? -1) as RenewZoneRow[];
    const settings = readLandClaimSettings(AppConfig.serverRoot);
    return {
      schemaVersion: 1,
      worldName,
      generatedAt: new Date().toISOString(),
      zones: rows.flatMap((row) => mapRenewZoneRow(row, settings)),
    };
  } catch (error) {
    logSqliteError('LandClaim renew zones', error);
    throw error;
  } finally {
    database.close();
  }
}

function openLandClaimDatabase(): Database.Database {
  const databasePath = landClaimDatabasePath();
  return openReadonlySqliteDatabase(databasePath, LandClaimSourceUnavailableError, 'LandClaim');
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

function mapRenewZoneRow(
  row: RenewZoneRow,
  settings: Record<string, string>,
): OzLandClaimRenewZoneDto[] {
  if (
    typeof row.world !== 'string' ||
    !Number.isSafeInteger(row.area_id) ||
    !Number.isSafeInteger(row.interval_hours) ||
    !Number.isSafeInteger(row.last_reset_at) ||
    !Number.isSafeInteger(row.updated_at)
  ) {
    return [];
  }
  const intervalHours = Math.max(1, row.interval_hours as number);
  const lastResetAt = Math.max(0, row.last_reset_at as number);
  return [{
    world: row.world,
    areaId: row.area_id as number,
    intervalHours,
    lastResetAt,
    nextRenewalAt: lastResetAt <= 0 ? 0 : lastResetAt + intervalHours * 3_600_000,
    borderColor: settingsColor(settings.renewAreaBorderColor, '#00C2A89C'),
    frameColor: settingsColor(settings.renewAreaFrameColor, '#00C2A8AA'),
  }];
}

function readLandClaimSettings(rootPath: string): Record<string, string> {
  const settingsPath = path.join(rootPath, 'Plugins', 'OZLandClaim', 'settings.properties');
  if (!existsSync(settingsPath)) return {};
  const settings: Record<string, string> = {};
  for (const line of readFileSync(settingsPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const separator = firstSeparator(trimmed);
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key) continue;
    settings[key] = trimmed.slice(separator + 1).trim();
  }
  return settings;
}

function settingsColor(value: string | undefined, fallback: string): string {
  const normalized = value?.trim().replace(/^0x/i, '').replace(/^#/, '');
  if (!normalized || !/^[0-9a-f]{8}$/i.test(normalized)) return fallback;
  return `#${normalized.toUpperCase()}`;
}

function firstSeparator(line: string): number {
  const equals = line.indexOf('=');
  const colon = line.indexOf(':');
  if (equals < 0) return colon;
  if (colon < 0) return equals;
  return Math.min(equals, colon);
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
