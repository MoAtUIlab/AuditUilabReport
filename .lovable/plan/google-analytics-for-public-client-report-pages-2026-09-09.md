# Google Analytics for public client report pages

## Goal
Add privacy-conscious Google Analytics tracking to the client-facing report landing pages only, so the team can see top-of-funnel traffic and device sources without losing the internal database as the source of truth for follow-ups.

## Scope
- **Track only `/r/$token` public report pages** after the client unlocks the report.
- **Do not track** the internal dashboard, unlock page, or audit editor.
- Keep the existing `report_views` table as the canonical source for per-share opens, prints, and follow-up reminders.

## Events to send
1. `page_view` — when the report content renders after a valid passcode.
2. `report_print` — when the client clicks **Print / save as PDF**.
3. `report_unlocked` — on successful passcode entry.

Each event will include the share token as a parameter so GA reports can be correlated back to an audit if needed, without exposing the client name.

## Connector setup
- Use the **Google Analytics** App connector (frontend-only; no gateway).
- Linking it syncs the measurement ID as `VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY`.
- Initialize `gtag.js` once at app startup in a small `src/lib/analytics.ts` module, loaded from `src/routes/__root.tsx` so it runs for every route but only sends events from the report page.

## Code changes
1. Create `src/lib/analytics.ts` to load the GA script and expose a typed `gtag` helper.
2. In `src/routes/__root.tsx`, import and initialize analytics when the measurement ID is present.
3. In `src/routes/r.$token.tsx`:
   - Send `page_view` once after the audit is unlocked and rendered.
   - Send `report_unlocked` inside the successful passcode submit handler.
   - Send `report_print` inside the existing `print()` handler.
4. Add a short note in the Deliver panel explaining that client-link opens are also counted in Google Analytics when the client unlocks the page.

## Verification
- Connect the Google Analytics connector and confirm `VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY` is available.
- Open a live `/r/$token` link, enter the passcode, and use browser network tools to confirm GA `collect` requests fire for `page_view` and `report_unlocked`.
- Click Print and confirm a `report_print` event fires.
- Confirm no GA requests fire on `/unlock` or `/`.

## Out of scope
- Tracking internal team pages.
- Replacing the existing `report_views` / `follow_ups` metrics.
- Cookie consent banner (clients see a private report; add only if legal/compliance later requires it).
