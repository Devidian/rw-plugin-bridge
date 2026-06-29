import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getMarketplaceOffers, getMarketplaceZones } from '../src/service/marketplace-service.js';

function createRootWithMarketplace(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rw-bridge-marketplace-'));
  const marketplaceRoot = path.join(root, 'Plugins', 'OZMarketplace');
  mkdirSync(marketplaceRoot, { recursive: true });
  writeFileSync(path.join(root, 'server.properties'), 'World_Name=world\n');
  const database = new Database(path.join(marketplaceRoot, 'world.db'));
  database.exec(`
    CREATE TABLE marketplace_zones (
      id TEXT PRIMARY KEY,
      name TEXT,
      area_id INTEGER,
      created_at INTEGER
    );
    CREATE TABLE marketplace_listings (
      id INTEGER PRIMARY KEY,
      seller_name TEXT,
      item_name TEXT,
      item_variant INTEGER,
      amount INTEGER,
      price REAL,
      currency_identifier TEXT,
      market_zone_id TEXT,
      global_listing INTEGER,
      created_at INTEGER,
      status TEXT
    );
  `);
  database
    .prepare(`
      INSERT INTO marketplace_zones (id, name, area_id, created_at)
      VALUES ('zone-1', 'Spawn Market', 42, 1000), ('zone-2', 'Harbor Market', 43, 3000)
    `)
    .run();
  database
    .prepare(`
      INSERT INTO marketplace_listings
      (id, seller_name, item_name, item_variant, amount, price, currency_identifier,
       market_zone_id, global_listing, created_at, status)
      VALUES
      (1, 'Alice', 'Stone', 0, 64, 12.5, 'coins', 'zone-1', 0, 2000, 'ACTIVE'),
      (2, 'Bob', 'Wood', 1, 16, 5, 'coins', 'zone-1', 1, 3000, 'SOLD'),
      (3, 'Carol', 'Iron', 0, 8, 30, 'coins', 'zone-2', 1, 4000, 'ACTIVE')
    `)
    .run();
  database.close();
  return root;
}

describe('marketplace service', () => {
  const previousEnv = process.env;

  beforeEach(() => {
    process.env = { ...previousEnv };
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it('reads marketplace zones', () => {
    process.env.SERVER_ROOT = createRootWithMarketplace();

    expect(getMarketplaceZones()).toEqual({
      schemaVersion: 1,
      generatedAt: expect.any(String),
      zones: [
        {
          id: 'zone-2',
          name: 'Harbor Market',
          areaId: 43,
          createdAt: '1970-01-01T00:00:03.000Z',
        },
        {
          id: 'zone-1',
          name: 'Spawn Market',
          areaId: 42,
          createdAt: '1970-01-01T00:00:01.000Z',
        },
      ],
    });
  });

  it('filters zones by lastChange', () => {
    process.env.SERVER_ROOT = createRootWithMarketplace();

    expect(getMarketplaceZones(1000).zones.map((zone) => zone.id)).toEqual(['zone-2']);
  });

  it('reads active marketplace offers for an area', () => {
    process.env.SERVER_ROOT = createRootWithMarketplace();

    expect(getMarketplaceOffers(42)).toEqual({
      schemaVersion: 1,
      areaId: 42,
      generatedAt: expect.any(String),
      offers: [
        {
          id: 1,
          itemName: 'Stone',
          itemVariant: 0,
          amount: 64,
          price: 12.5,
          currency: 'coins',
          sellerName: 'Alice',
          createdAt: '1970-01-01T00:00:02.000Z',
        },
      ],
    });
  });

  it('filters offers by lastChange', () => {
    process.env.SERVER_ROOT = createRootWithMarketplace();

    expect(getMarketplaceOffers(42, 2000).offers).toEqual([]);
  });
});
