import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { AppConfig } from './app-config.js';
import { defaultLogger } from './logger.js';

export function openReadonlySqliteDatabase(
  databasePath: string,
  unavailableError: new (message: string) => Error,
  label: string,
  busyTimeoutMs: number = AppConfig.sqliteBusyTimeoutMs,
): Database.Database {
  defaultLogger.debug(`${label} sqlite database path: ${databasePath}`);
  if (!existsSync(databasePath)) {
    throw new unavailableError(`${label} database not found at ${databasePath}`);
  }
  try {
    const database = new Database(databasePath, { readonly: true, fileMustExist: true });
    database.pragma(`busy_timeout = ${busyTimeoutMs}`);
    return database;
  } catch (error) {
    defaultLogger.error(`${label} sqlite error: ${(error as Error).message}`);
    throw error;
  }
}

export function logSqliteError(label: string, error: unknown): void {
  defaultLogger.error(`${label} sqlite error: ${(error as Error).message}`);
}

