import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { uid, type Audit, type Profile } from "./audit-types";
import {
  listAudits,
  listProfiles,
  saveAudit as saveAuditFn,
  deleteAudit as deleteAuditFn,
  getAudit,
  uploadEvidencePhoto,
} from "./audit.functions";
import {
  cacheAudits,
  flushQueue,
  mergedAudits,
  pendingAudits,
  queueAudit,
} from "./offline-queue";

export function createBlankAudit(profileId: string | null = null, auditor = ""): Audit {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: uid("audit"),
    profileId,
    client: "",
    site: "",
    industry: "",
    auditor: auditor || "UiLab Applied AI team",
    walkthroughDate: today,
    status: "draft",
    headcount: 0,
    reference: `UIL-BW-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
    executiveSummary: "",
    scope: "",
    introduction: "",
    growthGoals: "",
    maturity: [
      { id: uid("m"), label: "Data foundations", score: 0, note: "" },
      { id: uid("m"), label: "Process documentation", score: 0, note: "" },
      { id: uid("m"), label: "Systems integration", score: 0, note: "" },
      { id: uid("m"), label: "Workforce readiness", score: 0, note: "" },
      { id: uid("m"), label: "AI adoption", score: 0, note: "" },
      { id: uid("m"), label: "Measurement & reporting", score: 0, note: "" },
    ],
    findings: [],
    opportunities: [],
    photos: [],
    recommendations: [],
    costPhases: [],
    latitude: null,
    longitude: null,
    locationLabel: "",
    capturedAt: null,
    engagementStage: "1.1",
    proposalScope: "",
    proposalInvestment: "",
    proposalTimeline: "",
    proposalStartDate: "",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Records queued locally (or saved) before a field was added to the schema come back
 * without it — e.g. a walkthrough drafted before `costPhases`/`introduction` existed.
 * Every array/string field the editor reaches into with `.map()` or string ops must be
 * backfilled here, or an old record crashes the editor the moment it loads.
 */
function normalizeAudit(audit: Audit): Audit {
  return {
    ...audit,
    introduction: audit.introduction ?? "",
    growthGoals: audit.growthGoals ?? "",
    maturity: audit.maturity ?? [],
    findings: audit.findings ?? [],
    opportunities: audit.opportunities ?? [],
    photos: audit.photos ?? [],
    recommendations: audit.recommendations ?? [],
    costPhases: audit.costPhases ?? [],
    engagementStage: audit.engagementStage ?? "1.1",
    proposalScope: audit.proposalScope ?? "",
    proposalInvestment: audit.proposalInvestment ?? "",
    proposalTimeline: audit.proposalTimeline ?? "",
    proposalStartDate: audit.proposalStartDate ?? "",
  };
}

export function useAudits() {
  const queryClient = useQueryClient();
  const fetchAudits = useServerFn(listAudits);
  const saveFn = useServerFn(saveAuditFn);
  const deleteFn = useServerFn(deleteAuditFn);
  const uploadFn = useServerFn(uploadEvidencePhoto);
  const [pending, setPending] = useState(0);
  // SSR always renders with no localStorage to read, but a client that has
  // visited before has cached audits and a possible offline queue sitting in
  // localStorage from the very first render — reading it immediately made the
  // client's first paint diverge from the server HTML on every load,
  // triggering a hydration mismatch (React error #418) that forced a full
  // client-side remount. That remount racing against the report route's
  // fixed-delay auto-print was the actual cause of broken/incomplete PDFs.
  // Deferring local-only data to after mount keeps the first paint identical
  // to the server's.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isPending, isError } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      const rows = await fetchAudits();
      cacheAudits(rows as Audit[]);
      return rows as Audit[];
    },
    retry: false,
  });

  const sync = useCallback(async () => {
    const result = await flushQueue({
      uploadPhoto: async (file) => {
        const form = new FormData();
        form.append("file", file);
        return (await uploadFn({ data: form })) as { path: string; url: string };
      },
      saveAudit: async (audit) => saveFn({ data: audit }),
    });
    setPending(pendingAudits().length);
    if (result.synced > 0) await queryClient.invalidateQueries({ queryKey: ["audits"] });
    return result;
  }, [uploadFn, saveFn, queryClient]);

  useEffect(() => {
    setPending(pendingAudits().length);
    void sync();
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sync]);

  /**
   * Returns whether the audit actually reached the server. On any failure — offline
   * or a real server error — the edit is queued on the device and retried later, but
   * callers must check `synced` rather than assume a resolved promise means "saved":
   * silently reporting "Saved" for a queued-but-not-yet-synced edit previously caused
   * a real data-loss incident (a stale queued copy overwrote a fresher server edit).
   */
  const saveAudit = useCallback(
    async (audit: Audit): Promise<{ synced: boolean; offline: boolean }> => {
      const stamped = { ...audit, updatedAt: new Date().toISOString() };
      const offlineNow = typeof navigator !== "undefined" && navigator.onLine === false;
      if (offlineNow) {
        queueAudit(stamped);
        setPending(pendingAudits().length);
        return { synced: false, offline: true };
      }
      try {
        await saveFn({ data: stamped });
        await queryClient.invalidateQueries({ queryKey: ["audits"] });
        return { synced: true, offline: false };
      } catch (error) {
        // Real error while online: hold it on the device and push it later, but tell
        // the caller it hasn't actually landed on the server yet.
        queueAudit(stamped);
        setPending(pendingAudits().length);
        console.error(error);
        return { synced: false, offline: false };
      }
    },
    [saveFn, queryClient],
  );

  const removeAudit = useCallback(
    async (id: string) => {
      await deleteFn({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
    [deleteFn, queryClient],
  );

  const audits = mergedAudits(isError ? undefined : (data as Audit[] | undefined), mounted).map(
    normalizeAudit,
  );

  return { audits, ready: !isPending, offline: isError, pending, sync, saveAudit, removeAudit };
}

export function useAudit(id: string) {
  const store = useAudits();
  return { ...store, audit: store.audits.find((a) => a.id === id) ?? null };
}

export function useProfiles() {
  const fetchProfiles = useServerFn(listProfiles);
  const { data, isPending } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => fetchProfiles(),
    retry: false,
  });
  return { profiles: (data ?? []) as Profile[], ready: !isPending };
}

export async function fetchAuditById(id: string): Promise<Audit | null> {
  const audit = await getAudit({ data: { id } });
  return audit ? normalizeAudit(audit) : null;
}
