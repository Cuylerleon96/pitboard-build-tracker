# PitBoard Build Tracker

PitBoard is a cleaner browser app rebuilt from the original `d21-build-tracker.html`. It now starts with an empty starter workspace, uses a clearer top-nav structure, and gives you a path from local demo mode to real account-based browser access.

## What changed

- Replaced the one-file prototype with a Vite + React app.
- Added a first-start landing page for a real shop or builder brand.
- Turned the tracker into a multi-build workspace instead of a single hard-coded project.
- Removed the personal D21 seed data and replaced it with a clean starter build.
- Added local-first persistence plus optional Supabase magic-link auth and cloud syncing.

## Run locally

```bash
npm install
npm run dev
```

## Enable browser access from anywhere

1. Create a Supabase project.
2. Run [schema.sql](C:\Users\Admin\Documents\pitboard-build-tracker\supabase\schema.sql) in the Supabase SQL editor.
3. Copy `.env.example` to `.env` and paste your Supabase URL and anon key.
4. Start the app again and use the email magic-link form in the sidebar.

Without Supabase configured, the app runs in demo mode and stores data in this browser's local storage.

## Good next features

- File uploads for invoices, wiring diagrams, and calibration files.
- Customer comments and approvals on estimates or milestone updates.
- Labor-hour tracking by technician and phase.
- Build photo timeline with before-and-after delivery galleries.
- Read-only customer portal routes separated from the internal shop workspace.
