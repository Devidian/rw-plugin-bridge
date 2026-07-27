import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  MapSourceReader,
  MapSourceUnavailableError,
  resolveAdminUtilsMapSourcePath,
} from '../src/service/map-source-service.js';

const originalMapDbPath = process.env.ADMINUTILS_MAP_DB_PATH;
const originalMapWorldName = process.env.ADMINUTILS_MAP_WORLD_NAME;

beforeEach(() => {
  delete process.env.ADMINUTILS_MAP_DB_PATH;
  delete process.env.ADMINUTILS_MAP_WORLD_NAME;
});

afterAll(() => {
  restoreEnvironment('ADMINUTILS_MAP_DB_PATH', originalMapDbPath);
  restoreEnvironment('ADMINUTILS_MAP_WORLD_NAME', originalMapWorldName);
});

function createSourceDatabase(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rw-plugin-bridge-map-'));
  const databasePath = path.join(root, 'world.db');
  const database = new Database(databasePath);
  database.exec(`
    CREATE TABLE map_chunks_v1 (
      schema_version INTEGER NOT NULL,
      chunk_x INTEGER NOT NULL,
      chunk_z INTEGER NOT NULL,
      heights BLOB NOT NULL,
      textures BLOB NOT NULL,
      updated_at_ms INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      biome INTEGER,
      region INTEGER,
      PRIMARY KEY (chunk_x, chunk_z)
    );
  `);
  const heights = Buffer.alloc(4096);
  const textures = Buffer.alloc(1024);
  database
    .prepare(
      `INSERT INTO map_chunks_v1
       (schema_version, chunk_x, chunk_z, heights, textures, updated_at_ms, content_hash, biome, region)
       VALUES (1, -2, 3, ?, ?, 1000, ?, NULL, 7)`,
    )
    .run(heights, textures, 'a'.repeat(64));
  database
    .prepare(
      `INSERT INTO map_chunks_v1
       (schema_version, chunk_x, chunk_z, heights, textures, updated_at_ms, content_hash, biome, region)
       VALUES (1, -1, 3, ?, ?, 1001, ?, NULL, 8)`,
    )
    .run(heights, textures, 'b'.repeat(64));
  database.close();
  return databasePath;
}

function createServerRoot(worldName?: string, databaseNames: string[] = []): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rw-plugin-bridge-map-root-'));
  if (worldName !== undefined) {
    writeFileSync(path.join(root, 'server.properties'), `World_Name=${worldName}\n`);
  }
  const pluginRoot = path.join(root, 'Plugins', 'OZAdminUtils');
  mkdirSync(pluginRoot, { recursive: true });
  for (const databaseName of databaseNames) {
    writeFileSync(path.join(pluginRoot, `${databaseName}.db`), '');
  }
  return root;
}

describe('MapSourceReader', () => {
  it('reads valid map source rows', () => {
    const reader = new MapSourceReader(createSourceDatabase());

    expect(reader.listChunks()).toEqual([
      expect.objectContaining({
        schemaVersion: 1,
        chunkX: -2,
        chunkZ: 3,
        updatedAtMs: 1000,
        contentHash: 'a'.repeat(64),
        biome: null,
        region: 7,
      }),
      expect.objectContaining({
        schemaVersion: 1,
        chunkX: -1,
        chunkZ: 3,
        updatedAtMs: 1001,
        contentHash: 'b'.repeat(64),
        biome: null,
        region: 8,
      }),
    ]);
  });

  it('filters by lastChange', () => {
    const reader = new MapSourceReader(createSourceDatabase());

    expect(reader.listChunks(1000)).toEqual([
      expect.objectContaining({
        chunkX: -1,
        updatedAtMs: 1001,
      }),
    ]);
  });

  it('limits and offsets ordered chunks', () => {
    const reader = new MapSourceReader(createSourceDatabase());

    expect(reader.listChunks({ limit: 1, offset: 1 })).toEqual([
      expect.objectContaining({
        chunkX: -1,
        updatedAtMs: 1001,
      }),
    ]);
  });

  it('resolves the world-scoped database from server.properties', () => {
    const root = createServerRoot('HarshTerritory', ['HarshTerritory']);

    expect(resolveAdminUtilsMapSourcePath(root)).toBe(
      path.join(root, 'Plugins', 'OZAdminUtils', 'HarshTerritory.db'),
    );
  });

  it('retains the explicit database path override', () => {
    const root = createServerRoot('HarshTerritory', ['HarshTerritory']);
    process.env.ADMINUTILS_MAP_DB_PATH = '/custom/map-source.db';

    expect(resolveAdminUtilsMapSourcePath(root)).toBe('/custom/map-source.db');
  });

  it('retains the explicit world-name override', () => {
    const root = createServerRoot('HarshTerritory', ['ConfiguredWorld']);
    process.env.ADMINUTILS_MAP_WORLD_NAME = 'ConfiguredWorld';

    expect(resolveAdminUtilsMapSourcePath(root)).toBe(
      path.join(root, 'Plugins', 'OZAdminUtils', 'ConfiguredWorld.db'),
    );
  });

  it('falls back to a single database when server.properties is unavailable', () => {
    const root = createServerRoot(undefined, ['OnlyWorld']);

    expect(resolveAdminUtilsMapSourcePath(root)).toBe(
      path.join(root, 'Plugins', 'OZAdminUtils', 'OnlyWorld.db'),
    );
  });

  it('reports a missing database for the configured world', () => {
    const root = createServerRoot('HarshTerritory', ['OtherWorld']);

    expect(() => resolveAdminUtilsMapSourcePath(root)).toThrow(
      new MapSourceUnavailableError(
        'AdminUtils map source database not found for world "HarshTerritory"',
      ),
    );
  });
});

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
