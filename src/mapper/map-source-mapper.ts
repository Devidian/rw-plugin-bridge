import type { OzAdminUtilsMapChunkDto } from '../dto/ozadminutils-map-response.js';
import type { MapSourceChunk } from '../interfaces/map-source-chunk.js';

export function mapSourceChunkToDto(chunk: MapSourceChunk): OzAdminUtilsMapChunkDto {
  return {
    schemaVersion: 1,
    chunkX: chunk.chunkX,
    chunkZ: chunk.chunkZ,
    heightsBase64: chunk.heights.toString('base64'),
    texturesBase64: chunk.textures.toString('base64'),
    updatedAtMs: chunk.updatedAtMs,
    contentHash: chunk.contentHash,
    biome: chunk.biome,
    region: chunk.region,
  };
}
