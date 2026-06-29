export class AppConfig {
  static get host(): string {
    return process.env.HOST?.trim() || '0.0.0.0';
  }

  static get port(): number {
    return boundedInteger(process.env.PORT, 3000, 1, 65535);
  }

  static get serverRoot(): string {
    return process.env.SERVER_ROOT?.trim() || '/appdata/rising-world/dedicated-server';
  }

  static get adminUtilsMapDbPath(): string | undefined {
    return process.env.ADMINUTILS_MAP_DB_PATH?.trim() || undefined;
  }

  static get adminUtilsMapWorldName(): string | undefined {
    return process.env.ADMINUTILS_MAP_WORLD_NAME?.trim() || undefined;
  }

  static get exposeOzAdminUtilsMap(): boolean {
    return booleanFlag(process.env.EXPOSE_OZADMINUTILS_MAP, true);
  }

  static get exposeOzAdminUtilsPlugins(): boolean {
    return booleanFlag(process.env.EXPOSE_OZADMINUTILS_PLUGINS, true);
  }

  static get exposeOzAdminUtilsPlayerlist(): boolean {
    return booleanFlag(process.env.EXPOSE_OZADMINUTILS_PLAYERLIST, true);
  }

  static get exposeOzAdminUtilsServerConfig(): boolean {
    return booleanFlag(process.env.EXPOSE_OZADMINUTILS_SERVER_CONFIG, true);
  }

  static get exposeOzAdminUtilsWorldAreas(): boolean {
    return booleanFlag(process.env.EXPOSE_OZADMINUTILS_WORLD_AREAS, true);
  }

  static get exposeOzGpsMarkers(): boolean {
    return booleanFlag(process.env.EXPOSE_OZGPS_MARKERS, true);
  }

  static get exposeOzMarketplace(): boolean {
    return booleanFlag(process.env.EXPOSE_OZMARKETPLACE, true);
  }

  static get exposeOzShop(): boolean {
    return booleanFlag(process.env.EXPOSE_OZSHOP, true);
  }

  static get exposeOzLandClaim(): boolean {
    return booleanFlag(process.env.EXPOSE_OZLANDCLAIM, true);
  }

  static get sqliteBusyTimeoutMs(): number {
    return boundedInteger(process.env.SQLITE_BUSY_TIMEOUT_MS, 5000, 0, 30000);
  }

  static get logLevel(): 'debug' | 'info' | 'warn' | 'error' | 'off' {
    const value = process.env.LOG_LEVEL;
    return value === 'debug' || value === 'info' || value === 'warn' || value === 'error' || value === 'off'
      ? value
      : 'info';
  }
}

function booleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return value === 'true';
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}
