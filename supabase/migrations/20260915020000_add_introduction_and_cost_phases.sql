ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS introduction text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS growth_goals text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cost_phases jsonb NOT NULL DEFAULT '[]'::jsonb;
