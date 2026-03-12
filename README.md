# Jatrack App

KPI tracking app for Y8/PV teams (mobile-first, Firebase + Google integrations).

## Current capabilities

- Google Sign-in with role policy by email
  - `host.y8@gmail.com` => `Graphic Designer` default KPI
  - `info.nakoleo@gmail.com` => `Art Director` + super admin
  - Other emails => `Custom` with starter KPI = 0 (editable)
- User-isolated data in Firestore (`users/{uid}/entries` + `kpiConfigs/{uid}`)
- Super admin can view all users in `Admin` tab
- KPI config editor per user
- Firestore-first entry lifecycle with backend Google Sheets sync (`create / update / delete` by `entry_id`)
- Work logs with optional attachment links:
  - Canva URL
  - Google Drive URL (manual or direct upload from app)
- Google Drive direct upload (`drive.file` scope) with optional default folder ID
- Cloud Functions backend for:
  - Google Sheets authoritative sync via Google Sheets API
  - Recursive admin delete cleanup
  - Server-side AI monthly summary
- Google Calendar iCal feed viewer (Y8 + PV)
- Export reports (TXT / CSV / Space Sheet CSV) by month + year

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
  - Google Sheet URL
  - Google Drive folder ID (optional)
  - Calendar iCal URLs
- Google Sheets system sync status is now read-only in the app because it runs via backend
- AI Summary now runs on backend; user devices do not store Gemini API keys
- If Google Drive upload fails:
  - Reconnect Google Drive from Settings (consent popup)
  - Verify Google Drive API is enabled in Google Cloud project
  - Verify OAuth consent is in Testing mode and your account is in Test users
  - Verify Drive folder ID is valid and uploader has permission
