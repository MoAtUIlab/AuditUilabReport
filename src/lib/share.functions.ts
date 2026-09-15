import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { passwordMatches, requireUnlocked } from "./gate.server";
import type { Audit, EvidencePhoto } from "./audit-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BUCKET = "evidence-photos";
const SIGNED_URL_TTL = 60 * 60 * 6;
const MAX_PASSCODE_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export interface ShareLink {
  id: string;
  auditId: string;
  token: string;
  passcode: string;
  recipientName: string;
  recipientEmail: string;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
  views: number;
  prints: number;
  lastViewedAt: string | null;
}

export interface ViewEvent {
  id: string;
  auditId: string;
  shareId: string | null;
  event: string;
  userAgent: string;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  auditId: string;
  shareId: string | null;
  reason: string;
  status: string;
  outcome: string;
  outcomeNote: string;
  createdAt: string;
}

function randomToken(len = 22) {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function randomPasscode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function rowToAudit(row: any, signedUrls: Record<string, string>): Audit {
  const photos = (row.photos ?? []) as EvidencePhoto[];
  return {
    id: row.id,
    profileId: row.profile_id ?? null,
    client: row.client ?? "",
    site: row.site ?? "",
    industry: row.industry ?? "",
    auditor: row.auditor ?? "",
    walkthroughDate: row.walkthrough_date ?? "",
    status: row.status ?? "draft",
    headcount: row.headcount ?? 0,
    reference: row.reference ?? "",
    executiveSummary: row.executive_summary ?? "",
    scope: row.scope ?? "",
    introduction: row.introduction ?? "",
    growthGoals: row.growth_goals ?? "",
    maturity: row.maturity ?? [],
    findings: row.findings ?? [],
    opportunities: row.opportunities ?? [],
    photos: photos.map((p) =>
      p.path && signedUrls[p.path] ? { ...p, url: signedUrls[p.path]! } : p,
    ),
    recommendations: row.recommendations ?? [],
    costPhases: row.cost_phases ?? [],
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    locationLabel: row.location_label ?? "",
    capturedAt: row.captured_at ?? null,
    engagementStage: row.engagement_stage ?? "1.1",
    proposalScope: row.proposal_scope ?? "",
    proposalInvestment: row.proposal_investment ?? "",
    proposalTimeline: row.proposal_timeline ?? "",
    proposalStartDate: row.proposal_start_date ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

async function signPhotos(admin: any, row: any) {
  const paths = ((row.photos ?? []) as EvidencePhoto[]).map((p) => p.path).filter(Boolean) as string[];
  if (!paths.length) return {};
  const { data } = await admin.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  const map: Record<string, string> = {};
  for (const e of data ?? []) if (e.path && e.signedUrl) map[e.path] = e.signedUrl;
  return map;
}

/* ------------------------------- team side ------------------------------- */

export const createShareLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        auditId: z.string(),
        recipientName: z.string().default(""),
        recipientEmail: z.string().default(""),
        expiresInDays: z.number().nullable().default(null),
        passcode: z
          .string()
          .regex(/^\d{4}$/, "The PIN needs to be 4 digits")
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expiresAt =
      data.expiresInDays && data.expiresInDays > 0
        ? new Date(Date.now() + data.expiresInDays * 86400000).toISOString()
        : null;
    const { data: row, error } = await supabaseAdmin
      .from("audit_shares")
      .insert({
        audit_id: data.auditId,
        token: randomToken(),
        passcode: data.passcode || randomPasscode(),
        recipient_name: data.recipientName,
        recipient_email: data.recipientEmail,
        expires_at: expiresAt,
      } as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { token: (row as any).token as string, passcode: (row as any).passcode as string };
  });

export const listShareLinks = createServerFn({ method: "GET" })
  .inputValidator((data: { auditId: string }) => z.object({ auditId: z.string() }).parse(data))
  .handler(async ({ data }): Promise<ShareLink[]> => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: shares, error }, { data: views }] = await Promise.all([
      supabaseAdmin
        .from("audit_shares")
        .select("*")
        .eq("audit_id", data.auditId)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("report_views").select("*").eq("audit_id", data.auditId),
    ]);
    if (error) throw new Error(error.message);
    return (shares ?? []).map((s: any) => {
      const mine = (views ?? []).filter((v: any) => v.share_id === s.id);
      const viewRows = mine.filter((v: any) => v.event === "view");
      return {
        id: s.id,
        auditId: s.audit_id,
        token: s.token,
        passcode: s.passcode,
        recipientName: s.recipient_name,
        recipientEmail: s.recipient_email,
        expiresAt: s.expires_at,
        revoked: s.revoked,
        createdAt: s.created_at,
        views: viewRows.length,
        prints: mine.filter((v: any) => v.event === "print").length,
        lastViewedAt:
          mine.length > 0
            ? mine.map((v: any) => v.created_at).sort().slice(-1)[0]!
            : null,
      };
    });
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("audit_shares")
      .update({ revoked: true } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listAuditViews = createServerFn({ method: "GET" })
  .inputValidator((data: { auditId: string }) => z.object({ auditId: z.string() }).parse(data))
  .handler(async ({ data }): Promise<ViewEvent[]> => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("report_views")
      .select("*")
      .eq("audit_id", data.auditId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      auditId: r.audit_id,
      shareId: r.share_id,
      event: r.event,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    }));
  });

