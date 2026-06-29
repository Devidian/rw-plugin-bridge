import type { MapMarketplaceOffer } from '../interfaces/map-layer.js';

export interface OzMarketplaceOffersResponse {
  schemaVersion: 1;
  areaId: number;
  generatedAt: string;
  offers: MapMarketplaceOffer[];
}
