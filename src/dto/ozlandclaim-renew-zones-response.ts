export interface OzLandClaimRenewZoneDto {
  world: string;
  areaId: number;
  intervalHours: number;
  lastResetAt: number;
  nextRenewalAt: number;
  borderColor: string;
  frameColor: string;
}

export interface OzLandClaimRenewZonesResponse {
  schemaVersion: 1;
  worldName: string;
  generatedAt: string;
  zones: OzLandClaimRenewZoneDto[];
}

