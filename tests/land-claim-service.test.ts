import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getClaimSaleListings, getRenewZones } from '../src/service/land-claim-service.js';

function createRootWithLandClaim(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rw-bridge-landclaim-'));
  const landClaimRoot = path.join(root, 'Plugins', 'OZLandClaim');
  mkdirSync(landClaimRoot, { recursive: true });
  writeFileSync(path.join(root, 'server.properties'), 'World_Name=world\n');
  const database = new Database(path.join(landClaimRoot, 'world.db'));
  database.exec(`
    CREATE TABLE claimSaleListings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      world TEXT NOT NULL,
      area_id INTEGER NOT NULL,
      owner_uuid TEXT NOT NULL,
      owner_dbid INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL,
      listed_at INTEGER NOT NULL,
      buyer_uuid TEXT NOT NULL DEFAULT '',
      buyer_dbid INTEGER NOT NULL DEFAULT 0,
      purchased_at INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL
    );
    CREATE TABLE renewZoneConfigs (
      world TEXT NOT NULL,
      area_id INTEGER NOT NULL,
      interval_hours INTEGER NOT NULL,
      last_reset_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(world, area_id)
    );
  `);
  database
    .prepare(`
      INSERT INTO claimSaleListings
      (id, world, area_id, owner_uuid, owner_dbid, price, listed_at,
       buyer_uuid, buyer_dbid, purchased_at, status)
      VALUES
      (1, 'world', 42, 'owner-1', 7, 1000, 1000, '', 0, 0, 'ACTIVE'),
      (2, 'world', 43, 'owner-2', 8, 1500, 3000, '', 0, 0, 'SOLD'),
      (3, 'other', 44, 'owner-3', 9, 2000, 4000, '', 0, 0, 'ACTIVE'),
      (4, 'world', 45, 'owner-4', 10, 2500, 5000, '', 0, 0, 'ACTIVE')
    `)
    .run();
  database
    .prepare(`
      INSERT INTO renewZoneConfigs
      (world, area_id, interval_hours, last_reset_at, updated_at)
      VALUES
      ('world', 42, 12, 1000, 1000),
      ('other', 43, 24, 2000, 2000),
      ('world', 45, 1, 0, 3000)
    `)
    .run();
  database.close();
  return root;
}

describe('land claim service', () => {
  const previousEnv = process.env;

  beforeEach(() => {
    process.env = { ...previousEnv };
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it('reads active claim sale listings for the configured world', () => {
    process.env.SERVER_ROOT = createRootWithLandClaim();

    expect(getClaimSaleListings()).toEqual({
      schemaVersion: 1,
      worldName: 'world',
      generatedAt: expect.any(String),
      listings: [
        {
          id: 4,
          world: 'world',
          areaId: 45,
          ownerUuid: 'owner-4',
          ownerDbId: 10,
          price: 2500,
          listedAt: '1970-01-01T00:00:05.000Z',
          status: 'ACTIVE',
        },
        {
          id: 1,
          world: 'world',
          areaId: 42,
          ownerUuid: 'owner-1',
          ownerDbId: 7,
          price: 1000,
          listedAt: '1970-01-01T00:00:01.000Z',
          status: 'ACTIVE',
        },
      ],
    });
  });

  it('filters claim sale listings by lastChange', () => {
    process.env.SERVER_ROOT = createRootWithLandClaim();

    expect(getClaimSaleListings(1000).listings.map((listing) => listing.id)).toEqual([4]);
  });

  it('reads renew zones for the configured world', () => {
    process.env.SERVER_ROOT = createRootWithLandClaim();

    expect(getRenewZones()).toEqual({
      schemaVersion: 1,
      worldName: 'world',
      generatedAt: expect.any(String),
      zones: [
        {
          world: 'world',
          areaId: 42,
          intervalHours: 12,
          lastResetAt: 1000,
          nextRenewalAt: 43201000,
          borderColor: '#00C2A89C',
          frameColor: '#00C2A8AA',
        },
        {
          world: 'world',
          areaId: 45,
          intervalHours: 1,
          lastResetAt: 0,
          nextRenewalAt: 0,
          borderColor: '#00C2A89C',
          frameColor: '#00C2A8AA',
        },
      ],
    });
  });

  it('filters renew zones by lastChange', () => {
    process.env.SERVER_ROOT = createRootWithLandClaim();

    expect(getRenewZones(1000).zones.map((zone) => zone.areaId)).toEqual([45]);
  });
});
