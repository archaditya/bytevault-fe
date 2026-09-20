# PushPostVault UI - Client File Portal (frontend) + everything before it

Drop-in overwrite on your original project. It replaces all earlier UI zips.
No `.env`, no new dependencies. `tsc --noEmit` passes.

## New in this round: Collect (guest upload invites)
Matches the backend contract in your walkthrough exactly.

- `services/upload-invites.service.ts`: types, owner hooks (list / create / revoke), guest API
  (public info, passcode verify, upload session, complete) and a progress-reporting PUT helper.
  Blocked extensions mirror the backend list.
- `app/(app)/collect/page.tsx` + `features/collect/components/*`: owner screen.
  Create a request link (name, total size, max files, expiry, optional passcode), copy the link,
  see usage and time left, revoke with a confirm step. Shows the 10-active-links limit and asks
  unverified users to verify their email first.
- `app/collect/[token]/page.tsx`: guest page. No account needed. Handles: not found, revoked,
  expired, passcode gate (session token kept in sessionStorage, re-asks if it expires), multi-file
  drag and drop, per-file progress, 2 uploads in parallel, retry, friendly error messages,
  client-side checks (blocked types, empty files, space left), and a warning if the tab is closed
  during an upload.
- Sidebar gets a "Collect" item; `route-guard.tsx` makes `/collect/<token>` public.
- Landing page: "Coming soon" labels removed, Collect card / section / FAQ / footer now link to
  `/collect`. **Deploy the backend first**, otherwise the button leads to a page that cannot work.

## Also included (from earlier rounds)
Brand theme, "Send and collect" landing, redesigned Instant Share (sender + recipient), auth screens,
contact page, brand-name cleanup, native control colours. See the file list in this zip.

## Before you deploy
1. Read `BACKEND_FIXES.md`. Item 1 is a real security hole (a guest can complete or delete any
   file of the owner through `/complete/:fileId`). Fix it before making the feature public.
2. Test one upload of about 1 GB on a slow connection: guest uploads are a single PUT per file.
3. R2 must allow the site origin in its CORS rules for PUT (Instant Share already needs this).
4. Optional: add `max_file_bytes` to the public invite info; the guest page uses it when present.
