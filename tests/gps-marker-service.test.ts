import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getGpsMarkers } from '../src/service/gps-marker-service.js';

function createRootWithGps(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rw-bridge-gps-'));
  const gpsRoot = path.join(root, 'Plugins', 'OZGPS');
  mkdirSync(gpsRoot, { recursive: true });
  writeFileSync(path.join(root, 'server.properties'), 'World_Name=world\n');
  const database = new Database(path.join(gpsRoot, 'world.db'));
  database.exec(`
    CREATE TABLE marker (
      id INTEGER,
      player_id INTEGER,
      type TEXT,
      group_name TEXT,
      created_at INTEGER,
      pos_x REAL,
      pos_y REAL,
      pos_z REAL,
      name TEXT,
      icon TEXT,
      color INTEGER,
      cost INTEGER
    );
  `);
  database
    .prepare(`
      INSERT INTO marker
      (id, player_id, type, group_name, created_at, pos_x, pos_y, pos_z, name, icon, color, cost)
      VALUES
      (1, 0, 'GLOBAL', NULL, 1000, 10, 20, 30, 'Spawn', 'icon-ki-gps-global', ?, 0),
      (2, 0, 'PRIVATE', NULL, 2000, 1, 2, 3, 'Private', 'icon-ki-gps-private', ?, 0),
      (3, 0, 'GLOBAL', NULL, 3000, 40, 50, 60, 'Market', 'icon-ki-village-01', ?, 0)
    `)
    .run(0xff00ff80, 0xff0000ff, 0x01020304);
  database.close();
  return root;
}

describe('gps marker service', () => {
  const previousEnv = process.env;

  beforeEach(() => {
    process.env = { ...previousEnv };
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it('reads global markers from the GPS database', () => {
    process.env.SERVER_ROOT = createRootWithGps();

    expect(getGpsMarkers('global')).toEqual({
      schemaVersion: 1,
      type: 'global',
      generatedAt: expect.any(String),
      markers: [
        {
          id: 3,
          name: 'Market',
          x: 40,
          y: 50,
          z: 60,
          icon: 'icon-ki-village-01',
          color: '#01020304',
          createdAt: '1970-01-01T00:00:03.000Z',
        },
        {
          id: 1,
          name: 'Spawn',
          x: 10,
          y: 20,
          z: 30,
          icon: 'icon-ki-gps-global',
          color: '#FF00FF80',
          createdAt: '1970-01-01T00:00:01.000Z',
        },
      ],
    });
  });

  it('filters by lastChange', () => {
    process.env.SERVER_ROOT = createRootWithGps();

    expect(getGpsMarkers('global', 1000).markers.map((marker) => marker.id)).toEqual([3]);
  });
});
