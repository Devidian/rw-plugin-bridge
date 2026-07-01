import type { OzAdminUtilsMapResponse } from '../dto/ozadminutils-map-response.js';
import type { OzAdminUtilsPlayerlistResponse } from '../dto/ozadminutils-playerlist-response.js';
import type { OzAdminUtilsPluginsResponse } from '../dto/ozadminutils-plugins-response.js';
import type { OzAdminUtilsServerConfigResponse } from '../dto/ozadminutils-server-config-response.js';
import { mapSourceChunkToDto } from '../mapper/map-source-mapper.js';
import { MapSourceReader } from './map-source-service.js';
import { getAllPlayers } from './player-service.js';
import { listPlugins } from './plugin-inventory-service.js';
import { getServerConfig } from './server-config-service.js';

export interface MapDataOptions {
  lastChange?: number;
  limit?: number;
  offset?: number;
}

export function getMapData(options: MapDataOptions | number = {}): OzAdminUtilsMapResponse {
  const normalized = typeof options === 'number' ? { lastChange: options } : options;
  const readLimit = normalized.limit === undefined ? undefined : normalized.limit + 1;
  const chunks = new MapSourceReader().listChunks({
    lastChange: normalized.lastChange,
    limit: readLimit,
    offset: normalized.offset,
  });
  const responseChunks = normalized.limit === undefined ? chunks : chunks.slice(0, normalized.limit);
  const partial = normalized.limit !== undefined && chunks.length > normalized.limit;
  return {
    schemaVersion: 1,
    full: normalized.lastChange === undefined,
    nextChange: responseChunks.reduce<number | null>(
      (result, chunk) => Math.max(result ?? chunk.updatedAtMs, chunk.updatedAtMs),
      null,
    ),
    ...(normalized.limit === undefined ? {} : {
      partial,
      ...(partial ? { nextOffset: (normalized.offset ?? 0) + normalized.limit } : {}),
    }),
    chunks: responseChunks.map(mapSourceChunkToDto),
  };
}

export async function getPluginList(): Promise<OzAdminUtilsPluginsResponse> {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    plugins: await listPlugins(),
  };
}

export function getPlayerList(): OzAdminUtilsPlayerlistResponse {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    players: getAllPlayers(),
  };
}

export function getMaskedServerConfig(): OzAdminUtilsServerConfigResponse {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    config: getServerConfig(),
  };
}
