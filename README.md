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
- Work logs with optional attachment links:
  - Canva URL
  - Google Drive URL (manual or direct upload from app)
- Google Drive direct upload (`drive.file` scope) with optional default folder ID
- Google Sheets auto-push via Apps Script webhook
  - Auto creates per-user sheet names: `<nickname>_<uid6>_KPI_MASTER` and `<nickname>_<uid6>_Dashboard`
  - Keeps each user's 2 sheets adjacent for easier order (1-2, 3-4, 5-6, ...)
- Google Calendar iCal feed viewer (Y8 + PV)
- Export reports (TXT / CSV / Space Sheet CSV) by month + year

## Tech stack

- React + TypeScript + Vite
- Firebase Auth + Firestore + Hosting
- Optional Google Drive REST upload (OAuth token from Google Sign-in)

## Local setup

1. Install dependencies
   - `npm install`
2. Create `.env.local` with Firebase web config:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Enable in Firebase/Google Cloud:
   - Authentication > Sign-in method > Google
   - Firestore Database
   - Google Drive API (for in-app upload)
   - OAuth consent mode: `Testing` + add all tester emails in `Test users`
   - Authorized domains must include:
     - `jartrack-y8pv.web.app`
     - `jartrack-y8pv.firebaseapp.com`
4. Run dev server
   - `npm run dev`

## Build

- `npm run build`

## Deploy (production)

Project is configured to Firebase project `jartrack-y8pv`.

1. Login Firebase CLI
   - `firebase login`
2. Deploy hosting + Firestore rules
   - `firebase deploy --only firestore:rules,hosting`

Production URLs:

- https://jartrack-y8pv.web.app
- https://jartrack-y8pv.firebaseapp.com

## Notes for operations

- Use Settings in app to save:
  - Nickname (required for sheet naming/report identity)
  - Google Sheet URL
  - Apps Script webhook URL
  - Google Drive folder ID (optional)
  - Calendar iCal URLs
- Apps Script template can be copied directly from Settings.
- If webhook is empty, app will still save to Firestore but will warn and skip writing to Google Sheets.
- If Google Drive upload fails:
  - Reconnect Google Drive from Settings (consent popup)
  - Verify Google Drive API is enabled in Google Cloud project
  - Verify OAuth consent is in Testing mode and your account is in Test users
  - Verify Drive folder ID is valid and uploader has permission
