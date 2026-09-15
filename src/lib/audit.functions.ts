import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUnlocked } from "./gate.server";
import type { Audit, EvidencePhoto, Profile } from "./audit-types";

const BUCKET = "evidence-photos";
const SIGNED_URL_TTL = 60 * 60 * 6; // 6 hours

/* eslint-disable @typescript-eslint/no-explicit-any */

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
    maturity: row.maturity ?? [],
    findings: row.findings ?? [],
    opportunities: row.opportunities ?? [],
    photos: photos.map((p) => (p.path && signedUrls[p.path] ? { ...p, url: signedUrls[p.path]! } : p)),
    recommendations: row.recommendations ?? [],
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    locationLabel: row.location_label ?? "",
    capturedAt: row.captured_at ?? null,
    updatedAt: row.updated_at ?? "",
  };
}

function auditToRow(audit: Audit) {
  return {
    id: audit.id,
    profile_id: audit.profileId,
    client: audit.client,
    site: audit.site,
    industry: audit.industry,
    auditor: audit.auditor,
    walkthrough_date: audit.walkthroughDate,
    status: audit.status,
    headcount: audit.headcount,
    reference: audit.reference,
    executive_summary: audit.executiveSummary,
    scope: audit.scope,
    maturity: audit.maturity,
    findings: audit.findings,
    opportunities: audit.opportunities,
    photos: audit.photos,
    recommendations: audit.recommendations,
    latitude: audit.latitude ?? null,
    longitude: audit.longitude ?? null,
    location_label: audit.locationLabel ?? "",
    captured_at: audit.capturedAt ?? null,
  };
}

async function signPhotoPaths(admin: any, rows: any[]): Promise<Record<string, string>> {
  const paths = [
    ...new Set(
      rows.flatMap((r) => ((r.photos ?? []) as EvidencePhoto[]).map((p) => p.path).filter(Boolean)),
    ),
  ] as string[];
  if (paths.length === 0) return {};
  const { data } = await admin.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
  }
  return map;
}

export const listAudits = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("audits")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const signed = await signPhotoPaths(supabaseAdmin, data ?? []);
  return (data ?? []).map((r) => rowToAudit(r, signed));
});

export const getAudit = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("audits")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const signed = await signPhotoPaths(supabaseAdmin, [row]);
    return rowToAudit(row, signed);
  });

const auditSchema = z.object({
  id: z.string(),
  profileId: z.string().nullable(),
  client: z.string(),
  site: z.string(),
  industry: z.string(),
  auditor: z.string(),
  walkthroughDate: z.string(),
  status: z.enum(["draft", "in-review", "client-ready"]),
  headcount: z.number(),
  reference: z.string(),
  executiveSummary: z.string(),
  scope: z.string(),
  maturity: z.array(z.any()),
  findings: z.array(z.any()),
  opportunities: z.array(z.any()),
  photos: z.array(z.any()),
  recommendations: z.array(z.any()),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  locationLabel: z.string().optional(),
  capturedAt: z.string().nullable().optional(),
  updatedAt: z.string(),
});

export const saveAudit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => auditSchema.parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = auditToRow(data as Audit) as unknown as Record<string, unknown>;
    const { error } = await supabaseAdmin.from("audits").upsert(row as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteAudit = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("audits").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listProfiles = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("profiles").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(
    (p: any): Profile => ({ id: p.id, name: p.name, role: p.role, color: p.color }),
  );
});

export const createProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; role: string }) =>
    z.object({ name: z.string().min(1), role: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const palette = ["#ff6325", "#ffcd0e", "#f5f1ea", "#c3a5b1"];
    const color = palette[Math.floor(Math.random() * palette.length)] ?? "#ff6325";
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .insert({ name: data.name, role: data.role || "Consultant", color })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const uploadEvidencePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected form data");
    return data;
  })
  .handler(async ({ data }) => {
    await requireUnlocked();
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    if (file.size > 15 * 1024 * 1024) throw new Error("Photo is larger than 15MB");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
    });
    if (error) throw new Error(error.message);
    const { data: signed } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    return { path, url: signed?.signedUrl ?? "" };
  });
