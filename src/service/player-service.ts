import path from 'node:path';
import type { DbPlayer } from '../interfaces/game-player.js';
import { AppConfig } from '../utils/app-config.js';
import { logSqliteError, openReadonlySqliteDatabase } from '../utils/sqlite.js';
import { bufferToPosition } from './spawn-packet-decoder.js';
import { getWorldName } from './server-config-service.js';

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
  const database = openReadonlySqliteDatabase(databasePath, PlayerDatabaseUnavailableError, 'Player', busyTimeoutMs);
  try {
    return (database.prepare('SELECT * FROM player').all() as PlayerRow[]).map(mapPlayerRow);
  } catch (error) {
    logSqliteError('Player', error);
    throw error;
  } finally {
    database.close();
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
