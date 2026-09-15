# Engagement & conversion metrics

## Goal
Turn raw report views into actionable follow-up signals so the team can see which clients have engaged, which reports are stale, and where conversion is dropping off.

## Metrics to add

### Per-audit engagement
- Report opens (total + unique by share link)
- Prints / PDF saves
- Most recent open
- Days since last open
- Passcode attempts vs successes (flag possible forwarding)

### Dashboard roll-ups
- Total client opens this week / month
- Open rate: `opened links / live links`
- Follow-up completion rate: `resolved follow-ups / total follow-ups created`
- Average time from link creation to first open
- Stale links: live links with zero opens in the last 14 days

### Conversion funnel (manual checkpoints)
- Link sent → opened → followed up → deal progressed
- Team member selects outcome when they resolve a follow-up (`done` already implies follow-up happened; add optional `outcome` note: "meeting booked", "no response", "not interested", etc.)

## Where to show them

1. **Dashboard engagement section (existing)**
   - Keep the current cards but add "Open rate" and "Stale links".
   - Replace the plain per-audit list with a sortable table: Client | Opens | Last open | Status | Follow-up action.

2. **New "Metrics" tab on the dashboard**
   - A simple time-series chart of opens/prints per week.
   - Funnel bar: Links sent → Opened → Followed up → Won/Progressed.
   - Filter by team member profile.

3. **Audit Deliver tab**
   - Show each share link's individual open/print count and last-opened date.
   - Highlight links older than 14 days with no opens so the team can re-send or revoke.

## Data changes

- Add `outcome` and `outcome_note` columns to `follow_ups` so resolved follow-ups carry conversion context.
- Add a database view or server function that aggregates `report_views` by share link, deduplicating same-day opens from the same user agent as a rough "unique" proxy.
- No client-side-only metrics; all numbers come from `report_views` and `audit_shares` via server functions.

## Implementation steps

1. Extend `follow_ups` table with `outcome` text and `outcome_note` text.
2. Update `resolveFollowUp` to accept optional outcome/outcome_note.
3. Update `viewMetrics` server function to compute open rate, stale links, average time-to-open, and weekly buckets.
4. Build a `MetricsPanel` component for the dashboard with the funnel and weekly chart (use a lightweight inline SVG bar chart, no new chart library).
5. Refactor the existing `EngagementSection` list into a compact table and wire the new follow-up resolution fields.
6. Add per-link open/print rows inside `DeliverPanel`.
7. Verify with a live report link open and confirm metrics update.

## Out of scope
- Real-time email alerts (blocked until an email domain is configured).
- AI-generated follow-up email copy.
