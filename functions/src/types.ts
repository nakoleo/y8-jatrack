export type EntrySyncAction = 'create' | 'update' | 'delete';
export type SheetSyncStatus = 'pending' | 'synced' | 'failed';
export type CalendarEventKind = 'content' | 'launch' | 'general';

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

export interface OrgCalendarConfig {
  enabled: boolean;
  label: string;
  timezone: string;
  y8ContentFeedUrl: string;
  updatedAt?: number;
  lastValidatedAt?: number;
  lastSyncStatus?: 'ok' | 'error' | 'disabled';
  lastError?: string | null;
  lastEventCount?: number;
}

export interface NormalizedCalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  timezone: string;
  brand: string;
  product: string;
  contentType: string;
  launchDate?: string;
  rawCategoryText?: string;
  kind: CalendarEventKind;
}
