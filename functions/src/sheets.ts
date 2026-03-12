import { google, sheets_v4 } from 'googleapis';

import type { EntryDocument, EntrySyncAction } from './types.js';

const MASTER_SHEET = 'ALL_ENTRIES';
const INDEX_SHEET = '_ENTRY_INDEX';
const USER_REGISTRY_SHEET = '_USER_REGISTRY';

const ENTRY_HEADERS = [
  'action',
  'timestamp',
  'date',
  'entry_id',
  'uid',
  'email',
  'nickname',
  'role',
  'group_id',
  'group_name',
  'task_id',
  'task_name',
  'quantity',
  'unit',
  'credit_per_unit',
  'credits',
  'notes',
  'canva_link',
  'drive_link',
  'attachments_count',
  'attachments_names',
  'attachments_links',
  'updated_at',
];

const INDEX_HEADERS = [
  'entry_id',
  'uid',
  'master_row',
  'user_sheet',
  'user_row',
  'status',
  'updated_at',
];

const USER_REGISTRY_HEADERS = [
  'uid',
  'email',
  'nickname',
  'role',
  'user_sheet',
  'updated_at',
];

export interface SheetMeta {
  title: string;
  sheetId: number;
  hidden?: boolean;
}

export interface SheetGateway {
  listSheets(): Promise<SheetMeta[]>;
  addSheet(title: string, hidden?: boolean): Promise<void>;
  getRows(title: string): Promise<string[][]>;
  appendRow(title: string, row: string[]): Promise<number>;
  updateRow(title: string, rowNumber: number, row: string[]): Promise<void>;
  deleteRow(title: string, rowNumber: number): Promise<void>;
  deleteSheet(title: string): Promise<void>;
}

export interface SheetIndexRecord {
  indexRowNumber?: number;
  entryId: string;
  uid: string;
  masterRow: number | null;
  userSheet: string;
  userRow: number | null;
  status: string;
  updatedAt: number;
}

const sheetSafe = (value: string, fallback = 'User') => {
  const cleaned = value
    .trim()
    .replace(/[\\/?*\[\]:]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 70);
  return cleaned || fallback;
};

export const buildSheetNames = (nickname: string, uid?: string) => {
  const uidTag = (uid || 'xxxxxx').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'xxxxxx';
  const base = sheetSafe(nickname, `User_${uidTag}`).slice(0, 50);
  const ownerKey = `${base}_${uidTag}`;
  return {
    ownerKey,
    masterSheetName: `${ownerKey}_KPI_MASTER`,
    dashboardSheetName: `${ownerKey}_Dashboard`,
  };
};

const toA1Range = (sheet: string, row: number) => `${sheet}!A${row}:W${row}`;

const parseRowFromUpdatedRange = (updatedRange?: string | null) => {
  const match = updatedRange?.match(/![A-Z]+(\d+):/);
  return match ? Number(match[1]) : 0;
};

export class GoogleSheetsGateway implements SheetGateway {
  private sheetsClient: sheets_v4.Sheets | null = null;

  constructor(
    private readonly spreadsheetId: string,
    private readonly serviceAccountJson: string,
  ) {}

  private async getClient() {
    if (this.sheetsClient) return this.sheetsClient;
    const credentials = JSON.parse(this.serviceAccountJson) as {
      client_email: string;
      private_key: string;
    };
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheetsClient = google.sheets({ version: 'v4', auth });
    return this.sheetsClient;
  }

