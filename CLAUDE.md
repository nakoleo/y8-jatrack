# Claude Entry Point

Read this first when continuing work in this repo:

- Runtime/project overview: [README.md](/Users/nakoleo/Documents/COMPANIES/Y8%20-%20YOUNG%20AGE/Y8%20PROJECT/JATRACK%20APP/README.md)
- Current live status and operational handoff: [docs/HANDOFF_FOR_CLAUDE.md](/Users/nakoleo/Documents/COMPANIES/Y8%20-%20YOUNG%20AGE/Y8%20PROJECT/JATRACK%20APP/docs/HANDOFF_FOR_CLAUDE.md)

Key reminders:
- Production sync path is Firestore-first + callable Sheets sync
- Functions region is `asia-southeast1`
- Hosting target is `jartrack-y8pv`
- Do not assume legacy sandbox code under `archive/` is part of the live runtime
