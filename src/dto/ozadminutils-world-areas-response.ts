export interface OzAdminUtilsWorldAreaDto {
  id: number;
  name: string;
  permission: string;
  priority: number;
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
  areas: OzAdminUtilsWorldAreaDto[];
}
