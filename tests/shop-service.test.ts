import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getShopZones } from '../src/service/shop-service.js';

function createRootWithShop(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rw-bridge-shop-'));
  const shopRoot = path.join(root, 'Plugins', 'OZShop');
  mkdirSync(shopRoot, { recursive: true });
  writeFileSync(path.join(root, 'server.properties'), 'World_Name=world\n');
  const database = new Database(path.join(shopRoot, 'world.db'));
  database.exec(`
    CREATE TABLE shop_zones (
      area_id INTEGER PRIMARY KEY,
      area_name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      system_shop INTEGER NOT NULL DEFAULT -1,
      system_offers_file TEXT NOT NULL DEFAULT ''
    );
  `);
  database
    .prepare(`
      INSERT INTO shop_zones
      (area_id, area_name, created_by, created_at, system_shop, system_offers_file)
      VALUES
      (42, 'Spawn Shop', 'Admin', 1000, 1, 'spawn-offers.json'),
      (43, 'Harbor Shop', 'Builder', 3000, -1, '')
    `)
    .run();
  database.close();
  return root;
}

describe('shop service', () => {
  const previousEnv = process.env;

  beforeEach(() => {
    process.env = { ...previousEnv };
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it('reads shop zones', () => {
    process.env.SERVER_ROOT = createRootWithShop();

    expect(getShopZones()).toEqual({
      schemaVersion: 1,
      generatedAt: expect.any(String),
      zones: [
        {
          areaId: 43,
          areaName: 'Harbor Shop',
          createdBy: 'Builder',
          createdAt: '1970-01-01T00:00:03.000Z',
          systemShop: -1,
          systemOffersFile: '',
        },
        {
          areaId: 42,
          areaName: 'Spawn Shop',
          createdBy: 'Admin',
          createdAt: '1970-01-01T00:00:01.000Z',
          systemShop: 1,
          systemOffersFile: 'spawn-offers.json',
        },
      ],
    });
  });

  it('filters zones by lastChange', () => {
    process.env.SERVER_ROOT = createRootWithShop();

    expect(getShopZones(1000).zones.map((zone) => zone.areaId)).toEqual([43]);
  });
});
