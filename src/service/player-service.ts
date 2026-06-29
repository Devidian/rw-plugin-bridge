import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { DbPlayer } from '../interfaces/game-player.js';
import { AppConfig } from '../utils/app-config.js';
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
  if (!existsSync(databasePath)) {
    throw new PlayerDatabaseUnavailableError(`Player database not found at ${databasePath}`);
  }
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    database.pragma(`busy_timeout = ${busyTimeoutMs}`);
    return (database.prepare('SELECT * FROM player').all() as PlayerRow[]).map(mapPlayerRow);
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
