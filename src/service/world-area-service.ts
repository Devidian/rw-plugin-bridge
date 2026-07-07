import Database from 'better-sqlite3';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  OzAdminUtilsWorldAreaDto,
  OzAdminUtilsWorldAreasResponse,
} from '../dto/ozadminutils-world-areas-response.js';
import { AppConfig } from '../utils/app-config.js';
import { getWorldName } from './server-config-service.js';
import { logSqliteError, openReadonlySqliteDatabase } from '../utils/sqlite.js';

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

interface OwnerRow {
  area_id: unknown;
  player_id: unknown;
  uid: unknown;
  name: unknown;
}

interface RightRow {
  area_id: unknown;
  player_id: unknown;
}

interface PlayerRow {
  id: unknown;
  uid: unknown;
  name: unknown;
}

export function getWorldAreas(lastChange?: number): OzAdminUtilsWorldAreasResponse {
  const worldName = getWorldName(AppConfig.serverRoot);
  const databasePath = path.join(AppConfig.serverRoot, 'Worlds', worldName, 'Areas.db');
  const database = openReadonlySqliteDatabase(databasePath, WorldAreaSourceUnavailableError, 'World areas');
  try {
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
    const settings = readLandClaimSettings(AppConfig.serverRoot);
    const owners = ownerByArea(AppConfig.serverRoot, worldName, settings);
    return {
      schemaVersion: 1,
      worldName,
      generatedAt: new Date().toISOString(),
      settings,
      areas: rows.flatMap((row) => mapAreaRow(row, owners.get(typeof row.id === 'number' ? row.id : -1))),
    };
  } catch (error) {
    logSqliteError('World areas', error);
    throw error;
  } finally {
    database.close();
  }
}

function mapAreaRow(row: AreaRow, owner?: OwnerRow): OzAdminUtilsWorldAreaDto[] {
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
    ...(typeof owner?.uid === 'string' && owner.uid ? { ownerUid: owner.uid } : {}),
    ...(typeof owner?.player_id === 'number' && Number.isSafeInteger(owner.player_id)
      ? { ownerDbId: owner.player_id }
      : {}),
    ...(typeof owner?.name === 'string' && owner.name ? { ownerName: owner.name } : {}),
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

function ownerByArea(
  rootPath: string,
  worldName: string,
  settings: Record<string, string>,
): Map<number, OwnerRow> {
  const areasPath = path.join(rootPath, 'Worlds', worldName, 'Areas.db');
  const playersPath = path.join(rootPath, 'Worlds', worldName, 'Player.db');
  if (!existsSync(playersPath)) return new Map();
  const database = openReadonlySqliteDatabase(areasPath, WorldAreaSourceUnavailableError, 'World area owners');
  const players = openReadonlySqliteDatabase(playersPath, WorldAreaSourceUnavailableError, 'World area players');
  try {
    if (
      !tableHasColumns(database, 'rights', ['areaid', 'playerid', 'permission']) ||
      !tableHasColumns(players, 'player', ['id', 'uid', 'name'])
    ) return new Map();
    const rights = database.prepare(`
      SELECT areaid AS area_id, playerid AS player_id
      FROM rights
      WHERE permission = ?
      ORDER BY areaid
    `).all(settings.ownerAreaPermission ?? 'ozlc-owner') as RightRow[];
    const playerRows = players.prepare('SELECT id, uid, name FROM player').all() as PlayerRow[];
    const playersById = new Map(playerRows.flatMap((player): Array<[number, PlayerRow]> =>
      typeof player.id === 'number' && Number.isSafeInteger(player.id) ? [[player.id, player]] : [],
    ));
    return new Map(rights.flatMap((right): Array<[number, OwnerRow]> => {
      if (
        typeof right.area_id !== 'number' ||
        !Number.isSafeInteger(right.area_id) ||
        typeof right.player_id !== 'number' ||
        !Number.isSafeInteger(right.player_id)
      ) return [];
      const player = playersById.get(right.player_id);
      if (!player) return [];
      return [[right.area_id, {
        area_id: right.area_id,
        player_id: right.player_id,
        uid: player.uid,
        name: player.name,
      }]];
    }));
  } catch (error) {
    logSqliteError('World area owners', error);
    throw error;
  } finally {
    database.close();
    players.close();
  }
}

function firstSeparator(line: string): number {
  const equals = line.indexOf('=');
  const colon = line.indexOf(':');
  if (equals < 0) return colon;
  if (colon < 0) return equals;
  return Math.min(equals, colon);
}

function tableHasColumns(database: Database.Database, table: string, columns: string[]): boolean {
  const actual = new Set(
    (database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
      .map((column) => column.name),
  );
  return columns.every((column) => actual.has(column));
}
