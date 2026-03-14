# Jatrack Handoff For Claude

Updated: 2026-03-14 16:19 +07  
Project: `/Users/nakoleo/Documents/COMPANIES/Y8 - YOUNG AGE/Y8 PROJECT/JATRACK APP`

## Current state
- Frontend runtime: `src/`
- Backend runtime: `functions/src/`
- Hosting target: `jartrack-y8pv`
- Functions region: `asia-southeast1`
- Firestore is the source of truth
- Google Sheets is a derived projection synced through callable functions
- Production URL: [https://jartrack-y8pv.web.app](https://jartrack-y8pv.web.app)

## What is live now

### Core app
- Google Sign-in with role policy by email
- First-time users must set both `nickname` and `display title`
- Main tabs are working from the current `src/` app shell
- Sign-in page has been simplified to a single-card layout
- Top-right Wi-Fi icon now indicates online/offline only

### Entry lifecycle
- Save/update/delete writes go to Firestore first
- Client then calls `syncEntryToSheets` in the background
- Entry docs track `sheetSync.status`
- Failed sync does not block the main app save flow
- Client retries unsynced entries automatically while online

### Admin
- Admin tab is intended for Orb / `info.nakoleo@gmail.com` only
- Monthly KPI cards show:
  - month credits
  - monthly target
  - KPI percent
  - entry count
- User cards can be reordered
- Clicking a user opens managed KPI/group/task editing
- Deletion is handled from the managed-user view with 2-step confirmation
- Managed-user delete now tolerates:
  - legacy/orphan users with incomplete profiles
  - missing Firebase Auth accounts
  - Google Sheets cleanup failures without blocking the app-side delete

### Calendar
- Central Y8 calendar is admin-managed
- Calendar supports both:
  - month grid (`ภาพรวมเดือน`)
  - agenda
- Filters: `ทั้งหมด / Content / Launch / Upcoming`
- Client explicitly uses Functions region `asia-southeast1`, which fixed previous `internal` callable issues

### Profile handling
- Admin cards show user photos when available
- Gift currently has a manual avatar override:
  - asset: `public/avatars/gift-display.jpg`
  - source image: `docs/Gift Display.jpg`
- Gift currently has a manual title override:
  - `Sr.Graphic Designer`
- These overrides are deliberate and should be preserved unless the user asks to change them

## Important runtime files
- `src/app/App.tsx`
  Main shell, profile listener, entry CRUD, admin state, save flows, background sheet sync triggering
- `src/features/auth/screens.tsx`
  Sign-in screen and first-time onboarding UI
- `src/features/tabs/AdminTab.tsx`
  Orb/super-admin KPI list and reorder UI
- `src/features/tabs/CalendarTab.tsx`
  Calendar month view and agenda view
- `src/features/settings/SettingsPanel.tsx`
  Settings UI, online state surface, calendar/admin controls
- `src/lib/firebase/client.ts`
  Firebase client init, including Functions region
- `src/lib/functionsClient.ts`
  Callable wrappers
- `src/lib/appHelpers.ts`
  Email role policy, manual profile overrides, Firestore payload sanitizing helpers
- `functions/src/index.ts`
  Callable backend entrypoints
- `functions/src/sheets.ts`
  Google Sheets sync service

## Current callable production path
- `syncEntryToSheets`
- `adminBackfillSheets`
- `adminDeleteUser`
- `generateMonthlySummary`
- `getCalendarFeed`
- `updateCalendarConfig`

Do not reintroduce Firestore trigger-based sheet sync as the primary production path.  
`onEntryWrite` is not part of the intended live architecture.

## Recent fixes completed

### Save reliability
- Gift had a save failure while Orb could save normally
- Root cause was likely Firestore payloads containing optional `undefined` values from legacy KPI/task configs
- Fix applied:
  - added `sanitizeFirestoreValue()`
  - save/update paths now strip undefined values before `setDoc`
  - fallback defaults for `unit`, `creditPerUnit`, and other optional task fields
  - error toast now gives a clearer KPI-config-related message

### Gift profile consistency
- Added manual avatar override for Gift
- Added manual title override to `Sr.Graphic Designer`
- Settings/Admin now use the resolved profile photo consistently

### Sign-in UX
- Removed extra left-side panel
- Reduced unnecessary copy
- Updated brand text to:
  - `JaTrack`
  - `KPI Tracker by Y8PV`
- Copyright footer now renders in 2 lines

### Header status UX
- Removed the numeric badge from the Wi-Fi icon
- The badge was previously showing unsynced sheet entries and was misleading users into thinking network status was bad

### Delete-user robustness
- Legacy users like `Gift_Y` could miss the delete flow or fail during delete
- Managed-user view now works even when profile data is incomplete
- Backend delete no longer fails the whole operation if:
  - Sheets cleanup hits quota
  - Auth account is already missing

## Operational caveats
- Google Sheets writes can still hit quota:
  - `429 rateLimitExceeded`
  - especially during bursts, deletes, or backfill/repair flows
- This is now an operational risk, not usually a main app blocking risk
- Firestore save should still succeed first; Sheets is background sync

- If someone reports:
  - "save failed" only for one user
  check their KPI config/task data first
  the likely source is incomplete optional task metadata in legacy configs

- If calendar reports `internal` again:
  first verify the client still points to Functions region `asia-southeast1`

## Verification baseline
- `npm run typecheck`
- `npm test`
- `npm run build`

These were passing at the time of this handoff.

## Repo hygiene notes
- Runtime code is under `src/` and `functions/src/`
- Docs are under `docs/`
- Legacy sandbox is under `archive/jatrack-daily/`
- Local/generated folders may still exist on disk during development:
  - `.claude/`
  - `.playwright-cli/`
  - `.firebase/`
  - `output/`
  but they should not be treated as production source

## Recommended next checks before major changes
1. Live smoke test with a real user account:
   - add entry
   - edit entry
   - delete entry
   - confirm Admin and Sheets projection
2. Watch `syncEntryToSheets` logs if any new save/sync issue is reported
3. Keep README and this handoff aligned whenever production behavior changes
