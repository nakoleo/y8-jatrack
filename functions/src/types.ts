export type EntrySyncAction = 'create' | 'update' | 'delete';
export type SheetSyncStatus = 'pending' | 'synced' | 'failed';

export interface DriveAttachment {
  originalName?: string;
  normalizedName?: string;
  fileId?: string;
  link?: string;
  mimeType?: string;
}

export interface SheetSyncState {
  status: SheetSyncStatus;
  action?: EntrySyncAction;
  lastAttemptedAt?: number;
  lastSuccessAt?: number;
  lastError?: string;
  revision?: number;
}

export interface EntryDocument {
  id: string;
  date: string;
  user: string;
  userName?: string;
  email?: string;
  role?: string;
  groupId: string;
  groupName?: string;
  taskId: string;
  taskName?: string;
  quantity: number;
  unit?: string;
  creditPerUnit?: number;
  brands?: string[];
  credits: number;
  notes: string;
  createdAt: number;
  updatedAt?: number;
  channel?: string;
  canvaLink?: string;
  driveLink?: string;
  attachments?: DriveAttachment[];
  sheetSync?: SheetSyncState;
}

export interface MonthlySummaryStats {
  totalCredits: number;
  targetCredits: number;
  entryCount: number;
  percent: number;
}
