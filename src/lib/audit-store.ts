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

export function useAudits() {
  const queryClient = useQueryClient();
  const fetchAudits = useServerFn(listAudits);
  const saveFn = useServerFn(saveAuditFn);
  const deleteFn = useServerFn(deleteAuditFn);
  const uploadFn = useServerFn(uploadEvidencePhoto);
  const [pending, setPending] = useState(0);

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

  const saveAudit = useCallback(
    async (audit: Audit) => {
      const stamped = { ...audit, updatedAt: new Date().toISOString() };
      try {
        if (typeof navigator !== "undefined" && navigator.onLine === false)
          throw new Error("offline");
        await saveFn({ data: stamped });
        await queryClient.invalidateQueries({ queryKey: ["audits"] });
      } catch (error) {
        // No signal on site: hold it on the device and push it later.
        queueAudit(stamped);
        setPending(pendingAudits().length);
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        if (!offline) console.error(error);
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

  const audits = mergedAudits(isError ? undefined : (data as Audit[] | undefined));

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
  return getAudit({ data: { id } });
}
