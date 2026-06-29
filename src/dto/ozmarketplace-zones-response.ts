import type { MapMarketplaceZone } from '../interfaces/map-layer.js';

export interface OzMarketplaceZonesResponse {
  schemaVersion: 1;
  generatedAt: string;
  zones: MapMarketplaceZone[];
}
