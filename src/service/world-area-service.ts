import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type {
  OzAdminUtilsWorldAreaDto,
  OzAdminUtilsWorldAreasResponse,
} from '../dto/ozadminutils-world-areas-response.js';
import { AppConfig } from '../utils/app-config.js';
import { getWorldName } from './server-config-service.js';

export class WorldAreaSourceUnavailableError extends Error {}

interface AreaRow {
  id: unknown;
  name: unknown;
  permission: unknown;
  priority: unknown;
  startposx: unknown;
  startposy: unknown;
  startposz: unknown;
  endposx: unknown;
  endposy: unknown;
  endposz: unknown;
  creationdate: unknown;
}

export function getWorldAreas(lastChange?: number): OzAdminUtilsWorldAreasResponse {
  const worldName = getWorldName(AppConfig.serverRoot);
  const databasePath = path.join(AppConfig.serverRoot, 'Worlds', worldName, 'Areas.db');
  if (!existsSync(databasePath)) {
    throw new WorldAreaSourceUnavailableError(`Areas database not found at ${databasePath}`);
  }
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    database.pragma(`busy_timeout = ${AppConfig.sqliteBusyTimeoutMs}`);
    if (!tableHasColumns(database, 'areas', [
      'id',
      'name',
      'permission',
      'priority',
      'startposx',
      'startposy',
      'startposz',
      'endposx',
      'endposy',
      'endposz',
      'creationdate',
    ])) {
      throw new WorldAreaSourceUnavailableError('areas missing required columns');
    }
    const rows = database.prepare(`
      SELECT id, name, permission, priority,
             startposx, startposy, startposz, endposx, endposy, endposz, creationdate
      FROM areas
      WHERE creationdate > ?
      ORDER BY creationdate DESC, id DESC
    `).all(lastChange ?? -1) as AreaRow[];
    return {
      schemaVersion: 1,
      worldName,
      generatedAt: new Date().toISOString(),
      areas: rows.flatMap(mapAreaRow),
    };
  } finally {
    database.close();
  }
}

function mapAreaRow(row: AreaRow): OzAdminUtilsWorldAreaDto[] {
  const {
    id,
    name,
    permission,
    priority,
    startposx,
    startposy,
    startposz,
    endposx,
    endposy,
    endposz,
    creationdate,
  } = row;
  if (
    typeof id !== 'number' ||
    !Number.isSafeInteger(id) ||
    typeof name !== 'string' ||
    typeof permission !== 'string' ||
    typeof priority !== 'number' ||
    !Number.isSafeInteger(priority) ||
    typeof startposx !== 'number' ||
    typeof startposy !== 'number' ||
    typeof startposz !== 'number' ||
    typeof endposx !== 'number' ||
    typeof endposy !== 'number' ||
    typeof endposz !== 'number'
  ) {
    return [];
  }
  return [{
    id,
    name: name.trim() || `Area #${id}`,
    permission,
    priority,
    startX: startposx,
    startY: startposy,
    startZ: startposz,
    endX: endposx,
    endY: endposy,
    endZ: endposz,
    createdAt: typeof creationdate === 'number' && Number.isSafeInteger(creationdate) && creationdate > 0
      ? new Date(creationdate * 1000).toISOString()
      : null,
  }];
}

function tableHasColumns(database: Database.Database, table: string, columns: string[]): boolean {
  const actual = new Set(
    (database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
      .map((column) => column.name),
  );
  return columns.every((column) => actual.has(column));
}
