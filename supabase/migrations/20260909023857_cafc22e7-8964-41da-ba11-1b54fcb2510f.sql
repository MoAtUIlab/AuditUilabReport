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