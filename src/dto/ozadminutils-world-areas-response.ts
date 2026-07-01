export interface OzAdminUtilsWorldAreaDto {
  id: number;
  name: string;
  permission: string;
  priority: number;
  ownerUid?: string;
  ownerDbId?: number;
  ownerName?: string;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  createdAt: string | null;
}

export interface OzAdminUtilsWorldAreasResponse {
  schemaVersion: 1;
  worldName: string;
  generatedAt: string;
  settings?: Record<string, string>;
  areas: OzAdminUtilsWorldAreaDto[];
}
