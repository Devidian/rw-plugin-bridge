import type { MapShopZone } from '../interfaces/map-layer.js';

export interface OzShopZonesResponse {
  schemaVersion: 1;
  generatedAt: string;
  zones: MapShopZone[];
}
