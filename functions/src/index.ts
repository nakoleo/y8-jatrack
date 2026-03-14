import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';

import { GoogleSheetsGateway, SheetsSyncService } from './sheets.js';
import { DEFAULT_Y8_CALENDAR_FEED_URL, fetchNormalizedCalendarFeed, normalizeCalendarConfigData } from './calendar.js';
import { buildFallbackSummary, buildMonthlyStats, generateGeminiSummary, topGroupsForEntries } from './summary.js';
import type { EntryDocument } from './types.js';

initializeApp();

const SUPER_ADMIN_EMAIL = 'info.nakoleo@gmail.com';
const SHEETS_SPREADSHEET_ID = defineString('SHEETS_SPREADSHEET_ID');
const GOOGLE_SERVICE_ACCOUNT_JSON = defineSecret('GOOGLE_SERVICE_ACCOUNT_JSON');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const firestore = getFirestore();

const isSuperAdminEmail = (email?: string | null) => (email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;

const getSheetsService = () =>
  new SheetsSyncService(
    new GoogleSheetsGateway(
      SHEETS_SPREADSHEET_ID.value(),
      GOOGLE_SERVICE_ACCOUNT_JSON.value(),
    ),
  );

const getCalendarConfigRef = () => firestore.doc('system/appConfig');

const loadCalendarConfig = async () => {
  const snapshot = await getCalendarConfigRef().get();
  const data = snapshot.data() as { calendar?: Record<string, unknown> } | undefined;
  return normalizeCalendarConfigData(data?.calendar);
};

const sanitizeEntryForComparison = (entry: Record<string, unknown> | undefined) => {
  if (!entry) return null;
  const clone = { ...entry };
  delete clone.sheetSync;
  return clone;
};

const toEntryDocument = (id: string, payload: Record<string, unknown>): EntryDocument => ({
  id,
  date: String(payload.date || ''),
  user: String(payload.user || ''),
  userName: payload.userName ? String(payload.userName) : undefined,
  email: payload.email ? String(payload.email) : undefined,
  role: payload.role ? String(payload.role) : undefined,
  groupId: String(payload.groupId || ''),
  groupName: payload.groupName ? String(payload.groupName) : undefined,
  taskId: String(payload.taskId || ''),
  taskName: payload.taskName ? String(payload.taskName) : undefined,
  quantity: Number(payload.quantity || 0),
  unit: payload.unit ? String(payload.unit) : undefined,
  creditPerUnit: payload.creditPerUnit !== undefined ? Number(payload.creditPerUnit) : undefined,
  brands: Array.isArray(payload.brands) ? payload.brands.map((brand) => String(brand)) : undefined,
  credits: Number(payload.credits || 0),
  notes: String(payload.notes || ''),
  createdAt: Number(payload.createdAt || Date.now()),
  updatedAt: payload.updatedAt !== undefined ? Number(payload.updatedAt) : undefined,
  channel: payload.channel ? String(payload.channel) : undefined,
  canvaLink: payload.canvaLink ? String(payload.canvaLink) : undefined,
  driveLink: payload.driveLink ? String(payload.driveLink) : undefined,
  attachments: Array.isArray(payload.attachments)
    ? payload.attachments.map((attachment) => ({
        originalName: attachment && typeof attachment === 'object' && 'originalName' in attachment ? String(attachment.originalName || '') : '',
        normalizedName: attachment && typeof attachment === 'object' && 'normalizedName' in attachment ? String(attachment.normalizedName || '') : '',
        fileId: attachment && typeof attachment === 'object' && 'fileId' in attachment ? String(attachment.fileId || '') : '',
        link: attachment && typeof attachment === 'object' && 'link' in attachment ? String(attachment.link || '') : '',
        mimeType: attachment && typeof attachment === 'object' && 'mimeType' in attachment ? String(attachment.mimeType || '') : '',
      }))
    : undefined,
  sheetSync: payload.sheetSync && typeof payload.sheetSync === 'object'
    ? {
        status: String((payload.sheetSync as Record<string, unknown>).status || 'pending') as 'pending' | 'synced' | 'failed',
        action: (payload.sheetSync as Record<string, unknown>).action ? String((payload.sheetSync as Record<string, unknown>).action) as 'create' | 'update' | 'delete' : undefined,
        lastAttemptedAt: (payload.sheetSync as Record<string, unknown>).lastAttemptedAt ? Number((payload.sheetSync as Record<string, unknown>).lastAttemptedAt) : undefined,
        lastSuccessAt: (payload.sheetSync as Record<string, unknown>).lastSuccessAt ? Number((payload.sheetSync as Record<string, unknown>).lastSuccessAt) : undefined,
        lastError: (payload.sheetSync as Record<string, unknown>).lastError ? String((payload.sheetSync as Record<string, unknown>).lastError) : undefined,
        revision: (payload.sheetSync as Record<string, unknown>).revision ? Number((payload.sheetSync as Record<string, unknown>).revision) : undefined,
      }
    : undefined,
});

export const onEntryWrite = onDocumentWritten(
  {
    document: 'users/{uid}/entries/{entryId}',
    region: 'asia-southeast1',
    secrets: [GOOGLE_SERVICE_ACCOUNT_JSON],
  },
  async (event) => {
    const beforeData = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : undefined;
    const afterData = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : undefined;

    if (beforeData && afterData) {
      const beforeComparable = sanitizeEntryForComparison(beforeData);
      const afterComparable = sanitizeEntryForComparison(afterData);
      if (JSON.stringify(beforeComparable) === JSON.stringify(afterComparable)) {
        return;
      }
    }

    const uid = event.params.uid;
    const entryId = event.params.entryId;
    const action = !beforeData && afterData ? 'create' : beforeData && afterData ? 'update' : 'delete';
    const sourceData = afterData || beforeData;
    if (!sourceData) return;

    const entry = toEntryDocument(entryId, sourceData);
    const revision = (entry.sheetSync?.revision || 0) + 1;
    const targetRef = afterData ? event.data?.after.ref : null;

    if (targetRef) {
      await targetRef.set({
        sheetSync: {
          status: 'pending',
          action,
          lastAttemptedAt: Date.now(),
          revision,
          lastError: null,
        },
      }, { merge: true });
    }

    try {
      await getSheetsService().syncEntry(action, {
        ...entry,
        user: uid,
        id: entryId,
      });
      if (targetRef) {
        await targetRef.set({
          sheetSync: {
            status: 'synced',
            action,
            lastAttemptedAt: Date.now(),
            lastSuccessAt: Date.now(),
            revision,
            lastError: null,
          },
        }, { merge: true });
      }
    } catch (error) {
      logger.error('Sheets sync failed', { entryId, uid, action, error });
      if (targetRef) {
        await targetRef.set({
          sheetSync: {
            status: 'failed',
            action,
            lastAttemptedAt: Date.now(),
            revision,
            lastError: error instanceof Error ? error.message : String(error),
          },
        }, { merge: true });
      }
      throw error;
    }
  },
);

export const adminDeleteUser = onCall(
  {
    region: 'asia-southeast1',
    secrets: [GOOGLE_SERVICE_ACCOUNT_JSON],
  },
  async (request) => {
    if (!request.auth?.token?.email || !isSuperAdminEmail(String(request.auth.token.email))) {
      throw new HttpsError('permission-denied', 'Only super admin can delete users.');
    }
    const uid = String(request.data?.uid || '').trim();
    if (!uid) {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }
    if (uid === request.auth.uid) {
      throw new HttpsError('failed-precondition', 'Cannot delete current admin user.');
    }

    const userRef = firestore.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    const nickname =
      (userSnap.data()?.nickname as string | undefined) ||
      (userSnap.data()?.displayName as string | undefined) ||
      uid.slice(0, 6);

    await getSheetsService().deleteUserArtifacts(uid, nickname);
    await firestore.recursiveDelete(userRef);
    await firestore.doc(`kpiConfigs/${uid}`).delete().catch(() => undefined);

    return { ok: true };
  },
);

export const generateMonthlySummary = onCall(
  {
    region: 'asia-southeast1',
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = String(request.data?.uid || request.auth.uid);
    if (uid !== request.auth.uid && !isSuperAdminEmail(String(request.auth.token.email || ''))) {
      throw new HttpsError('permission-denied', 'Cannot access another user summary.');
    }

    const month = Number(request.data?.month);
    const year = Number(request.data?.year);
    if (!Number.isInteger(month) || month < 0 || month > 11 || !Number.isInteger(year)) {
      throw new HttpsError('invalid-argument', 'month/year are required.');
    }

    const entriesSnap = await firestore.collection(`users/${uid}/entries`).get();
    const entries = entriesSnap.docs
      .map((doc) => toEntryDocument(doc.id, doc.data() as Record<string, unknown>))
      .filter((entry) => {
        const date = new Date(`${entry.date}T00:00:00`);
        return date.getFullYear() === year && date.getMonth() === month;
      });

    const [profileSnap, targetSnap] = await Promise.all([
      firestore.doc(`users/${uid}`).get(),
      firestore.doc(`kpiConfigs/${uid}`).get(),
    ]);
    const nickname =
      (profileSnap.data()?.nickname as string | undefined) ||
      (profileSnap.data()?.displayName as string | undefined) ||
      uid.slice(0, 6);
    const role = String(profileSnap.data()?.customTitle || profileSnap.data()?.role || 'Custom');
    const monthlyTarget = Number(targetSnap.data()?.monthlyTarget || 0);
    const monthLabel = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(year, month));

    const stats = buildMonthlyStats(entries, monthlyTarget);
    const topGroups = topGroupsForEntries(entries);

    let summary = '';
    let source: 'gemini' | 'fallback' = 'fallback';
    const apiKey = GEMINI_API_KEY.value();
    if (apiKey) {
      try {
        summary = await generateGeminiSummary({
          apiKey,
          nickname,
          role,
          monthLabel,
          stats,
          topGroups,
        });
        source = 'gemini';
      } catch (error) {
        logger.warn('Gemini summary failed, falling back', { uid, error });
      }
    }

    if (!summary) {
      summary = buildFallbackSummary(nickname, role, monthLabel, stats, topGroups);
    }

    return { summary, stats, source };
  },
);

