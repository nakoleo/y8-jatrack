import { describe, expect, it } from 'vitest';

import { SheetsSyncService, type SheetGateway, type SheetMeta } from '../src/sheets.js';
import type { EntryDocument } from '../src/types.js';

class InMemorySheetGateway implements SheetGateway {
  private sheets = new Map<string, string[][]>();
  private ids = new Map<string, number>();
  private nextId = 1;

  async listSheets(): Promise<SheetMeta[]> {
    return [...this.sheets.keys()].map((title) => ({
      title,
      sheetId: this.ids.get(title) || 0,
      hidden: title.startsWith('_'),
    }));
  }

  async addSheet(title: string) {
    if (!this.sheets.has(title)) {
      this.sheets.set(title, []);
      this.ids.set(title, this.nextId++);
    }
  }

  async getRows(title: string) {
    return [...(this.sheets.get(title) || [])].map((row) => [...row]);
  }

  async appendRow(title: string, row: string[]) {
    const rows = this.sheets.get(title) || [];
    rows.push([...row]);
    this.sheets.set(title, rows);
    return rows.length;
  }

  async updateRow(title: string, rowNumber: number, row: string[]) {
    const rows = this.sheets.get(title) || [];
    rows[rowNumber - 1] = [...row];
    this.sheets.set(title, rows);
  }

  async deleteRow(title: string, rowNumber: number) {
    const rows = this.sheets.get(title) || [];
    rows.splice(rowNumber - 1, 1);
    this.sheets.set(title, rows);
  }

  async deleteSheet(title: string) {
    this.sheets.delete(title);
    this.ids.delete(title);
  }
}

const entry = (overrides: Partial<EntryDocument> = {}): EntryDocument => ({
  id: 'entry-1',
  date: '2026-03-12',
  user: 'uid-1',
  userName: 'Gift',
  email: 'gift@example.com',
  role: 'custom',
  groupId: 'A',
  groupName: 'Social Media',
  taskId: 'A01',
  taskName: 'Artwork',
  quantity: 1,
  unit: 'post',
  creditPerUnit: 1,
  credits: 1,
  notes: 'initial',
  createdAt: 1,
  updatedAt: 1,
  channel: 'FB',
  canvaLink: '',
  driveLink: '',
  attachments: [],
  ...overrides,
});

describe('SheetsSyncService', () => {
  it('creates new rows and index record', async () => {
    const gateway = new InMemorySheetGateway();
    const service = new SheetsSyncService(gateway);

    await service.syncEntry('create', entry());

    const masterRows = await gateway.getRows('ALL_ENTRIES');
    const indexRows = await gateway.getRows('_ENTRY_INDEX');

    expect(masterRows).toHaveLength(2);
    expect(masterRows[1][0]).toBe('create');
    expect(masterRows[1][3]).toBe('entry-1');
    expect(indexRows).toHaveLength(2);
    expect(indexRows[1][0]).toBe('entry-1');
    expect(indexRows[1][2]).toBe('2');
  });

  it('updates existing rows without appending duplicates', async () => {
    const gateway = new InMemorySheetGateway();
    const service = new SheetsSyncService(gateway);

    await service.syncEntry('create', entry());
    await service.syncEntry('update', entry({ notes: 'updated', credits: 3, updatedAt: 2 }));

    const masterRows = await gateway.getRows('ALL_ENTRIES');
    expect(masterRows).toHaveLength(2);
    expect(masterRows[1][0]).toBe('update');
    expect(masterRows[1][15]).toBe('3');
    expect(masterRows[1][16]).toBe('updated');
  });

  it('deletes rows and keeps index marked deleted', async () => {
    const gateway = new InMemorySheetGateway();
    const service = new SheetsSyncService(gateway);

    await service.syncEntry('create', entry());
    await service.syncEntry('delete', entry());

    const masterRows = await gateway.getRows('ALL_ENTRIES');
    const indexRows = await gateway.getRows('_ENTRY_INDEX');

    expect(masterRows).toHaveLength(1);
    expect(indexRows).toHaveLength(2);
    expect(indexRows[1][5]).toBe('deleted');
  });

  it('cleans all user artifacts during admin delete flow', async () => {
    const gateway = new InMemorySheetGateway();
    const service = new SheetsSyncService(gateway);

    await service.syncEntry('create', entry());
    await service.syncEntry('create', entry({ id: 'entry-2', taskId: 'A02', updatedAt: 2, createdAt: 2 }));
    await service.deleteUserArtifacts('uid-1', 'Gift');

    expect(await gateway.getRows('ALL_ENTRIES')).toHaveLength(1);
    expect(await gateway.getRows('_ENTRY_INDEX')).toHaveLength(1);
    expect(await gateway.listSheets()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ title: expect.stringContaining('KPI_MASTER') })]),
    );
  });
});
