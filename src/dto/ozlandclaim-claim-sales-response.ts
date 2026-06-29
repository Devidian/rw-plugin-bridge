import type { MapClaimSaleListing } from '../interfaces/map-layer.js';

export interface OzLandClaimClaimSalesResponse {
  schemaVersion: 1;
  worldName: string;
  generatedAt: string;
  listings: MapClaimSaleListing[];
}
