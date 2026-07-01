import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { MapSourceReader } from '../src/service/map-source-service.js';

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
});
