ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS outcome text NOT NULL DEFAULT '';
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS outcome_note text NOT NULL DEFAULT '';