/** Team-wide engagement metrics for the dashboard. */
export const viewMetrics = createServerFn({ method: "GET" })
  .inputValidator((data: { profileId?: string } = {}) =>
    z.object({ profileId: z.string().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profileId = data.profileId;
    const [{ data: views }, { data: shares }, { data: followUps }, { data: audits }] = await Promise.all([
      supabaseAdmin.from("report_views").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("audit_shares").select("*"),
      supabaseAdmin.from("follow_ups").select("*"),
      supabaseAdmin.from("audits").select("id,profile_id"),
    ]);
    const auditProfile = new Map<string, string | null>();
    for (const a of audits ?? []) {
      auditProfile.set(a.id, a.profile_id ?? null);
    }
    const allowed = (auditId: string) => !profileId || auditProfile.get(auditId) === profileId;
    const rows = ((views ?? []) as any[]).filter((r) => allowed(r.audit_id));
    const shareRows = ((shares ?? []) as any[]).filter((s) => allowed(s.audit_id));
    const followRows = ((followUps ?? []) as any[]).filter((f) => allowed(f.audit_id));
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const fortnightAgo = now - 14 * 86400000;

  const isView = (event: string) => event !== "print" && event !== "download";

  // Per-audit aggregates.
  const byAudit = new Map<
    string,
    { auditId: string; views: number; prints: number; last: string }
  >();
  for (const r of rows) {
    const entry = byAudit.get(r.audit_id) ?? {
      auditId: r.audit_id,
      views: 0,
      prints: 0,
      last: r.created_at,
    };
    if (r.event === "print" || r.event === "download") entry.prints += 1;
    else entry.views += 1;
    if (r.created_at > entry.last) entry.last = r.created_at;
    byAudit.set(r.audit_id, entry);
  }

  // Per-share first view for open rate + time-to-open.
  const firstViewByShare = new Map<string, string>();
  for (const r of rows) {
    if (!isView(r.event)) continue;
    const existing = firstViewByShare.get(r.share_id);
    if (!existing || r.created_at < existing) firstViewByShare.set(r.share_id, r.created_at);
  }

  const activeShares = shareRows.filter((s) => !s.revoked);
  const openedActive = activeShares.filter((s) => firstViewByShare.has(s.id));
  const staleLinks = activeShares.filter((s) => {
    if (firstViewByShare.has(s.id)) return false;
    return new Date(s.created_at).getTime() < fortnightAgo;
  }).length;

  const timeToOpenHours: number[] = [];
  for (const s of shareRows) {
    const first = firstViewByShare.get(s.id);
    if (!first) continue;
    const hours = (new Date(first).getTime() - new Date(s.created_at).getTime()) / 36e5;
    if (hours >= 0) timeToOpenHours.push(hours);
  }

  // Weekly buckets for the last 12 weeks.
  function weekStart(d: Date) {
    const t = new Date(d);
    const day = t.getDay();
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() - day);
    return t.toISOString().slice(0, 10);
  }
  const weekly = new Map<string, { week: string; views: number; prints: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = weekStart(d);
    weekly.set(key, { week: key, views: 0, prints: 0 });
  }
  for (const r of rows) {
    const key = weekStart(new Date(r.created_at));
    if (!weekly.has(key)) continue;
    const bucket = weekly.get(key)!;
    if (r.event === "print" || r.event === "download") bucket.prints += 1;
    else bucket.views += 1;
  }

  // Funnel: sent → opened → followed up → progressed.
  const openedShareIds = new Set(rows.filter((r) => isView(r.event)).map((r) => r.share_id));
  const followedUp = followRows.filter((f) => f.status === "done").length;
  const progressed = followRows.filter(
    (f) =>
      f.status === "done" &&
      ["meeting booked", "progressed", "won"].includes(String(f.outcome).toLowerCase()),
  ).length;

  return {
    totalViews: rows.filter((r) => isView(r.event)).length,
    totalPrints: rows.filter((r) => r.event === "print" || r.event === "download").length,
    viewsThisWeek: rows.filter((r) => isView(r.event) && new Date(r.created_at).getTime() > weekAgo)
      .length,
    activeLinks: activeShares.length,
    openRate: activeShares.length ? Math.round((openedActive.length / activeShares.length) * 100) : 0,
    staleLinks,
    avgTimeToOpenHours: timeToOpenHours.length
      ? Math.round(timeToOpenHours.reduce((a, b) => a + b, 0) / timeToOpenHours.length)
      : null,
    weekly: [...weekly.values()],
    funnel: {
      sent: shareRows.length,
      opened: openedShareIds.size,
      followedUp,
      progressed,
    },
    perAudit: [...byAudit.values()]
      .map((a) => ({
        ...a,
        daysSince: Math.max(
          0,
          Math.floor((now - new Date(a.last).getTime()) / 86400000),
        ),
      }))
      .sort((a, b) => (a.last > b.last ? -1 : 1))
      .slice(0, 8),
  };
});

