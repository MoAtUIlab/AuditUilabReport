ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS engagement_stage text NOT NULL DEFAULT '1.1',
  ADD COLUMN IF NOT EXISTS proposal_scope text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_investment text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_timeline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_start_date text NOT NULL DEFAULT '';
