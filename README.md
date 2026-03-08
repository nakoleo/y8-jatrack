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
  - Auto creates per-user sheet names: `<nickname>_KPI_MASTER` and `<nickname>_Dashboard`
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
