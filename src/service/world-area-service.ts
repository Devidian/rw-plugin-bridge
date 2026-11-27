import { existsSync } from 'node:fs';
import path from 'node:path';
import type {
  OzAdminUtilsWorldAreaDto,
  OzAdminUtilsWorldAreasResponse,
} from '../dto/ozadminutils-world-areas-response.js';
import { AppConfig } from '../utils/app-config.js';
import { getWorldName } from './server-config-service.js';
import { readLandClaimSettings } from './land-claim-settings.js';
import { logSqliteError, openReadonlySqliteDatabase, tableHasColumns } from '../utils/sqlite.js';
import { withSqliteSnapshots } from '../utils/sqlite-snapshot.js';

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
  const worldRoot = path.join(AppConfig.serverRoot, 'Worlds', worldName);
  const areasPath = path.join(worldRoot, 'Areas.db');
  const playersPath = path.join(worldRoot, 'Player.db');
  return withSqliteSnapshots([areasPath, playersPath], (snapshotPath) => {
    const database = openReadonlySqliteDatabase(snapshotPath(areasPath), WorldAreaSourceUnavailableError, 'World areas');
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
      const owners = ownerByArea(snapshotPath(areasPath), snapshotPath(playersPath), settings);
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
  });
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


function ownerByArea(
  areasPath: string,
  playersPath: string,
  settings: Record<string, string>,
): Map<number, OwnerRow> {
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
