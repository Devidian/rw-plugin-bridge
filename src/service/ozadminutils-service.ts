import type { OzAdminUtilsMapResponse } from '../dto/ozadminutils-map-response.js';
import type { OzAdminUtilsPlayerlistResponse } from '../dto/ozadminutils-playerlist-response.js';
import type { OzAdminUtilsPluginsResponse } from '../dto/ozadminutils-plugins-response.js';
import type { OzAdminUtilsServerConfigResponse } from '../dto/ozadminutils-server-config-response.js';
import { mapSourceChunkToDto } from '../mapper/map-source-mapper.js';
import { MapSourceReader } from './map-source-service.js';
import { getAllPlayers } from './player-service.js';
import { listPlugins } from './plugin-inventory-service.js';
import { getServerConfig } from './server-config-service.js';

export function getMapData(lastChange?: number): OzAdminUtilsMapResponse {
  const chunks = new MapSourceReader().listChunks(lastChange);
  return {
    schemaVersion: 1,
    full: lastChange === undefined,
    nextChange: chunks.reduce<number | null>(
      (result, chunk) => Math.max(result ?? chunk.updatedAtMs, chunk.updatedAtMs),
      null,
    ),
    chunks: chunks.map(mapSourceChunkToDto),
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
