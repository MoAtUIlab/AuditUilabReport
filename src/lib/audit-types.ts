export type AuditStatus = "draft" | "in-review" | "client-ready";

export type Severity = "low" | "moderate" | "high" | "critical";
export type Scale = "low" | "medium" | "high";
/** 1-3 rating used for Complexity / Timeline / Pricing, matching the Automation Power Session format. */
export type Rating = 1 | 2 | 3;
export type EngagementStage = "1.1" | "1.2" | "2" | "3" | "4";

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
  complexity: Rating;
  timelineRating: Rating;
  pricingRating: Rating;
  /** Groups opportunities in the report, e.g. "Material Mixing", "Production Line", "General". */
  section: string;
  /** Longer write-up shown in the report's detailed opportunities section. */
  narrative: string;
}

export interface CostPhase {
  id: string;
  section: string;
  estimatedTime: string;
  estimatedCost: string;
  supportModel: string;
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
  /** Site-visit narrative: who attended, company background, why UiLab visited. */
  introduction: string;
  /** One line per goal, rendered as a numbered list, e.g. "Securing consistent quality across all lines". */
  growthGoals: string;
  maturity: MaturityScore[];
  findings: Finding[];
  opportunities: Opportunity[];
  photos: EvidencePhoto[];
  recommendations: Recommendation[];
  /** Phased $ cost-of-engagement estimate across the whole project, shown in Timeline & Cost. */
  costPhases: CostPhase[];
  /** On-site capture: GPS position and label taken during the walkthrough. */
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string;
  capturedAt?: string | null;
  /** Which stage of the UiLab engagement model the client is currently at. */
  engagementStage: EngagementStage;
  /** Proposal for the next paid stage — printed with blank signature lines, not e-signed. */
  proposalScope: string;
  proposalInvestment: string;
  proposalTimeline: string;
  proposalStartDate: string;
  updatedAt: string;
}

export const SEVERITIES: Severity[] = ["low", "moderate", "high", "critical"];
export const SCALES: Scale[] = ["low", "medium", "high"];
export const STATUSES: AuditStatus[] = ["draft", "in-review", "client-ready"];
export const RATINGS: Rating[] = [1, 2, 3];

export const STATUS_LABEL: Record<AuditStatus, string> = {
  draft: "Draft",
  "in-review": "In review",
  "client-ready": "Client ready",
};

export const ENGAGEMENT_STAGES: EngagementStage[] = ["1.1", "1.2", "2", "3", "4"];

export const ENGAGEMENT_STAGE_LABEL: Record<EngagementStage, string> = {
  "1.1": "Scope definition & process analysis",
  "1.2": "Feasibility, vendor selection & project plan",
  "2": "Procurement, design validation & factory acceptance",
  "3": "Delivery, commissioning & handover",
  "4": "Ongoing support & growth",
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
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
