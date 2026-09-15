export type AuditStatus = "draft" | "in-review" | "client-ready";

export type Severity = "low" | "moderate" | "high" | "critical";
export type Scale = "low" | "medium" | "high";

export interface Finding {
  id: string;
  area: string;
  observation: string;
  severity: Severity;
  impact: string;
}

export interface Opportunity {
  id: string;
  title: string;
  process: string;
  category: string;
  effort: Scale;
  impact: Scale;
  hoursSavedPerYear: number;
  annualValue: number;
  horizon: string;
}

export interface EvidencePhoto {
  id: string;
  /** Display URL — a signed URL hydrated on read, or an external link. */
  url: string;
  /** Storage object path inside the evidence bucket, when uploaded. */
  path?: string;
  caption: string;
  area: string;
  tag: string;
}

export interface Profile {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface MaturityScore {
  id: string;
  label: string;
  score: number; // 0-5
  note: string;
}

export interface Recommendation {
  id: string;
  phase: string;
  title: string;
  detail: string;
}

export interface Audit {
  id: string;
  profileId: string | null;
  client: string;
  site: string;
  industry: string;
  auditor: string;
  walkthroughDate: string;
  status: AuditStatus;
  headcount: number;
  reference: string;
  executiveSummary: string;
  scope: string;
  maturity: MaturityScore[];
  findings: Finding[];
  opportunities: Opportunity[];
  photos: EvidencePhoto[];
  recommendations: Recommendation[];
  /** On-site capture: GPS position and label taken during the walkthrough. */
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string;
  capturedAt?: string | null;
  updatedAt: string;
}

export const SEVERITIES: Severity[] = ["low", "moderate", "high", "critical"];
export const SCALES: Scale[] = ["low", "medium", "high"];
export const STATUSES: AuditStatus[] = ["draft", "in-review", "client-ready"];

export const STATUS_LABEL: Record<AuditStatus, string> = {
  draft: "Draft",
  "in-review": "In review",
  "client-ready": "Client ready",
};

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function currency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function totalValue(audit: Audit) {
  return audit.opportunities.reduce((sum, o) => sum + (o.annualValue || 0), 0);
}

export function totalHours(audit: Audit) {
  return audit.opportunities.reduce((sum, o) => sum + (o.hoursSavedPerYear || 0), 0);
}

export function maturityAverage(audit: Audit) {
  if (!audit.maturity.length) return 0;
  const sum = audit.maturity.reduce((s, m) => s + m.score, 0);
  return Math.round((sum / audit.maturity.length) * 10) / 10;
}

export function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}
