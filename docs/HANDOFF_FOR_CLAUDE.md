# Jatrack Handoff For Claude

Updated: 2026-03-14
Project: `/Users/nakoleo/Documents/COMPANIES/Y8 - YOUNG AGE/Y8 PROJECT/JATRACK APP`

## 1) User goals requested
- Keep role default KPI only for `host.y8@gmail.com` (Graphic Designer).
- Other users start KPI at 0 and configure flexibly.
- Users must not see other users' KPI (except super admin).
- Super admin account: `info.nakoleo@gmail.com` (Art Director).
- Google Sheet must be separated per person (2 sheets per person), not mixed with Gift.
- Add nickname usage for sheet/report naming.
- Add Google Drive attachment support + Canva link.
- Make app production-ready and provide deployment/access flow.

## 2) Implemented changes

### Role/KPI policy
- Role mapping by email:
  - `host.y8@gmail.com` -> `graphic_designer`
  - `info.nakoleo@gmail.com` -> `art_director` + admin
  - others -> `custom`
- Non-host default uses zero starter groups and target 0.
- `KPI_POLICY_VERSION` bumped to `3` to re-seed non-host users per new policy.

Key refs:
- `src/lib/appHelpers.ts` — role helpers, email constants, KPI initialisation
- `src/app/App.tsx` — App state + KPI listener

### Security / data isolation
- Firestore data model remains user-scoped:
  - `users/{uid}`
  - `users/{uid}/entries/{entryId}`
  - `kpiConfigs/{uid}`
- Firestore rules already enforce owner-only read/write; super admin exception.
- Local settings/cache moved to `scopedKey(uid, ...)` to prevent cross-user mixing on same device.
- Offline entry cache now per-user key (`entries_v8` scoped by uid).

### Google Drive integration (COMPLETE)
- Drive OAuth token flow: in-memory → localStorage → reauthenticateWithPopup → signInWithPopup.
- `uploadFileToGoogleDrive()` in App.tsx — handles single file upload + share link.
- **Multi-file upload**: `handleDriveFilesSelected()` uses `Array.from(e.target.files || [])`.
  All files are staged as `pendingUploads[]` and show a rename confirmation modal.
- **Automatic file renaming**: `normalizeFileName(originalName, taskId, date, nickname, index)`
  produces format: `[TASKID]_[DDMMYYYY]_[NICKNAME]_[NN].[ext]` (e.g. `A01_14032026_gift_01.jpg`).
  Defined in `src/lib/appHelpers.ts`, also exposed in rename modal so user sees the name before upload.
- **Rename confirmation modal**: shown before every upload batch. User can edit names or click
  "อัปโหลดด้วยชื่อเดิม" to skip renaming.
- **Drive folder hierarchy** (COMPLETE):
  Root folder → Group name subfolder → Brand subfolder (if exactly 1 brand) → YYYY-MM subfolder.
  `getOrCreateDriveSubfolder()` searches for existing folder first, creates if not found, caches per session.
- Fallback: if a subfolder step fails, uploads to parent folder instead.

### Attachment data model (`WorkEntry`)
- `canvaLink?: string` — Canva URL (manual paste)
- `driveLink?: string` — backward-compat single Drive link
- `attachments?: DriveAttachment[]` — multi-file array: `{ originalName, normalizedName, fileId, link, mimeType }`
- `localFiles?: LocalFileRef[]` — local files (File System Access API + IndexedDB)
- EntryCard shows individual links for each attachment (Drive 1 ↗, Drive 2 ↗, …)
- Full backward compatibility with old single-`driveLink` entries

### Google Sheets sync (server-authoritative)
- Firestore trigger `onEntryWrite` → `SheetsSyncService` → Google Sheets
- Sheet sync state tracked on each entry: `sheetSync.status` (pending | synced | failed)
- Sheets structure: ALL_ENTRIES, _ENTRY_INDEX, _USER_REGISTRY
- attachments serialised in sheets columns: `attachments_count`, `attachments_names`, `attachments_links`
- Per-user sheet naming: `<nickname>_<uid6>_KPI_MASTER` / `<nickname>_<uid6>_Dashboard`

### Google Calendar integration (COMPLETE)
- `getCalendarFeed` Cloud Function fetches iCal feed server-side (avoids CORS)
- CalendarTab in `src/features/tabs/CalendarTab.tsx`
- Admin can update feed URL/label/timezone via Settings (super admin only)
- Config stored in `system/appConfig.calendar` in Firestore

