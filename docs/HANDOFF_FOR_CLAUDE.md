# Jatrack Handoff For Claude

Updated: 2026-03-14  
Project: `/Users/nakoleo/Documents/COMPANIES/Y8 - YOUNG AGE/Y8 PROJECT/JATRACK APP`

## Current status
- Frontend: React + Vite app under `src/`
- Backend: Firebase Functions under `functions/src/`
- Hosting target: `jartrack-y8pv`
- Functions region: `asia-southeast1`
- Firestore is the source of truth
- Google Sheets is a derived projection synced through callable functions

## Runtime architecture

### Entry lifecycle
- Users write entries to `users/{uid}/entries/{entryId}`
- Client responds immediately after Firestore write
- Client then calls `syncEntryToSheets` in the background
- Entry docs track `sheetSync.status` (`pending | synced | failed`)
- `onEntryWrite` Firestore trigger is intentionally not part of the production path

### Functions that should exist in production
- `syncEntryToSheets`
- `adminBackfillSheets`
- `adminDeleteUser`
- `generateMonthlySummary`
- `getCalendarFeed`
- `updateCalendarConfig`

### Google Sheets
- Uses Google Sheets API via service account secret
- Required param: `SHEETS_SPREADSHEET_ID`
- Required secret: `GOOGLE_SERVICE_ACCOUNT_JSON`
- Main sheets:
  - `ALL_ENTRIES`
  - `_ENTRY_INDEX`
  - `_USER_REGISTRY`

### Calendar
- Y8 central calendar is read-only and managed via `system/appConfig.calendar`
- Calendar UI supports:
  - `ภาพรวมเดือน`
  - `Agenda`
  - filters `ทั้งหมด / Content / Launch / Upcoming`
- Client must use Functions region `asia-southeast1` explicitly or calendar can fail with `internal`

## Current product behavior

### Admin (Orb / super admin only)
- Admin tab is visible only to `info.nakoleo@gmail.com`
- Admin now shows monthly KPI per person with:
  - month credits
  - monthly target
  - KPI percent
  - entry count
- Delete button is removed from Admin UI
- Clicking a person opens KPI/group/task management for that user
- User order is stored in `system/appConfig.admin.userOrder`

### User settings
- Normal users see central calendar as read-only
- Super admin can validate and update calendar feed URL
- Gemini API key is not stored in the client

## Files to know first
- `src/app/App.tsx` — main shell, listeners, entry CRUD, admin state
- `src/features/tabs/AdminTab.tsx` — super admin monthly KPI list and ordering UI
- `src/features/tabs/CalendarTab.tsx` — month grid + agenda views
- `src/lib/firebase/client.ts` — Firebase client init, includes Functions region
- `src/lib/functionsClient.ts` — callable wrappers
- `functions/src/index.ts` — callable backend entrypoints
- `functions/src/sheets.ts` — Google Sheets sync service

## Known operational notes
- `.gitignore` should keep local artifacts out of version control:
  - `.claude/`
  - `.playwright-cli/`
  - `functions/.env*`
  - `.secrets/`
  - `output/`
  - `firebase-debug.log`
- If deploy asks for `SHEETS_SPREADSHEET_ID`, use only the spreadsheet ID, not the full URL
- Current production deploy should be `firebase deploy --only functions,firestore:rules,hosting`

## Verification baseline
- `npm run typecheck`
- `npm test`
- `npm run build`

If any of the above fails, do not assume production is safe.
