export interface PluginInfoDto {
  directory: string;
  name?: string;
  version?: string;
  valid: boolean;
}

export interface OzAdminUtilsPluginsResponse {
  schemaVersion: 1;
  generatedAt: string;
  plugins: PluginInfoDto[];
}