  async listSheets() {
    const client = await this.getClient();
    const res = await client.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: 'sheets(properties(sheetId,title,hidden))',
    });
    return (res.data.sheets || []).map((sheet) => ({
      title: sheet.properties?.title || '',
      sheetId: sheet.properties?.sheetId || 0,
      hidden: sheet.properties?.hidden || false,
    }));
  }

  async addSheet(title: string, hidden = false) {
    const client = await this.getClient();
    await client.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title,
                hidden,
              },
            },
          },
        ],
      },
    });
  }

  async getRows(title: string) {
    const client = await this.getClient();
    const res = await client.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${title}!A:W`,
    });
    return (res.data.values || []).map((row) => row.map((value) => String(value)));
  }

  async appendRow(title: string, row: string[]) {
    const client = await this.getClient();
    const res = await client.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${title}!A:W`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
    return parseRowFromUpdatedRange(res.data.updates?.updatedRange);
  }

  async updateRow(title: string, rowNumber: number, row: string[]) {
    const client = await this.getClient();
    await client.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: toA1Range(title, rowNumber),
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
  }

  async deleteRow(title: string, rowNumber: number) {
    const client = await this.getClient();
    const sheet = (await this.listSheets()).find((item) => item.title === title);
    if (!sheet) return;
    await client.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });
  }

  async deleteSheet(title: string) {
    const client = await this.getClient();
    const sheet = (await this.listSheets()).find((item) => item.title === title);
    if (!sheet) return;
    await client.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [{ deleteSheet: { sheetId: sheet.sheetId } }],
      },
    });
  }
}

const stringify = (value: unknown) => (value === undefined || value === null ? '' : String(value));

export const buildEntryRow = (action: EntrySyncAction, entry: EntryDocument) => {
  const attachments = entry.attachments || [];
  return [
    action,
    new Date(entry.updatedAt || entry.createdAt || Date.now()).toISOString(),
    stringify(entry.date),
    stringify(entry.id),
    stringify(entry.user),
    stringify(entry.email),
    stringify(entry.userName),
    stringify(entry.role),
    stringify(entry.groupId),
    stringify(entry.groupName),
    stringify(entry.taskId),
    stringify(entry.taskName),
    stringify(entry.quantity),
    stringify(entry.unit),
    stringify(entry.creditPerUnit),
    stringify(entry.credits),
    stringify(entry.notes),
    stringify(entry.canvaLink),
    stringify(entry.driveLink),
    stringify(attachments.length),
    attachments.map((attachment) => attachment.normalizedName || attachment.originalName || '').filter(Boolean).join(' | '),
    attachments.map((attachment) => attachment.link || '').filter(Boolean).join(' | '),
    stringify(entry.updatedAt || entry.createdAt),
  ];
};

export class SheetsSyncService {
  constructor(private readonly gateway: SheetGateway) {}

  async ensureBaseSheets() {
    await this.ensureSheet(MASTER_SHEET);
    await this.ensureSheet(INDEX_SHEET, true);
    await this.ensureSheet(USER_REGISTRY_SHEET, true);
    await this.ensureHeaders(MASTER_SHEET, ENTRY_HEADERS);
    await this.ensureHeaders(INDEX_SHEET, INDEX_HEADERS);
    await this.ensureHeaders(USER_REGISTRY_SHEET, USER_REGISTRY_HEADERS);
  }

  async syncEntry(action: EntrySyncAction, entry: EntryDocument) {
    await this.ensureBaseSheets();
    const displayName = (entry.userName || entry.email || entry.user || 'User').trim();
    const userSheet = buildSheetNames(displayName, entry.user).masterSheetName;

    await this.ensureSheet(userSheet);
    await this.ensureHeaders(userSheet, ENTRY_HEADERS);

    const row = buildEntryRow(action, entry);
    let indexRecord = await this.findIndexRecord(entry.id);
    if (!indexRecord && action !== 'create') {
      indexRecord = await this.repairMissingIndex(entry.id, userSheet, entry.user);
    }

    if (action === 'delete') {
      await this.deleteEntry(entry.id, entry.user, userSheet, indexRecord);
      return;
    }

    let masterRow = indexRecord?.masterRow ?? null;
    let userRow = indexRecord?.userRow ?? null;

    if (masterRow) {
      await this.gateway.updateRow(MASTER_SHEET, masterRow, row);
    } else {
      masterRow = await this.gateway.appendRow(MASTER_SHEET, row);
    }

    if (userRow) {
      await this.gateway.updateRow(userSheet, userRow, row);
    } else {
      userRow = await this.gateway.appendRow(userSheet, row);
    }

    await this.upsertIndex({
      ...indexRecord,
      entryId: entry.id,
      uid: entry.user,
      masterRow,
      userSheet,
      userRow,
      status: 'synced',
      updatedAt: entry.updatedAt || entry.createdAt || Date.now(),
    });

    await this.upsertUserRegistry({
      uid: entry.user,
      email: entry.email || '',
      nickname: displayName,
      role: entry.role || '',
      userSheet,
      updatedAt: entry.updatedAt || entry.createdAt || Date.now(),
    });
  }