### Daily Reports
- Morning report: check-in time + focus items
- Evening report: routine, results, next move, issues
- Reports stored in `users/{uid}/dailyReports/{reportId}`
- Report text generation in `src/features/reports/reportText.ts`

### Feature extraction / refactoring
- Tabs fully extracted: LogTab, TodayTab, HistoryTab, CalendarTab, SummaryTab, DailyTab, AdminTab
- Settings extracted: `src/features/settings/SettingsPanel.tsx`
- Auth screens: `src/features/auth/screens.tsx`
- Shared utilities: `src/lib/appHelpers.ts` (constants, email helpers, KPI init, file naming, etc.)
- Report text: `src/features/reports/reportText.ts`

### Export / KPI editor
- Export filter fixed to month + year (`buildExportRows(month, year)`).
- Export modal includes year selector.
- KPI editor `Cr/Unit` minimum adjusted to allow 0.

## 3) Deploy status
- Build: `npm run build` (typecheck + vite build + functions build)
- Deploy: `firebase deploy --only firestore:rules,hosting`
- Production:
  - `https://jartrack-y8pv.web.app`
  - `https://jartrack-y8pv.firebaseapp.com`
- Firebase Project: `jartrack-y8pv` | Region: `asia-southeast1`

## 4) Current tech debt / known issues

### App.tsx is large (3518 lines)
- Main App component handles auth, Firestore listeners, Drive upload logic, form state, daily reports.
- Feature components are extracted (tabs, settings, auth screens) but the App shell itself is still dense.
- Duplicate helper definitions exist in App.tsx that are also in `appHelpers.ts` and `reportText.ts`.
  → Target: import from those modules, remove inline definitions. (Pending task.)

### Remaining known tech debt
- App.tsx duplicates: `HOST_EMAIL`, `SUPER_ADMIN_EMAIL`, `KPI_POLICY_VERSION`, `ZERO_STARTER_GROUPS`,
  email helpers, `formatThaiDate`, `getMonthNameThai`, `extractGoogleApiReason`, `normalizeFileName`,
  `PendingUploadFile`, report helpers (`DEFAULT_REPORT_EMOJIS`, `buildMorningReportText`, etc.)
  These exist in `appHelpers.ts` / `reportText.ts` and should be imported instead of re-defined.

## 5) Operational guidance
- Google Cloud / OAuth / Firebase Auth setup is admin-only and already done.
- Other users need only: sign in → set nickname → use app (Drive auth popup on first upload).
- No per-user manual setup required beyond that.

## 6) Next / remaining tasks for Claude

### Immediate code quality (next session priority)
1. **Deduplicate helpers in App.tsx** — import from `@/lib/appHelpers` and `@/features/reports/reportText`
   instead of redefining. This will reduce App.tsx by ~230 lines.

### Future features (if requested)
2. **Notification / push reminder** — remind users to file morning/evening report.
3. **Calendar → Log pre-fill** — tap a calendar event to pre-fill the Log form.
4. **Export to PDF** — export monthly summary as PDF.
5. **Multi-user summary** (super admin) — aggregate credits across all users for a given month.

## 7) Key file locations

| Area | File |
|------|------|
| Main app + Drive upload | `src/app/App.tsx` |
| Shared helpers & constants | `src/lib/appHelpers.ts` |
| Report text generation | `src/features/reports/reportText.ts` |
| Domain types | `src/domain/types.ts` |
| Firebase init | `src/lib/firebase/client.ts` |
| Cloud Functions | `functions/src/index.ts` |
| Google Sheets sync | `functions/src/sheets.ts` |
| iCal parser | `functions/src/calendar.ts` |
| AI summary | `functions/src/summary.ts` |

## 8) Apps Script identifiers
- Deployment ID:
  - `AKfycbyiyRg2eM0X75mmujisnHJ_qhDclpJ4Ba-21L-h9wuKfXvQ-qZ7yF64lbOWeKAuNcxu`
- Web app URL:
  - `https://script.google.com/macros/s/AKfycbyiyRg2eM0X75mmujisnHJ_qhDclpJ4Ba-21L-h9wuKfXvQ-qZ7yF64lbOWeKAuNcxu/exec`