export const listFollowUps = createServerFn({ method: "GET" }).handler(async (): Promise<FollowUp[]> => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("follow_ups")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    auditId: r.audit_id,
    shareId: r.share_id,
    reason: r.reason,
    status: r.status,
    outcome: r.outcome ?? "",
    outcomeNote: r.outcome_note ?? "",
    createdAt: r.created_at,
  }));
});

export const resolveFollowUp = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      status: "done" | "dismissed";
      outcome?: string;
      outcomeNote?: string;
    }) =>
      z
        .object({
          id: z.string(),
          status: z.enum(["done", "dismissed"]),
          outcome: z.string().default(""),
          outcomeNote: z.string().default(""),
        })
        .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("follow_ups")
      .update(
        {
          status: data.status,
          outcome: data.outcome,
          outcome_note: data.outcomeNote,
        } as never,
      )
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------------ client side ------------------------------ */

/** Public: does this link exist, and is it still valid? No passcode needed. */
export const shareIntro = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => z.object({ token: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: share } = await supabaseAdmin
      .from("audit_shares")
      .select("id, revoked, expires_at, recipient_name, audit_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!share) return { status: "missing" as const };
    const s = share as any;
    if (s.revoked) return { status: "revoked" as const };
    if (s.expires_at && new Date(s.expires_at).getTime() < Date.now())
      return { status: "expired" as const };
    const { data: audit } = await supabaseAdmin
      .from("audits")
      .select("client")
      .eq("id", s.audit_id)
      .maybeSingle();
    return {
      status: "ok" as const,
      recipientName: s.recipient_name as string,
      client: ((audit as any)?.client ?? "") as string,
    };
  });

/** Public: exchange token + passcode for the client-facing report, and log the view. */
export const openShare = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; passcode: string }) =>
    z.object({ token: z.string(), passcode: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: share } = await supabaseAdmin
      .from("audit_shares")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (!share) return { ok: false as const, reason: "missing" as const };
    const s = share as any;
    if (s.revoked) return { ok: false as const, reason: "revoked" as const };
    if (s.expires_at && new Date(s.expires_at).getTime() < Date.now())
      return { ok: false as const, reason: "expired" as const };

    if (s.locked_until && new Date(s.locked_until).getTime() > Date.now())
      return { ok: false as const, reason: "locked" as const };

    if (!passwordMatches(String(data.passcode ?? "").trim(), String(s.passcode))) {
      const attempts = (s.failed_attempts ?? 0) + 1;
      const lockedOut = attempts >= MAX_PASSCODE_ATTEMPTS;
      await supabaseAdmin
        .from("audit_shares")
        .update({
          failed_attempts: lockedOut ? 0 : attempts,
          locked_until: lockedOut ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null,
        } as never)
        .eq("id", s.id);
      return { ok: false as const, reason: lockedOut ? ("locked" as const) : ("passcode" as const) };
    }

    if (s.failed_attempts || s.locked_until) {
      await supabaseAdmin
        .from("audit_shares")
        .update({ failed_attempts: 0, locked_until: null } as never)
        .eq("id", s.id);
    }

    const { data: row } = await supabaseAdmin
      .from("audits")
      .select("*")
      .eq("id", s.audit_id)
      .maybeSingle();
    if (!row) return { ok: false as const, reason: "missing" as const };

    const request = getRequest();
    await supabaseAdmin.from("report_views").insert({
      share_id: s.id,
      audit_id: s.audit_id,
      event: "view",
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? "",
      referrer: request.headers.get("referer")?.slice(0, 300) ?? "",
    } as never);

    // Remind the team to follow up, once per link.
    const { data: existing } = await supabaseAdmin
      .from("follow_ups")
      .select("id")
      .eq("share_id", s.id)
      .eq("status", "pending")
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("follow_ups").insert({
        audit_id: s.audit_id,
        share_id: s.id,
        reason: `${s.recipient_name || "The client"} opened the report`,
      } as never);
    }

    const signed = await signPhotos(supabaseAdmin, row);
    return { ok: true as const, audit: rowToAudit(row, signed) };
  });

/** Public: log a print / download of a shared report. */
export const recordShareEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; event: string }) =>
    z.object({ token: z.string(), event: z.enum(["print", "download"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: share } = await supabaseAdmin
      .from("audit_shares")
      .select("id, audit_id, revoked")
      .eq("token", data.token)
      .maybeSingle();
    const s = share as any;
    if (!s || s.revoked) return { ok: false as const };
    await supabaseAdmin.from("report_views").insert({
      share_id: s.id,
      audit_id: s.audit_id,
      event: data.event,
    } as never);
    return { ok: true as const };
  });