  async deleteUserArtifacts(uid: string, nickname: string) {
    await this.ensureBaseSheets();
    const masterRows = await this.gateway.getRows(MASTER_SHEET);
    const indexRows = await this.gateway.getRows(INDEX_SHEET);
    const registryRows = await this.gateway.getRows(USER_REGISTRY_SHEET);

    const masterDeleteRows = masterRows
      .slice(1)
      .map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }) => row[4] === uid)
      .map(({ rowNumber }) => rowNumber)
      .sort((a, b) => b - a);
    for (const rowNumber of masterDeleteRows) {
      await this.gateway.deleteRow(MASTER_SHEET, rowNumber);
    }

    const indexDeleteRows = indexRows
      .slice(1)
      .map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }) => row[1] === uid)
      .map(({ rowNumber }) => rowNumber)
      .sort((a, b) => b - a);
    for (const rowNumber of indexDeleteRows) {
      await this.gateway.deleteRow(INDEX_SHEET, rowNumber);
    }

    const registryDeleteRows = registryRows
      .slice(1)
      .map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }) => row[0] === uid)
      .map(({ rowNumber }) => rowNumber)
      .sort((a, b) => b - a);
    for (const rowNumber of registryDeleteRows) {
      await this.gateway.deleteRow(USER_REGISTRY_SHEET, rowNumber);
    }

    const userSheets = buildSheetNames(nickname, uid);
    await this.gateway.deleteSheet(userSheets.masterSheetName);
    await this.gateway.deleteSheet(userSheets.dashboardSheetName);
    await this.rebuildMasterRowReferences();
  }

  private async deleteEntry(
    entryId: string,
    uid: string,
    userSheet: string,
    indexRecord: SheetIndexRecord | null,
  ) {
    const resolvedIndex = indexRecord || await this.repairMissingIndex(entryId, userSheet, uid);
    if (!resolvedIndex) return;

    if (resolvedIndex.masterRow) {
      await this.gateway.deleteRow(MASTER_SHEET, resolvedIndex.masterRow);
      await this.adjustIndexRows(MASTER_SHEET, resolvedIndex.masterRow);
    }

    if (resolvedIndex.userRow && resolvedIndex.userSheet) {
      await this.gateway.deleteRow(resolvedIndex.userSheet, resolvedIndex.userRow);
      await this.adjustIndexRows(resolvedIndex.userSheet, resolvedIndex.userRow);
    }

    await this.upsertIndex({
      ...resolvedIndex,
      entryId,
      uid,
      masterRow: null,
      userSheet,
      userRow: null,
      status: 'deleted',
      updatedAt: Date.now(),
    });
  }

  private async ensureHeaders(title: string, headers: string[]) {
    const rows = await this.gateway.getRows(title);
    if (rows.length === 0) {
      await this.gateway.appendRow(title, headers);
      return;
    }
    const firstRow = rows[0] || [];
    if (headers.some((header, index) => firstRow[index] !== header)) {
      await this.gateway.updateRow(title, 1, headers);
    }
  }

  private async ensureSheet(title: string, hidden = false) {
    const sheets = await this.gateway.listSheets();
    if (sheets.some((sheet) => sheet.title === title)) return;
    await this.gateway.addSheet(title, hidden);
  }

  private async findIndexRecord(entryId: string): Promise<SheetIndexRecord | null> {
    const rows = await this.gateway.getRows(INDEX_SHEET);
    for (const [index, row] of rows.slice(1).entries()) {
      if (row[0] !== entryId) continue;
      return {
        indexRowNumber: index + 2,
        entryId: row[0],
        uid: row[1],
        masterRow: row[2] ? Number(row[2]) : null,
        userSheet: row[3] || '',
        userRow: row[4] ? Number(row[4]) : null,
        status: row[5] || 'synced',
        updatedAt: row[6] ? Number(row[6]) : Date.now(),
      };
    }
    return null;
  }

  private async findRowByEntryId(sheetName: string, entryId: string) {
    const rows = await this.gateway.getRows(sheetName);
    for (const [index, row] of rows.slice(1).entries()) {
      if (row[3] === entryId) return index + 2;
    }
    return null;
  }

  private async repairMissingIndex(entryId: string, userSheet: string, uid: string) {
    const masterRow = await this.findRowByEntryId(MASTER_SHEET, entryId);
    const userRow = await this.findRowByEntryId(userSheet, entryId);
    if (!masterRow && !userRow) return null;
    const record: SheetIndexRecord = {
      entryId,
      uid,
      masterRow,
      userSheet,
      userRow,
      status: 'synced',
      updatedAt: Date.now(),
    };
    await this.upsertIndex(record);
    return this.findIndexRecord(entryId);
  }

  private async upsertIndex(record: SheetIndexRecord) {
    const row = [
      record.entryId,
      record.uid,
      stringify(record.masterRow),
      record.userSheet,
      stringify(record.userRow),
      record.status,
      stringify(record.updatedAt),
    ];
    if (record.indexRowNumber) {
      await this.gateway.updateRow(INDEX_SHEET, record.indexRowNumber, row);
      return;
    }
    await this.gateway.appendRow(INDEX_SHEET, row);
  }

  private async upsertUserRegistry(record: {
    uid: string;
    email: string;
    nickname: string;
    role: string;
    userSheet: string;
    updatedAt: number;
  }) {
    const rows = await this.gateway.getRows(USER_REGISTRY_SHEET);
    const payload = [
      record.uid,
      record.email,
      record.nickname,
      record.role,
      record.userSheet,
      stringify(record.updatedAt),
    ];
    const matchIndex = rows.slice(1).findIndex((row) => row[0] === record.uid);
    if (matchIndex >= 0) {
      await this.gateway.updateRow(USER_REGISTRY_SHEET, matchIndex + 2, payload);
      return;
    }
    await this.gateway.appendRow(USER_REGISTRY_SHEET, payload);
  }

  private async adjustIndexRows(sheetName: string, deletedRow: number) {
    const rows = await this.gateway.getRows(INDEX_SHEET);
    for (const [index, row] of rows.slice(1).entries()) {
      const rowNumber = index + 2;
      const isMaster = sheetName === MASTER_SHEET;
      const currentSheet = row[3] || '';
      const currentRow = Number(isMaster ? row[2] : row[4] || 0);
      if (!currentRow || currentRow <= deletedRow) continue;
      if (!isMaster && currentSheet !== sheetName) continue;
      const nextRow = currentRow - 1;
      row[isMaster ? 2 : 4] = String(nextRow);
      await this.gateway.updateRow(INDEX_SHEET, rowNumber, row);
    }
  }

  private async rebuildMasterRowReferences() {
    const masterRows = await this.gateway.getRows(MASTER_SHEET);
    const indexRows = await this.gateway.getRows(INDEX_SHEET);
    const masterLookup = new Map<string, number>();
    for (const [index, row] of masterRows.slice(1).entries()) {
      if (row[3]) masterLookup.set(row[3], index + 2);
    }
    for (const [index, row] of indexRows.slice(1).entries()) {
      if (!row[0] || row[5] === 'deleted') continue;
      row[2] = stringify(masterLookup.get(row[0]) ?? '');
      await this.gateway.updateRow(INDEX_SHEET, index + 2, row);
    }
  }
}
