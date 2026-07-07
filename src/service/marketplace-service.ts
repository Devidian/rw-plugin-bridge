import Database from 'better-sqlite3';
import path from 'node:path';
import type { OzMarketplaceOffersResponse } from '../dto/ozmarketplace-offers-response.js';
import type { OzMarketplaceZonesResponse } from '../dto/ozmarketplace-zones-response.js';
import type { MapMarketplaceOffer, MapMarketplaceZone } from '../interfaces/map-layer.js';
import { AppConfig } from '../utils/app-config.js';
import { logSqliteError, openReadonlySqliteDatabase } from '../utils/sqlite.js';
import { getWorldName } from './server-config-service.js';

interface MarketplaceZoneRow {
  id: unknown;
  name: unknown;
  area_id: unknown;
  created_at: unknown;
}

interface MarketplaceOfferRow {
  id: unknown;
  seller_name: unknown;
  item_name: unknown;
  item_variant: unknown;
  amount: unknown;
  price: unknown;
  currency_identifier: unknown;
  created_at: unknown;
}

export class MarketplaceSourceUnavailableError extends Error {}

export function getMarketplaceZones(lastChange?: number): OzMarketplaceZonesResponse {
  const database = openMarketplaceDatabase();
  try {
    if (!tableHasColumns(database, 'marketplace_zones', ['id', 'name', 'area_id', 'created_at'])) {
      throw new MarketplaceSourceUnavailableError('marketplace_zones missing required columns');
    }
    const rows = database.prepare(`
      SELECT id, name, area_id, created_at
      FROM marketplace_zones
      WHERE created_at > ?
      ORDER BY created_at DESC, id DESC
    `).all(lastChange ?? -1) as MarketplaceZoneRow[];
    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      zones: rows.flatMap(mapZoneRow),
    };
  } catch (error) {
    logSqliteError('Marketplace', error);
    throw error;
  } finally {
    database.close();
  }
}

export function getMarketplaceOffers(areaId: number, lastChange?: number): OzMarketplaceOffersResponse {
  if (!Number.isSafeInteger(areaId) || areaId <= 0) {
    throw new MarketplaceSourceUnavailableError('areaId must be a positive integer');
  }
  const database = openMarketplaceDatabase();
  try {
    if (
      !tableHasColumns(database, 'marketplace_zones', ['id', 'area_id']) ||
      !tableHasColumns(database, 'marketplace_listings', [
        'id',
        'seller_name',
        'item_name',
        'item_variant',
        'amount',
        'price',
        'currency_identifier',
        'market_zone_id',
        'created_at',
        'status',
      ])
    ) {
      throw new MarketplaceSourceUnavailableError('marketplace schema missing required columns');
    }
    const zone = database
      .prepare('SELECT id FROM marketplace_zones WHERE area_id = ? LIMIT 1')
      .get(areaId) as { id: string } | undefined;
    const rows = zone
      ? database.prepare(`
          SELECT id, seller_name, item_name, item_variant, amount, price,
                 currency_identifier, created_at
          FROM marketplace_listings
          WHERE status = 'ACTIVE' AND market_zone_id = ? AND created_at > ?
          ORDER BY created_at DESC, id DESC
          LIMIT 30
        `).all(zone.id, lastChange ?? -1) as MarketplaceOfferRow[]
      : [];
    return {
      schemaVersion: 1,
      areaId,
      generatedAt: new Date().toISOString(),
      offers: rows.flatMap(mapOfferRow),
    };
  } catch (error) {
    logSqliteError('Marketplace', error);
    throw error;
  } finally {
    database.close();
  }
}

function openMarketplaceDatabase(): Database.Database {
  const databasePath = marketplaceDatabasePath();
  return openReadonlySqliteDatabase(databasePath, MarketplaceSourceUnavailableError, 'Marketplace');
}

function marketplaceDatabasePath(rootPath: string = AppConfig.serverRoot): string {
  return path.join(rootPath, 'Plugins', 'OZMarketplace', `${getWorldName(rootPath)}.db`);
}

function mapZoneRow(row: MarketplaceZoneRow): MapMarketplaceZone[] {
  if (
    typeof row.id !== 'string' ||
    typeof row.name !== 'string' ||
    !Number.isSafeInteger(row.area_id) ||
    !Number.isSafeInteger(row.created_at) ||
    (row.created_at as number) <= 0
  ) {
    return [];
  }
  return [{
    id: row.id,
    name: row.name,
    areaId: row.area_id as number,
    createdAt: epochMillis(row.created_at),
  }];
}

function mapOfferRow(row: MarketplaceOfferRow): MapMarketplaceOffer[] {
  if (
    !Number.isSafeInteger(row.id) ||
    typeof row.seller_name !== 'string' ||
    typeof row.item_name !== 'string' ||
    !Number.isSafeInteger(row.item_variant) ||
    !Number.isSafeInteger(row.amount) ||
    typeof row.price !== 'number' ||
    typeof row.currency_identifier !== 'string' ||
    !Number.isSafeInteger(row.created_at) ||
    (row.created_at as number) <= 0
  ) {
    return [];
  }
  return [{
    id: row.id as number,
    itemName: row.item_name,
    itemVariant: row.item_variant as number,
    amount: row.amount as number,
    price: row.price,
    currency: row.currency_identifier,
    sellerName: row.seller_name,
    createdAt: epochMillis(row.created_at),
  }];
}

function tableHasColumns(
  database: Database.Database,
  table: string,
  columns: string[],
): boolean {
  const actual = new Set(
    (database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
      .map((column) => column.name),
  );
  return columns.every((column) => actual.has(column));
}

function epochMillis(value: unknown): string {
  return new Date(value as number).toISOString();
}
