import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { readLandClaimSettings } from '../src/service/land-claim-settings.js';
import { tableHasColumns } from '../src/utils/sqlite.js';

describe('source reader helpers', () => {
  it('checks the schema of empty tables and rejects missing tables or columns', () => {
    const database = new Database(':memory:');
    try {
      database.exec('CREATE TABLE claims(id INTEGER, owner TEXT)');
      expect(tableHasColumns(database, 'claims', ['id', 'owner'])).toBe(true);
      expect(tableHasColumns(database, 'claims', ['id', 'price'])).toBe(false);
      expect(tableHasColumns(database, 'missing', ['id'])).toBe(false);
    } finally {
      database.close();
    }
  });

  it('reads either first separator and skips blank, comment and invalid property lines', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'rw-bridge-settings-'));
    try {
      expect(readLandClaimSettings(root)).toEqual({});
      const directory = path.join(root, 'Plugins', 'OZLandClaim');
      mkdirSync(directory, { recursive: true });
      writeFileSync(path.join(directory, 'settings.properties'), [
        '# ignore',
        '! ignore',
        '',
        'ownerAreaPermission : ozlc-owner',
        'renewAreaBorderColor = 0x11223344',
        'value = first:second',
        'another: first=second',
        'without separator',
        '=missing-key',
      ].join('\r\n'));
      expect(readLandClaimSettings(root)).toEqual({
        ownerAreaPermission: 'ozlc-owner',
        renewAreaBorderColor: '0x11223344',
        value: 'first:second',
        another: 'first=second',
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
