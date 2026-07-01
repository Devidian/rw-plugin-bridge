import { jest } from '@jest/globals';

const listChunksMock = jest.fn<() => unknown[]>();

jest.unstable_mockModule('../src/service/map-source-service.js', () => ({
  MapSourceReader: jest.fn().mockImplementation(() => ({
    listChunks: listChunksMock,
  })),
}));

const { getMapData } = await import('../src/service/ozadminutils-service.js');

describe('ozadminutils service', () => {
  beforeEach(() => {
    listChunksMock.mockReset();
  });

  it('returns paginated map data with next offset', () => {
    listChunksMock.mockReturnValue([
      chunk(1000, 'a'),
      chunk(1001, 'b'),
      chunk(1002, 'c'),
    ]);

    expect(getMapData({ limit: 2, offset: 4 })).toMatchObject({
      schemaVersion: 1,
      full: true,
      nextChange: 1001,
      partial: true,
      nextOffset: 6,
      chunks: [
        { chunkX: 1000, updatedAtMs: 1000 },
        { chunkX: 1001, updatedAtMs: 1001 },
      ],
    });
    expect(listChunksMock).toHaveBeenCalledWith({
      lastChange: undefined,
      limit: 3,
      offset: 4,
    });
  });
});

function chunk(updatedAtMs: number, hashPrefix: string) {
  return {
    schemaVersion: 1,
    chunkX: updatedAtMs,
    chunkZ: 2,
    heights: Buffer.alloc(4096),
    textures: Buffer.alloc(1024),
    updatedAtMs,
    contentHash: hashPrefix.repeat(64),
    biome: null,
    region: null,
  };
}
