export interface OzAdminUtilsMapChunkDto {
  schemaVersion: 1;
  chunkX: number;
  chunkZ: number;
  heightsBase64: string;
  texturesBase64: string;
  updatedAtMs: number;
  contentHash: string;
  biome: number | null;
  region: number | null;
}

export interface OzAdminUtilsMapResponse {
  schemaVersion: 1;
  full: boolean;
  nextChange: number | null;
  chunks: OzAdminUtilsMapChunkDto[];
}
