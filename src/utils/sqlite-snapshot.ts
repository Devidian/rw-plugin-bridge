import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SQLITE_SIDECAR_SUFFIXES = ['', '-wal', '-shm'] as const;

/**
 * Opens SQLite data from a writable local copy instead of the game-server
 * mount. SQLite may need to create its transient -shm file even for a
 * read-only connection to a database configured for WAL mode.
 */
export function withSqliteSnapshots<T>(
  databasePaths: readonly string[],
  callback: (snapshotPath: (databasePath: string) => string) => T,
): T {
  const snapshotDirectory = mkdtempSync(path.join(os.tmpdir(), 'rw-bridge-sqlite-'));
  const snapshots = new Map<string, string>();
  try {
    for (const databasePath of databasePaths) {
      const snapshotPath = path.join(snapshotDirectory, path.basename(databasePath));
      copyDatabaseFiles(databasePath, snapshotPath);
      snapshots.set(databasePath, snapshotPath);
    }
    return callback((databasePath) => snapshots.get(databasePath) ?? databasePath);
  } finally {
    rmSync(snapshotDirectory, { recursive: true, force: true });
  }
}

function copyDatabaseFiles(sourcePath: string, snapshotPath: string): void {
  for (const suffix of SQLITE_SIDECAR_SUFFIXES) {
    const source = `${sourcePath}${suffix}`;
    if (existsSync(source)) copyFileSync(source, `${snapshotPath}${suffix}`);
  }
}
