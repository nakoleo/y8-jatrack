# Jatrack App

KPI tracking app for Y8/PV teams (mobile-first, Firebase + Google integrations).

Latest runtime summary: see [docs/HANDOFF_FOR_CLAUDE.md](/Users/nakoleo/Documents/COMPANIES/Y8%20-%20YOUNG%20AGE/Y8%20PROJECT/JATRACK%20APP/docs/HANDOFF_FOR_CLAUDE.md)

## Current capabilities

- Google Sign-in with role policy by email
  - `host.y8@gmail.com` => `Graphic Designer` default KPI
  - `info.nakoleo@gmail.com` => `Art Director` + super admin
  - Other emails => `Custom` with starter KPI = 0 (editable)
- User-isolated data in Firestore (`users/{uid}/entries` + `kpiConfigs/{uid}`)
- Super admin can view all users in `Admin` tab
- Admin view supports monthly KPI comparison per person with reorder controls
- Super admin can open and edit another user's KPI/groups/tasks from Admin
- Super admin can delete mistaken/test users from the managed-user view with 2-step confirmation, including Firebase Auth removal
- KPI config editor per user
- First-time users must complete nickname + display title onboarding before entering the main app
- Firestore-first entry lifecycle with background callable Google Sheets sync (`create / update / delete` by `entry_id`)
- Entry save/update payload is sanitized before Firestore writes so legacy KPI configs with missing optional fields do not block users like Gift from saving
- Work logs with optional attachment links:
  - Canva URL
  - Google Drive URL (manual or direct upload from app)
- Google Drive direct upload (`drive.file` scope) with optional default folder ID
- Cloud Functions backend for:
  - Google Sheets authoritative sync via callable functions + Google Sheets API
  - Admin backfill / replay for Sheets
  - Recursive admin delete cleanup
  - Server-side AI monthly summary
- Google Calendar iCal feed viewer (Y8 + PV)
- Calendar supports both month grid and agenda views
- Export reports (TXT / CSV / Space Sheet CSV) by month + year
- Gift profile is currently pinned to a local avatar override and `Sr.Graphic Designer` title for consistent display across app/Admin

## Tech stack

- React + TypeScript + Vite
- Tailwind via local Vite build
- Firebase Auth + Firestore + Functions + Hosting
- Optional Google Drive REST upload (OAuth token from Google Sign-in)
- Google Sheets API via service account on backend

## Project layout

- `src/app` - main application shell and view orchestration
- `src/features` - feature-specific UI and helpers
- `src/config` - static config and role defaults
- `src/domain` - shared app types
- `src/lib` - Firebase client and frontend service wrappers
- `src/styles` - global styles
- `docs` - handoff notes and project documentation
- `archive` - legacy sandboxes and retired experiments
- `functions/src` - Firebase Functions backend and Google Sheets sync
- `functions/test` - backend test coverage

Legacy sandbox code remains under `archive/jatrack-daily/` and is excluded from app build/tests.

## Local setup

1. Install dependencies
   - `npm install`
   - `npm --prefix functions install`
2. Create `.env.local` with Firebase web config:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Configure Functions secrets / params:
   - `firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_JSON`
   - `firebase functions:secrets:set GEMINI_API_KEY`
   - `firebase functions:config:set` is not used in this version
   - Set param `SHEETS_SPREADSHEET_ID` during deploy/runtime
   - Functions region is `asia-southeast1`
4. Enable in Firebase/Google Cloud:
   - Authentication > Sign-in method > Google
   - Firestore Database
   - Google Drive API (for in-app upload)
   - Google Sheets API
   - OAuth consent mode: `Testing` + add all tester emails in `Test users`
   - Share the target spreadsheet with the service account email from `GOOGLE_SERVICE_ACCOUNT_JSON`
   - Authorized domains must include:
     - `jartrack-y8pv.web.app`
     - `jartrack-y8pv.firebaseapp.com`
5. Run dev server
   - `npm run dev`

## Build

- `npm run build`
- `npm test`

## Deploy (production)

Project is configured to Firebase project `jartrack-y8pv`.

1. Login Firebase CLI
   - `firebase login`
2. Deploy hosting + Firestore rules + functions
   - `firebase deploy --only firestore:rules,functions,hosting`

Production URLs:

- https://jartrack-y8pv.web.app
- https://jartrack-y8pv.firebaseapp.com

## Notes for operations

- Use Settings in app to save:
  - Nickname (required for sheet naming/report identity)
  - Display title / position
  - Google Sheet URL (personal/export reference only)
  - Google Drive folder ID (optional)
  - Central calendar is admin-managed; normal users do not edit the feed URL
- Google Sheets system sync status is read-only in the app because it runs via backend callable functions
- The top-right Wi-Fi icon now represents online/offline only; it no longer shows sheet sync backlog counts
- AI Summary now runs on backend; user devices do not store Gemini API keys
- Production no longer relies on Firestore trigger-based sheet sync
- Legacy sandbox remains under `archive/jatrack-daily/`
- Admin cards show each user's Google profile photo when available
- Sign-in page was simplified to a single-card layout with lighter copy and current brand wording: `JaTrack` / `KPI Tracker by Y8PV`
- Google Sheets can still hit per-user write quota (`429 rateLimitExceeded`) during heavy bursts or cleanup/backfill; normal app save remains Firestore-first and should still succeed, while sheet sync retries in the background
- If Google Drive upload fails:
  - Reconnect Google Drive from Settings (consent popup)
  - Verify Google Drive API is enabled in Google Cloud project
  - Verify OAuth consent is in Testing mode and your account is in Test users
  - Verify Drive folder ID is valid and uploader has permission
