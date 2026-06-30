import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { PluginInfoDto } from '../dto/ozadminutils-plugins-response.js';
import { AppConfig } from '../utils/app-config.js';

export async function listPlugins(rootPath: string = AppConfig.serverRoot): Promise<PluginInfoDto[]> {
  const pluginsPath = path.join(rootPath, 'Plugins');
  const entries = await readdir(pluginsPath, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));

  return Promise.all(
    directories.map(async (entry): Promise<PluginInfoDto> => {
      const pluginPath = path.join(pluginsPath, entry.name);
      const manifest = await readManifest(pluginPath);
      if (!manifest) {
        return {
          directory: entry.name,
          name: entry.name,
          valid: await hasJar(pluginPath),
        };
      }
      return {
        directory: entry.name,
        name: typeof manifest.name === 'string' ? manifest.name : undefined,
        version: typeof manifest.version === 'string' ? manifest.version : undefined,
        valid: true,
      };
    }),
  );
}

async function hasJar(pluginPath: string): Promise<boolean> {
  try {
    const entries = await readdir(pluginPath, { withFileTypes: true });
    return entries.some((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.jar'));
  } catch {
    return false;
  }
}

async function readManifest(pluginPath: string): Promise<Record<string, unknown> | null> {
  for (const relativePath of ['plugin.yml', path.join('resources', 'plugin.yml')]) {
    try {
      const content = await readFile(path.join(pluginPath, relativePath), 'utf8');
      const parsed = YAML.parse(content) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch (error) {
      if (isMissing(error)) continue;
      return null;
    }
  }
  return null;
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