export const getCalendarFeed = onCall(
  {
    region: 'asia-southeast1',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    let config;
    try {
      config = await loadCalendarConfig();
    } catch (error) {
      logger.error('Failed to load calendar config', { error });
      return { config: normalizeCalendarConfigData(null), events: [], fetchedAt: Date.now() };
    }
    if (!config.enabled || !config.y8ContentFeedUrl.trim()) {
      return {
        config: {
          ...config,
          lastSyncStatus: 'disabled',
          lastError: null,
          lastEventCount: 0,
        },
        events: [],
        fetchedAt: Date.now(),
      };
    }

    try {
      const events = await fetchNormalizedCalendarFeed(config);
      return {
        config: {
          ...config,
          lastSyncStatus: 'ok',
          lastError: null,
          lastEventCount: events.length,
        },
        events,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      logger.error('Calendar feed fetch failed', { error });
      return {
        config: {
          ...config,
          lastSyncStatus: 'error',
          lastError: error instanceof Error ? error.message : String(error),
        },
        events: [],
        fetchedAt: Date.now(),
      };
    }
  },
);

export const updateCalendarConfig = onCall(
  {
    region: 'asia-southeast1',
  },
  async (request) => {
    if (!request.auth?.token?.email || !isSuperAdminEmail(String(request.auth.token.email))) {
      throw new HttpsError('permission-denied', 'Only super admin can update calendar settings.');
    }

    const payload = request.data as Record<string, unknown> | undefined;
    const config = normalizeCalendarConfigData({
      enabled: payload?.enabled,
      label: payload?.label,
      timezone: payload?.timezone,
      y8ContentFeedUrl: payload?.y8ContentFeedUrl || DEFAULT_Y8_CALENDAR_FEED_URL,
    });
    const validateOnly = Boolean(payload?.validateOnly);

    try {
      const events = await fetchNormalizedCalendarFeed(config);
      const calendarState = {
        ...config,
        updatedAt: Date.now(),
        lastValidatedAt: Date.now(),
        lastSyncStatus: 'ok' as const,
        lastError: null,
        lastEventCount: events.length,
      };

      if (!validateOnly) {
        await getCalendarConfigRef().set({ calendar: calendarState }, { merge: true });
      }

      return { ok: true, config: calendarState, eventCount: events.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!validateOnly) {
        await getCalendarConfigRef().set({
          calendar: {
            ...config,
            updatedAt: Date.now(),
            lastValidatedAt: Date.now(),
            lastSyncStatus: 'error',
            lastError: message,
            lastEventCount: 0,
          },
        }, { merge: true });
      }
      throw new HttpsError('invalid-argument', message);
    }
  },
);
