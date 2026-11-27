import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function readLandClaimSettings(rootPath: string): Record<string, string> {
  const settingsPath = path.join(rootPath, 'Plugins', 'OZLandClaim', 'settings.properties');
  if (!existsSync(settingsPath)) return {};
  const settings: Record<string, string> = {};
  for (const line of readFileSync(settingsPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const equals = trimmed.indexOf('=');
    const colon = trimmed.indexOf(':');
    const separator = equals < 0 ? colon : colon < 0 ? equals : Math.min(equals, colon);
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key) continue;
    settings[key] = trimmed.slice(separator + 1).trim();
  }
  return settings;
}
