import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getServerConfig, getWorldName } from '../src/service/server-config-service.js';

function serverRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rw-bridge-config-'));
  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, 'server.properties'), [
    'Server_Name=Bridge Test',
    'Server_Admins=111;222',
    'World_Name=BridgeWorld',
    'Server_Password=secret',
    'Public=true',
    'Max_Players=32',
  ].join('\n'));
  return root;
}

describe('server config service', () => {
  it('reads server.properties and masks password keys', () => {
    expect(getServerConfig(serverRoot())).toEqual({
      Server_Name: 'Bridge Test',
      Server_Admins: '111;222',
      World_Name: 'BridgeWorld',
      Server_Password: '***',
      Public: true,
      Max_Players: 32,
    });
  });

  it('resolves world name with default fallback', () => {
    expect(getWorldName(serverRoot())).toBe('BridgeWorld');
  });
});
