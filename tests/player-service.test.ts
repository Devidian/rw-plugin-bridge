import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getAllPlayers } from '../src/service/player-service.js';

function createRootWithPlayers(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rw-bridge-players-'));
  const worldRoot = path.join(root, 'Worlds', 'BridgeWorld');
  mkdirSync(worldRoot, { recursive: true });
  writeFileSync(path.join(root, 'server.properties'), 'World_Name=BridgeWorld\n');
  const database = new Database(path.join(worldRoot, 'Player.db'));
  database.exec(`
    CREATE TABLE player (
      id INTEGER,
      uid TEXT,
      name TEXT,
      posx REAL,
      posy REAL,
      posz REAL,
      rotx REAL,
      roty REAL,
      rotz REAL,
      rotw REAL,
      platform INTEGER,
      permissiongroup TEXT,
      health REAL,
      hunger REAL,
      thirst REAL,
      brokenbones INTEGER,
      temperature REAL,
      dead INTEGER,
      flying INTEGER,
      clothes BLOB,
      primaryspawn BLOB,
      secondaryspawn BLOB,
      tertiaryspawn BLOB,
      lastspawn INTEGER,
      lastusedmount INTEGER,
      lastusedvehicle INTEGER,
      playtime INTEGER,
      firstseen INTEGER,
      lastseen INTEGER
    );
  `);
  const spawn = Buffer.alloc(50);
  spawn.writeFloatLE(1, 24);
  spawn.writeFloatLE(2, 28);
  spawn.writeFloatLE(3, 32);
  database
    .prepare(`
      INSERT INTO player VALUES (
        1, 'steam-1', 'Tester', 10, 20, 30, 0, 0, 0, 1, 2, 'admin',
        100, 90, 80, 0, 37, 0, 0, ?, ?, NULL, NULL, 1, 2, 3, 4, 5, 6
      )
    `)
    .run(Buffer.from([1, 2, 3]), spawn);
  database.close();
  return root;
}

describe('player service', () => {
  it('reads players from the active world database', () => {
    expect(getAllPlayers(createRootWithPlayers())).toEqual([
      expect.objectContaining({
        id: 1,
        uid: 'steam-1',
        name: 'Tester',
        platform: 'Steam',
        clothes: '010203',
        primaryspawn: { x: 1, y: 2, z: 3 },
      }),
    ]);
  });
});
