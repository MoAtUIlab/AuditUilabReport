# Base Walkthrough — Improvement Plan

## What you'll get

1. **Real accounts and storage (Lovable Cloud)**
   - One shared password unlocks the whole site — hand it to anyone on the team, no individual sign-ups.
   - Team profiles you can click into (e.g. Ash, Mo) to see who ran which walkthroughs; each audit is attributed to a profile.
   - Audits stored in a real database, shared across devices — no more browser-only localStorage.
   - Mock/seed data removed; the register starts clean.

2. **Photo upload instead of pasting links**
   - Evidence tab gets a real photo picker: take or upload photos from phone or desktop.
   - Photos stored in cloud file storage, shown in the evidence gallery and printed dossier.
   - Existing "paste a URL" option kept as a fallback.

3. **AI-drafted summaries**
   - "Paste your notes" box on each audit: dump in your rough walkthrough notes for a business and the AI fills out the audit for you — findings, opportunities, maturity scores and a draft executive summary.
   - A "Draft with AI" button also writes or refreshes the executive summary from the filled-in audit.
   - You always review and edit everything before saving.

4. **Report & PDF polish**
   - Proper cover page, running header/footer with client name and page numbers, better page-break control so sections don't split awkwardly in PDF.

5. **Walkthrough capture UX**
   - Autosave indicator ("Saved / Saving…"), drag-to-reorder findings and opportunities, mobile-friendly capture layout for on-site use.

## Technical details

- Enable Lovable Cloud (database, auth, file storage).
- Tables: `audits`, plus storage bucket for evidence photos; row-level security so each user only sees their own audits.
- Migrate the audit store from localStorage to authenticated server functions.
- AI via the built-in Lovable AI gateway (server-side only); new `LOVABLE_API_KEY` provisioned automatically.
- Print CSS updates in `src/styles.css` and restructured report route.

## Suggested build order

1. Cloud + auth + database migration (removes mock data)
2. Photo uploads
3. AI summaries
4. Report/PDF polish
5. Capture UX refinements
