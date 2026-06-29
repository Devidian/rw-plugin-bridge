import Database from 'better-sqlite3';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { MapSourceChunk } from '../interfaces/map-source-chunk.js';
import { AppConfig } from '../utils/app-config.js';

const SOURCE_SCHEMA_VERSION = 1;
const HEIGHT_BYTES = 4096;
const TEXTURE_BYTES = 1024;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

interface SourceRow {
  schema_version: unknown;
  chunk_x: unknown;
  chunk_z: unknown;
  heights: unknown;
  textures: unknown;
  updated_at_ms: unknown;
  content_hash: unknown;
  biome: unknown;
  region: unknown;
}

export class MapSourceUnavailableError extends Error {}
export class InvalidMapSourceRowError extends Error {}

export class MapSourceReader {
  constructor(
    private readonly sourcePath: string = resolveAdminUtilsMapSourcePath(),
    private readonly busyTimeoutMs: number = AppConfig.sqliteBusyTimeoutMs,
  ) {}

  listChunks(lastChange?: number): MapSourceChunk[] {
    const database = new Database(this.sourcePath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      database.pragma(`busy_timeout = ${this.busyTimeoutMs}`);
      const rows = database
        .prepare(
          `
          SELECT schema_version, chunk_x, chunk_z, heights, textures,
                 updated_at_ms, content_hash, biome, region
          FROM map_chunks_v1
          WHERE updated_at_ms > ?
          ORDER BY updated_at_ms, chunk_x, chunk_z
        `,
        )
        .all(lastChange ?? -1) as SourceRow[];
      return rows.map(decodeMapSourceRow);
    } finally {
      database.close();
    }
  }
}

export function resolveAdminUtilsMapSourcePath(): string {
  if (AppConfig.adminUtilsMapDbPath) return AppConfig.adminUtilsMapDbPath;
  const pluginRoot = path.join(AppConfig.serverRoot, 'Plugins', 'OZAdminUtils');
  if (AppConfig.adminUtilsMapWorldName) {
    return path.join(pluginRoot, `${AppConfig.adminUtilsMapWorldName}.db`);
  }
  if (!existsSync(pluginRoot)) {
    throw new MapSourceUnavailableError('OZAdminUtils plugin directory not found');
  }
  const candidates = readdirSync(pluginRoot)
    .filter((entry) => entry.endsWith('.db'))
    .filter((entry) => !entry.endsWith('.db-wal') && !entry.endsWith('.db-shm'))
    .sort();
  if (candidates.length !== 1) {
    throw new MapSourceUnavailableError('ADMINUTILS_MAP_WORLD_NAME or ADMINUTILS_MAP_DB_PATH is required');
  }
  return path.join(pluginRoot, candidates[0]);
}

export function decodeMapSourceRow(row: SourceRow): MapSourceChunk {
  if (
    row.schema_version !== SOURCE_SCHEMA_VERSION ||
    !Number.isSafeInteger(row.chunk_x) ||
    !Number.isSafeInteger(row.chunk_z) ||
    !Buffer.isBuffer(row.heights) ||
    row.heights.length !== HEIGHT_BYTES ||
    !Buffer.isBuffer(row.textures) ||
    row.textures.length !== TEXTURE_BYTES ||
    !Number.isSafeInteger(row.updated_at_ms) ||
    (row.updated_at_ms as number) < 0 ||
    typeof row.content_hash !== 'string' ||
    !HASH_PATTERN.test(row.content_hash) ||
    !isNullableInteger(row.biome) ||
    !isNullableInteger(row.region)
  ) {
    throw new InvalidMapSourceRowError('Invalid map source row');
  }
  return {
    schemaVersion: SOURCE_SCHEMA_VERSION,
    chunkX: row.chunk_x as number,
    chunkZ: row.chunk_z as number,
    heights: Buffer.from(row.heights),
    textures: Buffer.from(row.textures),
    updatedAtMs: row.updated_at_ms as number,
    contentHash: row.content_hash,
    biome: row.biome as number | null,
    region: row.region as number | null,
  };
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || Number.isSafeInteger(value);
}
