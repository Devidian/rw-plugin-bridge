import path from 'node:path';
import type { DbPlayer } from '../interfaces/game-player.js';
import { AppConfig } from '../utils/app-config.js';
import { logSqliteError, openReadonlySqliteDatabase } from '../utils/sqlite.js';
import { withSqliteSnapshots } from '../utils/sqlite-snapshot.js';
import { bufferToPosition } from './spawn-packet-decoder.js';
import { getWorldName } from './server-config-service.js';
import { resolveAdminUtilsMapSourcePath } from './map-source-service.js';

export class PlayerDatabaseUnavailableError extends Error {}

type PlayerRow = DbPlayer & {
  clothes?: Buffer;
  primaryspawn?: Buffer;
  secondaryspawn?: Buffer;
  tertiaryspawn?: Buffer;
};

export function getAllPlayers(
  rootPath: string = AppConfig.serverRoot,
  busyTimeoutMs: number = AppConfig.sqliteBusyTimeoutMs,
): DbPlayer[] {
  const databasePath = path.resolve(rootPath, 'Worlds', getWorldName(rootPath), 'Player.db');
  const players = withSqliteSnapshots([databasePath], (snapshotPath) => {
    const database = openReadonlySqliteDatabase(snapshotPath(databasePath), PlayerDatabaseUnavailableError, 'Player', busyTimeoutMs);
    try {
      return (database.prepare('SELECT * FROM player').all() as PlayerRow[]).map(mapPlayerRow);
    } catch (error) {
      logSqliteError('Player', error);
      throw error;
    } finally {
      database.close();
    }
  });
  return overlayLivePositions(players, rootPath, busyTimeoutMs);
}

interface LivePositionRow {
  uid: string;
  name: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  updated_at_ms: number;
}

function overlayLivePositions(
  players: DbPlayer[],
  rootPath: string,
  busyTimeoutMs: number,
): DbPlayer[] {
  let sourcePath: string;
  try {
    sourcePath = resolveAdminUtilsMapSourcePath(rootPath);
  } catch {
    return players;
  }
  try {
    return withSqliteSnapshots([sourcePath], (snapshotPath) => {
      const database = openReadonlySqliteDatabase(
        snapshotPath(sourcePath),
        PlayerDatabaseUnavailableError,
        'AdminUtils live player positions',
        busyTimeoutMs,
      );
      try {
        const table = database.prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'live_player_positions_v1'",
        ).get();
        if (!table) return players;
        const minimumUpdatedAt = Date.now() - AppConfig.livePlayerPositionMaxAgeMs;
        const liveByUid = new Map(
          (database.prepare(`
            SELECT uid, name, pos_x, pos_y, pos_z, updated_at_ms
            FROM live_player_positions_v1
            WHERE updated_at_ms >= ?
          `).all(minimumUpdatedAt) as LivePositionRow[]).map((position) => [position.uid, position]),
        );
        return players.map((player) => {
          const live = liveByUid.get(player.uid);
          if (!live) return player;
          return {
            ...player,
            name: live.name,
            posx: live.pos_x,
            posy: live.pos_y,
            posz: live.pos_z,
            lastseen: Math.floor(live.updated_at_ms / 1000),
          };
        });
      } finally {
        database.close();
      }
    });
  } catch {
    return players;
  }
}

function mapPlayerRow(row: PlayerRow): DbPlayer {
  return {
    ...row,
    platform: { 1: 'Standalone', 2: 'Steam' }[Number(row.platform)] ?? row.platform,
    clothes: row.clothes?.toString('hex'),
    primaryspawn: bufferToPosition(row.primaryspawn),
    secondaryspawn: bufferToPosition(row.secondaryspawn),
    tertiaryspawn: bufferToPosition(row.tertiaryspawn),
  };
}
