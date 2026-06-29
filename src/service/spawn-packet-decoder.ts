export interface SpawnPacket {
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export function bufferToPosition(buffer: Buffer | undefined): SpawnPacket['position'] | undefined {
  if (!buffer) return undefined;
  if (buffer.length < 36) return undefined;
  return {
    x: buffer.readFloatLE(24),
    y: buffer.readFloatLE(28),
    z: buffer.readFloatLE(32),
  };
}
