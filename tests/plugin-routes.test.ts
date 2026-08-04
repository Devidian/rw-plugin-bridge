import { createWriteStream, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import request from 'supertest';
import { ZipFile } from 'yazl';
import { createApp } from '../src/server.js';

function createServerRoot(): { root: string; databasePath: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rw-plugin-bridge-root-'));
  const adminUtilsRoot = path.join(root, 'Plugins', 'OZAdminUtils');
  const gpsRoot = path.join(root, 'Plugins', 'OZGPS');
  const landClaimRoot = path.join(root, 'Plugins', 'OZLandClaim');
  const marketplaceRoot = path.join(root, 'Plugins', 'OZMarketplace');
  const otherRoot = path.join(root, 'Plugins', 'OZShop');
  const worldRoot = path.join(root, 'Worlds', 'world');
  mkdirSync(adminUtilsRoot, { recursive: true });
  mkdirSync(gpsRoot, { recursive: true });
  mkdirSync(landClaimRoot, { recursive: true });
  mkdirSync(marketplaceRoot, { recursive: true });
  mkdirSync(otherRoot, { recursive: true });
  mkdirSync(worldRoot, { recursive: true });
  writeFileSync(path.join(root, 'server.properties'), [
    'World_Name=world',
    'Server_Name=Bridge Test',
    'Server_Password=secret',
  ].join('\n'));
  writeFileSync(path.join(adminUtilsRoot, 'plugin.yml'), 'name: OZ - Admin Utils\nversion: 1.0.0\n');
  writeFileSync(path.join(gpsRoot, 'plugin.yml'), 'name: OZ - GPS\nversion: 1.0.0\n');
  writeFileSync(path.join(landClaimRoot, 'plugin.yml'), 'name: OZ - Land Claim\nversion: 1.0.0\n');
  writeFileSync(path.join(landClaimRoot, 'settings.properties'), [
    'ownerAreaPermission=ozlc-owner',
    'defaultAreaPermission=ozlc-guest',
    'otherAreaBorderColor=0x11223344',
    'renewAreaBorderColor=0x00C2A89c',
    'renewAreaFrameColor=0x00C2A8AA',
  ].join('\n'));
  writeFileSync(path.join(marketplaceRoot, 'plugin.yml'), 'name: OZ - Marketplace\nversion: 1.0.0\n');
  writeFileSync(path.join(otherRoot, 'plugin.yml'), 'name: OZ - Shop\nversion: 1.0.0\n');

  const databasePath = path.join(adminUtilsRoot, 'world.db');
  const database = new Database(databasePath);
  database.exec(`
    CREATE TABLE map_chunks_v1 (
      schema_version INTEGER NOT NULL,
      chunk_x INTEGER NOT NULL,
      chunk_z INTEGER NOT NULL,
      heights BLOB NOT NULL,
      textures BLOB NOT NULL,
      updated_at_ms INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      biome INTEGER,
      region INTEGER,
      PRIMARY KEY (chunk_x, chunk_z)
    );
  `);
  database
    .prepare(
      `INSERT INTO map_chunks_v1
       (schema_version, chunk_x, chunk_z, heights, textures, updated_at_ms, content_hash, biome, region)
       VALUES (1, 1, 2, ?, ?, 2000, ?, 3, NULL)`,
    )
    .run(Buffer.alloc(4096), Buffer.alloc(1024), 'b'.repeat(64));
  database.close();
  const playerDb = new Database(path.join(worldRoot, 'Player.db'));
  playerDb.exec(`
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
  playerDb
    .prepare(`
      INSERT INTO player VALUES (
        1, 'steam-1', 'Tester', 10, 20, 30, 0, 0, 0, 1, 2, 'admin',
        100, 90, 80, 0, 37, 0, 0, NULL, NULL, NULL, NULL, 1, 2, 3, 4, 5, 6
      )
    `)
    .run();
  playerDb.close();
  const areasDb = new Database(path.join(worldRoot, 'Areas.db'));
  areasDb.exec(`
    CREATE TABLE areas (
      id INTEGER PRIMARY KEY,
      shape TEXT,
      name TEXT,
      startposx REAL,
      startposy REAL,
      startposz REAL,
      endposx REAL,
      endposy REAL,
      endposz REAL,
      permission TEXT,
      priority INTEGER,
      creationdate INTEGER
    );
    CREATE TABLE rights (
      areaid INTEGER,
      playerid INTEGER,
      permission TEXT
    );
  `);
  areasDb
    .prepare(`
      INSERT INTO areas
      (id, shape, name, startposx, startposy, startposz, endposx, endposy, endposz,
       permission, priority, creationdate)
      VALUES (42, 'Rectangular', 'Spawn Claim', -64, 0, 32, -32.01, 64, 95.99, 'ozlc-guest', 0, 1000)
    `)
    .run();
  areasDb
    .prepare('INSERT INTO rights(areaid, playerid, permission) VALUES (42, 1, ?)')
    .run('ozlc-owner');
  areasDb.close();
  const gpsDb = new Database(path.join(gpsRoot, 'world.db'));
  gpsDb.exec(`
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
  gpsDb
    .prepare(`
      INSERT INTO marker
      (id, player_id, type, group_name, created_at, pos_x, pos_y, pos_z, name, icon, color, cost)
      VALUES (1, 0, 'GLOBAL', NULL, 1000, 10, 20, 30, 'Spawn', 'menu-global-marker', ?, 0)
    `)
    .run(0xff00ff80);
  gpsDb.close();
  const landClaimDb = new Database(path.join(landClaimRoot, 'world.db'));
  landClaimDb.exec(`
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
  landClaimDb
    .prepare(`
      INSERT INTO claimSaleListings
      (id, world, area_id, owner_uuid, owner_dbid, price, listed_at,
       buyer_uuid, buyer_dbid, purchased_at, status)
      VALUES (1, 'world', 42, 'owner-1', 7, 1000, 1000, '', 0, 0, 'ACTIVE')
    `)
    .run();
  landClaimDb
    .prepare(`
      INSERT INTO renewZoneConfigs
      (world, area_id, interval_hours, last_reset_at, updated_at)
      VALUES ('world', 42, 12, 1000, 1000)
    `)
    .run();
  landClaimDb.close();
  const marketplaceDb = new Database(path.join(marketplaceRoot, 'world.db'));
  marketplaceDb.exec(`
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
  marketplaceDb
    .prepare(`
      INSERT INTO marketplace_zones (id, name, area_id, created_at)
      VALUES ('zone-1', 'Spawn Market', 42, 1000)
    `)
    .run();
  marketplaceDb
    .prepare(`
      INSERT INTO marketplace_listings
      (id, seller_name, item_name, item_variant, amount, price, currency_identifier,
       market_zone_id, global_listing, created_at, status)
      VALUES
      (1, 'Alice', 'Stone', 0, 64, 12.5, 'coins', 'zone-1', 0, 2000, 'ACTIVE'),
      (2, 'Bob', 'Wood', 1, 16, 5, 'coins', 'zone-1', 1, 3000, 'SOLD')
    `)
    .run();
  marketplaceDb.close();
  const shopDb = new Database(path.join(otherRoot, 'world.db'));
  shopDb.exec(`
    CREATE TABLE shop_zones (
      area_id INTEGER PRIMARY KEY,
      area_name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      system_shop INTEGER NOT NULL DEFAULT -1,
      system_offers_file TEXT NOT NULL DEFAULT ''
    );
  `);
  shopDb
    .prepare(`
      INSERT INTO shop_zones
      (area_id, area_name, created_by, created_at, system_shop, system_offers_file)
      VALUES (42, 'Spawn Shop', 'Admin', 1000, 1, 'spawn-offers.json')
    `)
    .run();
  shopDb.close();
  return { root, databasePath };
}

describe('plugin routes', () => {
  const previousEnv = process.env;

  beforeEach(() => {
    process.env = { ...previousEnv };
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it('serves health', async () => {
    await request(createApp()).get('/health').expect(200).expect({ ok: true, service: 'rw-plugin-bridge' });
  });

  it('serves map data from Admin Utils source', async () => {
    const { databasePath } = createServerRoot();
    process.env.ADMINUTILS_MAP_DB_PATH = databasePath;

    const response = await request(createApp()).get('/plugins/ozadminutils/map').expect(200);

    expect(response.body).toEqual({
      schemaVersion: 1,
      full: true,
      nextChange: 2000,
      chunks: [
        expect.objectContaining({
          schemaVersion: 1,
          chunkX: 1,
          chunkZ: 2,
          updatedAtMs: 2000,
          contentHash: 'b'.repeat(64),
          biome: 3,
          region: null,
        }),
      ],
    });
    expect(response.body.chunks[0].heightsBase64).toBe(Buffer.alloc(4096).toString('base64'));
    expect(response.body.chunks[0].texturesBase64).toBe(Buffer.alloc(1024).toString('base64'));
  });

  it('serves plugin inventory', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;
    const jarOnlyRoot = path.join(root, 'Plugins', 'OZJarOnly');
    mkdirSync(jarOnlyRoot, { recursive: true });
    await writeJar(
      path.join(jarOnlyRoot, 'OZJarOnly.jar'),
      'name: "OZ - Jar Only"\nversion: "2.1.0"\n',
    );

    const response = await request(createApp()).get('/plugins/ozadminutils/plugins').expect(200);

    expect(response.body.plugins).toEqual([
      { directory: 'OZAdminUtils', name: 'OZ - Admin Utils', version: '1.0.0', valid: true },
      { directory: 'OZGPS', name: 'OZ - GPS', version: '1.0.0', valid: true },
      { directory: 'OZJarOnly', name: 'OZ - Jar Only', version: '2.1.0', valid: true },
      { directory: 'OZLandClaim', name: 'OZ - Land Claim', version: '1.0.0', valid: true },
      { directory: 'OZMarketplace', name: 'OZ - Marketplace', version: '1.0.0', valid: true },
      { directory: 'OZShop', name: 'OZ - Shop', version: '1.0.0', valid: true },
    ]);
  });

  it('serves player list', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;

    const response = await request(createApp()).get('/plugins/ozadminutils/playerlist').expect(200);

    expect(response.body).toEqual({
      schemaVersion: 1,
      generatedAt: expect.any(String),
      players: [
        expect.objectContaining({
          id: 1,
          uid: 'steam-1',
          name: 'Tester',
          platform: 'Steam',
        }),
      ],
    });
  });

  it('overlays fresh Admin Utils live positions on persisted players', async () => {
    const { root, databasePath } = createServerRoot();
    process.env.SERVER_ROOT = root;
    const database = new Database(databasePath);
    database.exec(`
      CREATE TABLE live_player_positions_v1 (
        uid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pos_x REAL NOT NULL,
        pos_y REAL NOT NULL,
        pos_z REAL NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );
    `);
    database.prepare(`
      INSERT INTO live_player_positions_v1 (uid, name, pos_x, pos_y, pos_z, updated_at_ms)
      VALUES ('steam-1', 'Tester Live', 101, 202, 303, ?)
    `).run(Date.now());
    database.close();

    const response = await request(createApp()).get('/plugins/ozadminutils/playerlist').expect(200);

    expect(response.body.players[0]).toEqual(expect.objectContaining({
      uid: 'steam-1',
      name: 'Tester Live',
      posx: 101,
      posy: 202,
      posz: 303,
      online: true,
    }));
  });

  it('ignores stale Admin Utils live positions', async () => {
    const { root, databasePath } = createServerRoot();
    process.env.SERVER_ROOT = root;
    const database = new Database(databasePath);
    database.exec(`
      CREATE TABLE live_player_positions_v1 (
        uid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pos_x REAL NOT NULL,
        pos_y REAL NOT NULL,
        pos_z REAL NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );
    `);
    database.prepare(`
      INSERT INTO live_player_positions_v1 (uid, name, pos_x, pos_y, pos_z, updated_at_ms)
      VALUES ('steam-1', 'Stale', 101, 202, 303, ?)
    `).run(Date.now() - 60000);
    database.close();

    const response = await request(createApp()).get('/plugins/ozadminutils/playerlist').expect(200);

    expect(response.body.players[0]).toEqual(expect.objectContaining({
      uid: 'steam-1',
      name: 'Tester',
      posx: 10,
      posy: 20,
      posz: 30,
    }));
  });

  it('serves masked server config', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;

    const response = await request(createApp()).get('/plugins/ozadminutils/server-config').expect(200);

    expect(response.body).toEqual({
      schemaVersion: 1,
      generatedAt: expect.any(String),
      config: expect.objectContaining({
        World_Name: 'world',
        Server_Name: 'Bridge Test',
        Server_Password: '***',
      }),
    });
  });

  it('serves world areas from the world database', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;

    const response = await request(createApp()).get('/plugins/ozadminutils/world-areas').expect(200);

    expect(response.body).toEqual({
      schemaVersion: 1,
      worldName: 'world',
      generatedAt: expect.any(String),
      settings: {
        ownerAreaPermission: 'ozlc-owner',
        defaultAreaPermission: 'ozlc-guest',
        otherAreaBorderColor: '0x11223344',
        renewAreaBorderColor: '0x00C2A89c',
        renewAreaFrameColor: '0x00C2A8AA',
      },
      areas: [
        {
          id: 42,
          name: 'Spawn Claim',
          permission: 'ozlc-guest',
          priority: 0,
          ownerUid: 'steam-1',
          ownerDbId: 1,
          ownerName: 'Tester',
          startX: -64,
          startY: 0,
          startZ: 32,
          endX: -32.01,
          endY: 64,
          endZ: 95.99,
          createdAt: '1970-01-01T00:16:40.000Z',
        },
      ],
    });
  });

  it('serves global GPS markers', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;

    const response = await request(createApp()).get('/plugins/ozgps/marker?type=global').expect(200);

    expect(response.body).toEqual({
      schemaVersion: 1,
      type: 'global',
      generatedAt: expect.any(String),
      markers: [
        {
          id: 1,
          name: 'Spawn',
          x: 10,
          y: 20,
          z: 30,
          icon: 'menu-global-marker',
          color: '#FF00FF80',
          createdAt: '1970-01-01T00:00:01.000Z',
        },
      ],
    });
  });

  it('serves marketplace zones', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;

    const response = await request(createApp()).get('/plugins/ozmarketplace/zones').expect(200);

    expect(response.body).toEqual({
      schemaVersion: 1,
      generatedAt: expect.any(String),
      zones: [
        {
          id: 'zone-1',
          name: 'Spawn Market',
          areaId: 42,
          createdAt: '1970-01-01T00:00:01.000Z',
        },
      ],
    });
  });

  it('serves marketplace offers for an area', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;

    const response = await request(createApp()).get('/plugins/ozmarketplace/offers?areaId=42').expect(200);

    expect(response.body).toEqual({
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

  it('serves shop zones', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;

    const response = await request(createApp()).get('/plugins/ozshop/zones').expect(200);

    expect(response.body).toEqual({
      schemaVersion: 1,
      generatedAt: expect.any(String),
      zones: [
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

  it('serves land claim sale listings', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;

    const response = await request(createApp()).get('/plugins/ozlandclaim/claim-sales').expect(200);

    expect(response.body).toEqual({
      schemaVersion: 1,
      worldName: 'world',
      generatedAt: expect.any(String),
      listings: [
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

  it('serves land claim renew zones', async () => {
    const { root } = createServerRoot();
    process.env.SERVER_ROOT = root;

    const response = await request(createApp()).get('/plugins/ozlandclaim/renew-zones').expect(200);

    expect(response.body).toEqual({
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
      ],
    });
  });

  it('rejects invalid marketplace area id', async () => {
    await request(createApp())
      .get('/plugins/ozmarketplace/offers?areaId=invalid')
      .expect(400)
      .expect({
        error: 'invalid_area_id',
        message: 'areaId must be a positive integer',
      });
  });

  it('rejects invalid lastChange', async () => {
    await request(createApp())
      .get('/plugins/ozadminutils/map?lastChange=invalid')
      .expect(400)
      .expect({
        error: 'invalid_last_change',
        message: 'lastChange must be epoch milliseconds or an ISO date string',
      });
  });

  it('hides disabled routes', async () => {
    process.env.EXPOSE_OZADMINUTILS_MAP = 'false';

    await request(createApp()).get('/plugins/ozadminutils/map').expect(404).expect({ error: 'not_found' });
  });

  it('hides disabled playerlist and server config routes', async () => {
    process.env.EXPOSE_OZADMINUTILS_PLAYERLIST = 'false';
    process.env.EXPOSE_OZADMINUTILS_SERVER_CONFIG = 'false';
    process.env.EXPOSE_OZADMINUTILS_WORLD_AREAS = 'false';

    await request(createApp()).get('/plugins/ozadminutils/playerlist').expect(404).expect({ error: 'not_found' });
    await request(createApp()).get('/plugins/ozadminutils/server-config').expect(404).expect({ error: 'not_found' });
    await request(createApp()).get('/plugins/ozadminutils/world-areas').expect(404).expect({ error: 'not_found' });
  });

  it('hides disabled GPS marker route', async () => {
    process.env.EXPOSE_OZGPS_MARKERS = 'false';

    await request(createApp()).get('/plugins/ozgps/marker?type=global').expect(404).expect({ error: 'not_found' });
  });

  it('hides disabled marketplace routes', async () => {
    process.env.EXPOSE_OZMARKETPLACE = 'false';

    await request(createApp()).get('/plugins/ozmarketplace/zones').expect(404).expect({ error: 'not_found' });
    await request(createApp()).get('/plugins/ozmarketplace/offers?areaId=42').expect(404).expect({ error: 'not_found' });
  });

  it('hides disabled shop routes', async () => {
    process.env.EXPOSE_OZSHOP = 'false';

    await request(createApp()).get('/plugins/ozshop/zones').expect(404).expect({ error: 'not_found' });
  });

  it('hides disabled land claim routes', async () => {
    process.env.EXPOSE_OZLANDCLAIM = 'false';

    await request(createApp()).get('/plugins/ozlandclaim/claim-sales').expect(404).expect({ error: 'not_found' });
    await request(createApp()).get('/plugins/ozlandclaim/renew-zones').expect(404).expect({ error: 'not_found' });
  });
});

function writeJar(filePath: string, manifest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const zip = new ZipFile();
    zip.addBuffer(Buffer.from(manifest), 'resources/plugin.yml');
    zip.outputStream
      .pipe(createWriteStream(filePath))
      .on('close', resolve)
      .on('error', reject);
    zip.end();
  });
}
