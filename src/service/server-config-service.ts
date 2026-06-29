import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AppConfig } from '../utils/app-config.js';

export class ServerConfigUnavailableError extends Error {}

export function getServerConfig(rootPath: string = AppConfig.serverRoot): Record<string, unknown> {
  const configPath = path.resolve(rootPath, 'server.properties');
  if (!existsSync(configPath)) {
    throw new ServerConfigUnavailableError(`Config file not found at ${configPath}`);
  }
  const config: Record<string, unknown> = {};
  const rawAdmins = new Map<string, string>();
  for (const line of readFileSync(configPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const separator = firstSeparator(trimmed);
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!key) continue;
    if (key.toLowerCase().includes('password')) {
      config[key] = '***';
    } else {
      config[key] = parsePropertyValue(rawValue);
    }
    if (key === 'Server_Admins') rawAdmins.set(key, rawValue);
  }
  if (rawAdmins.has('Server_Admins')) {
    config.Server_Admins = rawAdmins.get('Server_Admins') ?? '';
  }
  return config;
}

export function getWorldName(rootPath: string = AppConfig.serverRoot): string {
  return getServerConfig(rootPath).World_Name?.toString() ?? 'default';
}

function firstSeparator(line: string): number {
  const equals = line.indexOf('=');
  const colon = line.indexOf(':');
  if (equals < 0) return colon;
  if (colon < 0) return equals;
  return Math.min(equals, colon);
}

function parsePropertyValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const number = Number(value);
  if (value !== '' && Number.isFinite(number)) return number;
  return value;
}
