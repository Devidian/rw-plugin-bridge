import type { MapGpsMarker } from '../interfaces/map-layer.js';

export interface OzGpsMarkerResponse {
  schemaVersion: 1;
  type: 'global';
  generatedAt: string;
  markers: MapGpsMarker[];
}
