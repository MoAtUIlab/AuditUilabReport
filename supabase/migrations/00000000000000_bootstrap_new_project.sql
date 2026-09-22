-- Consolidated bootstrap for a fresh Supabase project (pyfgonatrsqwxprftcnw),
-- combining all prior migrations in order so a brand-new project ends up with
-- the exact same schema the app expects. Run this once in the new project's
-- SQL editor, then confirm the app's env vars point here.

-- ---- 20260909013030: profiles + audits + trigger + seed team ----
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Consultant',
  color TEXT NOT NULL DEFAULT '#ff6325',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audits (
  id TEXT PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client TEXT NOT NULL DEFAULT '',
  site TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  auditor TEXT NOT NULL DEFAULT '',
  walkthrough_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  headcount INTEGER NOT NULL DEFAULT 0,
  reference TEXT NOT NULL DEFAULT '',
  executive_summary TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT '',
  maturity JSONB NOT NULL DEFAULT '[]'::jsonb,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON public.audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.profiles (name, role, color) VALUES
  ('Ash', 'Applied AI Consultant', '#ff6325'),
  ('Mo', 'Applied AI Consultant', '#ffcd0e');

-- ---- 20260909013054: lock down anon/authenticated on core tables ----
CREATE POLICY "No direct access to audits" ON public.audits FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No direct access to profiles" ON public.profiles FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ---- 20260909013237: storage policies for evidence-photos ----
CREATE POLICY "No direct storage reads" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id <> 'evidence-photos');
CREATE POLICY "No direct storage writes" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id <> 'evidence-photos');
CREATE POLICY "No direct storage updates" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id <> 'evidence-photos');
CREATE POLICY "No direct storage deletes" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id <> 'evidence-photos');

-- Create the private evidence-photos bucket itself (not part of the original
-- migration history, but required — the app expects it to already exist).
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', false)
ON CONFLICT (id) DO NOTHING;

-- ---- 20260909023857: GPS fields + sharing/engagement tables ----
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS captured_at timestamp with time zone;

CREATE TABLE public.audit_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id text NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  passcode text NOT NULL,
  recipient_name text NOT NULL DEFAULT '',
  recipient_email text NOT NULL DEFAULT '',
  expires_at timestamp with time zone,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.report_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid REFERENCES public.audit_shares(id) ON DELETE CASCADE,
  audit_id text NOT NULL,
  event text NOT NULL DEFAULT 'view',
  user_agent text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id text NOT NULL,
  share_id uuid REFERENCES public.audit_shares(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_shares_audit ON public.audit_shares(audit_id);
CREATE INDEX idx_report_views_audit ON public.report_views(audit_id);
CREATE INDEX idx_follow_ups_status ON public.follow_ups(status);

GRANT ALL ON public.audit_shares TO service_role;
GRANT ALL ON public.report_views TO service_role;
GRANT ALL ON public.follow_ups TO service_role;

ALTER TABLE public.audit_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to audit_shares" ON public.audit_shares FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No direct access to report_views" ON public.report_views FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No direct access to follow_ups" ON public.follow_ups FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER update_audit_shares_updated_at BEFORE UPDATE ON public.audit_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- 20260909025928: follow-up outcome fields ----
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS outcome text NOT NULL DEFAULT '';
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS outcome_note text NOT NULL DEFAULT '';

-- ---- 20260915000000: share passcode lockout ----
ALTER TABLE public.audit_shares
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone;

-- ---- 20260915010000: proposal + engagement stage fields ----
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS engagement_stage text NOT NULL DEFAULT '1.1',
  ADD COLUMN IF NOT EXISTS proposal_scope text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_investment text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_timeline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_start_date text NOT NULL DEFAULT '';

-- ---- 20260915020000: introduction, growth goals, cost phases ----
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS introduction text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS growth_goals text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cost_phases jsonb NOT NULL DEFAULT '[]'::jsonb;
