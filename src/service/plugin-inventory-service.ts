import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import yauzl, { type Entry, type ZipFile } from 'yauzl';
import type { PluginInfoDto } from '../dto/ozadminutils-plugins-response.js';
import { AppConfig } from '../utils/app-config.js';

const pluginManifestPath = 'resources/plugin.yml';
const maximumManifestBytes = 64 * 1024;

interface PluginManifest {
  name?: unknown;
  version?: unknown;
}

export async function listPlugins(rootPath: string = AppConfig.serverRoot): Promise<PluginInfoDto[]> {
  const pluginsPath = path.join(rootPath, 'Plugins');
  const entries = await readdir(pluginsPath, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));

  return Promise.all(
    directories.map(async (entry): Promise<PluginInfoDto> => {
      const pluginPath = path.join(pluginsPath, entry.name);
      try {
        const yaml = await readPluginManifest(pluginPath, entry.name);
        const manifest = YAML.parse(yaml) as PluginManifest | null;
        if (
          manifest === null ||
          typeof manifest !== 'object' ||
          typeof manifest.name !== 'string' ||
          manifest.name.trim() === '' ||
          typeof manifest.version !== 'string' ||
          manifest.version.trim() === ''
        ) {
          return jarFallback(pluginPath, entry.name);
        }
        return {
          directory: entry.name,
          name: manifest.name.trim(),
          version: manifest.version.trim(),
          valid: true,
        };
      } catch {
        return jarFallback(pluginPath, entry.name);
      }
    }),
  );
}

async function jarFallback(pluginPath: string, directory: string): Promise<PluginInfoDto> {
  return {
    directory,
    name: directory,
    valid: await hasJar(pluginPath),
  };
}

async function readPluginManifest(
  pluginPath: string,
  directory: string,
): Promise<string> {
  const entries = await readdir(pluginPath, { withFileTypes: true });
  const jars = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.jar'))
    .map((entry) => entry.name)
    .sort((left, right) => {
      const expected = `${directory}.jar`;
      if (left === expected) return -1;
      if (right === expected) return 1;
      return left.localeCompare(right);
    });

  for (const jar of jars) {
    try {
      return await readJarEntry(path.join(pluginPath, jar), pluginManifestPath);
    } catch (error) {
      if (!(error instanceof JarEntryNotFoundError)) throw error;
    }
  }

  return readFile(path.join(pluginPath, 'plugin.yml'), 'utf8');
}

async function hasJar(pluginPath: string): Promise<boolean> {
  try {
    const entries = await readdir(pluginPath, { withFileTypes: true });
    return entries.some((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.jar'));
  } catch {
    return false;
  }
}

function readJarEntry(jarPath: string, entryPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.open(jarPath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(openError ?? new Error(`Unable to open JAR: ${jarPath}`));
        return;
      }
      readZipEntry(zipFile, entryPath).then(resolve, reject);
    });
  });
}

function readZipEntry(zipFile: ZipFile, entryPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fail = (error: Error) => {
      zipFile.close();
      reject(error);
    };
    zipFile.on('error', fail);
    zipFile.on('end', () => fail(new JarEntryNotFoundError(entryPath)));
    zipFile.on('entry', (entry: Entry) => {
      if (entry.fileName !== entryPath) {
        zipFile.readEntry();
        return;
      }
      if (entry.uncompressedSize > maximumManifestBytes) {
        fail(new Error(`Plugin manifest exceeds ${maximumManifestBytes} bytes`));
        return;
      }
      zipFile.openReadStream(entry, (streamError, stream) => {
        if (streamError || !stream) {
          fail(streamError ?? new Error(`Unable to read JAR entry: ${entryPath}`));
          return;
        }
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', fail);
        stream.on('end', () => {
          zipFile.close();
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
      });
    });
    zipFile.readEntry();
  });
}

class JarEntryNotFoundError extends Error {}
