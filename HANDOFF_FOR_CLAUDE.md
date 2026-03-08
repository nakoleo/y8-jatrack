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

## 4) Latest status (important update)
- Google Drive upload is now working in real usage.
- Root cause was a combination of:
  - Google Cloud OAuth config not yet completed in the correct project (`jartrack-y8pv`)
  - Firebase Google provider needing final project-level setup/save
  - old OAuth permissions / incomplete test-user setup during testing
- User has now completed the required Google Cloud + Firebase console setup and confirmed upload success.
- The app-side "Drive Preflight" checks were useful and should be kept unless Claude has a better replacement.
- Earlier Apps Script issue ("header row/table validation" caused by bulk formula updates) was addressed by changing the template logic to update formulas cell-by-cell instead of bulk `setFormulas(...)`.

## 5) Operational guidance / what other users should need
- The Google Cloud / OAuth / Firebase Auth setup is intended to be admin-only, one-time project setup.
- Other users should NOT need to configure Google Cloud or Firebase console settings themselves.
- Expected user-level setup should be limited to app usage only, ideally:
  - sign in with Google
  - have nickname/profile available
  - optionally attach files/links in normal UI flow
- If any remaining per-user manual config still exists in the app and is not business-required, Claude should consider simplifying or removing it.

## 6) Remaining product request for Claude (next implementation target)
User wants the next phase to focus on attachment workflow quality and operational polish:

1. Multi-file upload in one action
- Allow selecting multiple files at once from the app.
- Upload all selected files to Google Drive in one flow.
- Preserve reliable linking back to the work entry.

2. Automatic standardized file renaming
- Add an app-side rename/normalization function before upload.
- Goal: consistent naming by work type/category + date (`ddmmyyyy`) + systematic structure.
- The naming scheme should help storage discipline and later retrieval.
- Claude should define the exact naming format explicitly and keep it deterministic.

3. Strong file-to-work-entry referencing
- Each uploaded file should be traceable from the work item.
- App should store accurate file name(s) plus Drive link(s), not just a loose single URL if multiple files are uploaded.
- Claude should review whether current data model (`canvaLink`, `driveLink`) needs to evolve into a richer attachment structure.

4. Better organization in Google Drive
- User wants uploads saved in a cleaner, more systematic way by task type/date.
- Claude should decide whether this should be:
  - filename-only normalization, or
  - folder hierarchy + standardized filename, or
  - both
- Recommendation from current context: likely both, but Claude should validate against actual app constraints and user workflow.

5. End-to-end cleanliness review
- User explicitly asked for a general readiness review of the whole app after the Drive milestone.
- Claude should review:
  - auth/login flow
  - Drive upload flow
  - Google Sheets write flow
  - KPI defaults / isolation
  - UX friction for non-admin users
  - any remaining manual configuration burden

## 7) Suggested implementation considerations for Claude
- Review whether `WorkEntry` should support an attachments array, e.g. multiple Drive files with:
  - original name
  - normalized name
  - file id
  - link
  - mime type
- Review whether edit/history/export/admin views need updates for multi-file support.
- Keep backward compatibility with existing entries that only have single `driveLink`.
- If filename normalization is added, surface it clearly in UI so users understand what the saved filename will become.
- Prefer reducing user setup burden rather than adding new required settings.

## 8) Apps Script identifiers shared by user
- Deployment ID:
  - `AKfycbyiyRg2eM0X75mmujisnHJ_qhDclpJ4Ba-21L-h9wuKfXvQ-qZ7yF64lbOWeKAuNcxu`
- Web app URL:
  - `https://script.google.com/macros/s/AKfycbyiyRg2eM0X75mmujisnHJ_qhDclpJ4Ba-21L-h9wuKfXvQ-qZ7yF64lbOWeKAuNcxu/exec`
