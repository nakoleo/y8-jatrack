# Jatrack Handoff For Claude

Updated: 2026-03-08
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

Key ref:
- `App.tsx` (role helpers + policy): lines near constants and KPI listener.

### Security / data isolation
- Firestore data model remains user-scoped:
  - `users/{uid}`
  - `users/{uid}/entries/{entryId}`
  - `kpiConfigs/{uid}`
- Firestore rules already enforce owner-only read/write; super admin exception.
- Local settings/cache moved to `scopedKey(uid, ...)` to prevent cross-user mixing on same device.
- Offline entry cache now per-user key (`entries_v8` scoped by uid).

### Google Drive integration
- Added Drive-specific provider factory in `firebase.ts`:
  - scope: `https://www.googleapis.com/auth/drive.file`
  - custom params: `prompt=consent`, `include_granted_scopes=true`
- Token flow hardened:
  - try `reauthenticateWithPopup(...)`
  - fallback to `signInWithPopup(auth, driveProvider)` if needed
- Better upload error handling:
  - folder invalid -> fallback upload to My Drive
  - explicit handling for forbidden/folder errors
  - user-facing toast messages for popup blocked/closed/etc.
- UI wiring complete:
  - Settings: Connect Google Drive button + Folder ID
  - Log/Edit forms: file upload buttons and hidden file inputs
  - Canva quick-open button

### Google Sheets webhook and per-user sheet split
- Standardized sheet names to include uid suffix:
  - `<nickname>_<uid6>_KPI_MASTER`
  - `<nickname>_<uid6>_Dashboard`
- Added `ownerKey` in webhook payload.
- Added backward-compatible fields (`id`, `user`, `groupName`, `channel`) for legacy GAS.
- Warn user when webhook is not configured.
- Queue/flush behavior retained for offline -> online delivery.

### GAS template improvements (copied from Settings button)
- Template now includes:
  - `relinkDashboardToMaster(...)` to replace `Gift_KPI_MASTER` references in formulas
  - `keepPairTogether(...)` to keep each user's Master+Dashboard adjacent
  - `ownerKey`-aware naming fallback
- Intended ordering: user1 (1-2), user2 (3-4), user3 (5-6), ...

### Export / KPI editor
- Export filter fixed to month + year (`buildExportRows(month, year)`).
- Export modal includes year selector.
- KPI editor `Cr/Unit` minimum adjusted to allow 0.

### Docs
- `README.md` rewritten for current Firebase + Drive + Apps Script operations.

## 3) Deploy status
- Build: passed (`npm run build`)
- Deploy: passed (`firebase deploy --only firestore:rules,hosting`)
- Production:
  - `https://jartrack-y8pv.web.app`
  - `https://jartrack-y8pv.firebaseapp.com`

## 4) Current user-reported issues after changes
- Google Drive upload still failing in real usage.
- Some created sheets are empty (no header/no rows written).
- KPI must not mirror Gift across users.
- Wants guaranteed orderly sheet-pair placement.

## 5) Likely causes to verify next
1. Apps Script deployed version might not match latest template code.
2. Web app deployment access/execute settings may block write path.
3. App user settings may still contain old or wrong webhook URL.
4. Drive API / consent / folder permission for active Google account may still block upload.

## 6) Immediate professional checklist for Claude
1. Verify actual deployed GAS code/version (not only editor buffer).
2. Verify deployment settings:
   - Execute as: script owner
   - Access: per organization policy (typically anyone with link for this flow)
3. Perform real POST test against `/exec` URL with current payload fields.
4. In app, for one test user:
   - save nickname + webhook
   - add 1 entry
   - confirm pair sheets created with headers + appended row
5. Test Drive upload with:
   - valid folder ID
   - invalid folder ID (should fallback to My Drive)

## 7) Apps Script identifiers shared by user
- Deployment ID:
  - `AKfycbyiyRg2eM0X75mmujisnHJ_qhDclpJ4Ba-21L-h9wuKfXvQ-qZ7yF64lbOWeKAuNcxu`
- Web app URL:
  - `https://script.google.com/macros/s/AKfycbyiyRg2eM0X75mmujisnHJ_qhDclpJ4Ba-21L-h9wuKfXvQ-qZ7yF64lbOWeKAuNcxu/exec`

