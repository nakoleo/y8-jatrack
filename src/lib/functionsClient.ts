import { httpsCallable } from 'firebase/functions';
import type { NormalizedCalendarEvent, OrgCalendarConfig, WorkEntry } from '@/domain/types';

import { functions } from './firebase/client';

export interface AdminDeleteUserPayload {
  uid: string;
}

export interface MonthlySummaryPayload {
  uid: string;
  month: number;
  year: number;
}

export interface MonthlySummaryResponse {
  summary: string;
  stats: {
    totalCredits: number;
    targetCredits: number;
    entryCount: number;
    percent: number;
  };
  source: 'gemini' | 'fallback';
}

export interface SyncEntryToSheetsPayload {
  action: 'create' | 'update' | 'delete';
  uid: string;
  entryId: string;
  entry?: WorkEntry;
}

export interface SyncEntryToSheetsResponse {
  ok: boolean;
  action: 'create' | 'update' | 'delete';
  syncedAt: number;
}

export interface AdminBackfillSheetsPayload {
  scope?: 'all' | 'uid';
  uid?: string;
  dryRun?: boolean;
}

export interface AdminBackfillSheetsResponse {
  ok: boolean;
  scanned: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
}

export interface CalendarFeedResponse {
  config: OrgCalendarConfig;
  events: NormalizedCalendarEvent[];
  fetchedAt: number;
}

export interface UpdateCalendarConfigPayload {
  y8ContentFeedUrl: string;
  enabled: boolean;
  label: string;
  timezone: string;
  validateOnly?: boolean;
}

export interface UpdateCalendarConfigResponse {
  ok: boolean;
  config: OrgCalendarConfig;
  eventCount: number;
}

const adminDeleteUserCallable = httpsCallable<AdminDeleteUserPayload, { ok: boolean }>(functions, 'adminDeleteUser');
const syncEntryToSheetsCallable = httpsCallable<SyncEntryToSheetsPayload, SyncEntryToSheetsResponse>(functions, 'syncEntryToSheets');
const adminBackfillSheetsCallable = httpsCallable<AdminBackfillSheetsPayload, AdminBackfillSheetsResponse>(functions, 'adminBackfillSheets');
const generateMonthlySummaryCallable = httpsCallable<MonthlySummaryPayload, MonthlySummaryResponse>(functions, 'generateMonthlySummary');
const getCalendarFeedCallable = httpsCallable<Record<string, never>, CalendarFeedResponse>(functions, 'getCalendarFeed');
const updateCalendarConfigCallable = httpsCallable<UpdateCalendarConfigPayload, UpdateCalendarConfigResponse>(functions, 'updateCalendarConfig');

export const adminDeleteUser = async (payload: AdminDeleteUserPayload) => {
  const result = await adminDeleteUserCallable(payload);
  return result.data;
};

export const syncEntryToSheets = async (payload: SyncEntryToSheetsPayload) => {
  const result = await syncEntryToSheetsCallable(payload);
  return result.data;
};

export const adminBackfillSheets = async (payload: AdminBackfillSheetsPayload = {}) => {
  const result = await adminBackfillSheetsCallable(payload);
  return result.data;
};

export const generateMonthlySummary = async (payload: MonthlySummaryPayload) => {
  const result = await generateMonthlySummaryCallable(payload);
  return result.data;
};

export const getCalendarFeed = async () => {
  const result = await getCalendarFeedCallable({});
  return result.data;
};

export const updateCalendarConfig = async (payload: UpdateCalendarConfigPayload) => {
  const result = await updateCalendarConfigCallable(payload);
  return result.data;
};
