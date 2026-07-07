import Database from 'better-sqlite3';
import path from 'node:path';
import type { OzGpsMarkerResponse } from '../dto/ozgps-marker-response.js';
import type { MapGpsMarker } from '../interfaces/map-layer.js';
import { AppConfig } from '../utils/app-config.js';
import { logSqliteError, openReadonlySqliteDatabase } from '../utils/sqlite.js';
import { getWorldName } from './server-config-service.js';

interface GpsMarkerRow {
  id: unknown;
  name: unknown;
  pos_x: unknown;
  pos_y: unknown;
  pos_z: unknown;
  icon: unknown;
  color: unknown;
  created_at: unknown;
}

export class GpsMarkerSourceUnavailableError extends Error {}

export function getGpsMarkers(type: string | undefined, lastChange?: number): OzGpsMarkerResponse {
  if (type !== undefined && type !== 'global') {
    throw new GpsMarkerSourceUnavailableError('Only global GPS marker export is supported');
  }
  return {
    schemaVersion: 1,
    type: 'global',
    generatedAt: new Date().toISOString(),
    markers: readGlobalMarkers(lastChange),
  };
}

function readGlobalMarkers(lastChange?: number): MapGpsMarker[] {
  const databasePath = gpsDatabasePath();
  const database = openReadonlySqliteDatabase(databasePath, GpsMarkerSourceUnavailableError, 'GPS marker');
  try {
    if (!tableHasColumns(database, 'marker', [
      'id', 'type', 'created_at', 'pos_x', 'pos_y', 'pos_z', 'name', 'icon', 'color',
    ])) {
      throw new GpsMarkerSourceUnavailableError('GPS marker table missing required columns');
    }
    const rows = database.prepare(`
      SELECT id, name, pos_x, pos_y, pos_z, icon, color, created_at
      FROM marker
      WHERE type = 'GLOBAL' AND created_at > ?
      ORDER BY created_at DESC, id DESC
    `).all(lastChange ?? -1) as GpsMarkerRow[];
    return rows.flatMap(mapGpsMarkerRow);
  } catch (error) {
    logSqliteError('GPS marker', error);
    throw error;
  } finally {
    database.close();
  }
}

function gpsDatabasePath(rootPath: string = AppConfig.serverRoot): string {
  return path.join(rootPath, 'Plugins', 'OZGPS', `${getWorldName(rootPath)}.db`);
}

function mapGpsMarkerRow(row: GpsMarkerRow): MapGpsMarker[] {
  if (
    !Number.isSafeInteger(row.id) ||
    (row.id as number) <= 0 ||
    typeof row.name !== 'string' ||
    typeof row.icon !== 'string' ||
    typeof row.pos_x !== 'number' ||
    typeof row.pos_y !== 'number' ||
    typeof row.pos_z !== 'number' ||
    !Number.isFinite(row.pos_x) ||
    !Number.isFinite(row.pos_y) ||
    !Number.isFinite(row.pos_z) ||
    typeof row.color !== 'number' ||
    !Number.isFinite(row.color) ||
    !Number.isSafeInteger(row.created_at) ||
    (row.created_at as number) <= 0
  ) {
    return [];
  }
  return [{
    id: row.id as number,
    name: row.name,
    x: row.pos_x,
    y: row.pos_y,
    z: row.pos_z,
    icon: row.icon,
    color: packedIntRgba(row.color),
    createdAt: epochMillis(row.created_at),
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

function packedIntRgba(value: number): string {
  const unsigned = value >>> 0;
  return `#${unsigned.toString(16).padStart(8, '0')}`.toUpperCase();
}

function epochMillis(value: unknown): string {
  return new Date(value as number).toISOString();
}
