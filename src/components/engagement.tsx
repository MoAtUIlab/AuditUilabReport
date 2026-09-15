import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Eye, Loader2, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { MonoLabel, StatBlock } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listFollowUps, resolveFollowUp, viewMetrics } from "@/lib/share.functions";
import type { Audit } from "@/lib/audit-types";

const OUTCOMES = [
  { value: "meeting booked", label: "Meeting booked" },
  { value: "progressed", label: "Progressed" },
  { value: "no response", label: "No response" },
  { value: "not interested", label: "Not interested" },
  { value: "other", label: "Other" },
];

/** Who has read their report, and who still needs chasing. */
export function EngagementSection({
  audits,
  profileId,
}: {
  audits: Audit[];
  profileId?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const fetchMetrics = useServerFn(viewMetrics);
  const fetchFollowUps = useServerFn(listFollowUps);
  const resolve = useServerFn(resolveFollowUp);

  const metrics = useQuery({
    queryKey: ["view-metrics", profileId || "all"],
    queryFn: () => fetchMetrics(profileId ? { data: { profileId } } : { data: {} }),
    retry: false,
  });
  const followUps = useQuery({
    queryKey: ["follow-ups"],
    queryFn: () => fetchFollowUps(),
    retry: false,
  });

  const belongs = (auditId: string) =>
    !profileId || audits.find((a) => a.id === auditId)?.profileId === profileId;

  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const name = (auditId: string) =>
    audits.find((a) => a.id === auditId)?.client || "Untitled walkthrough";

  async function answer(id: string, status: "done" | "dismissed") {
    const outcome = outcomes[id];
    if (status === "done" && !outcome) {
      toast.error("Pick an outcome before confirming the follow-up.");
      return;
    }
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await resolve({
        data: {
          id,
          status,
          outcome: outcome || "dismissed",
          outcomeNote: notes[id] || "",
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      await queryClient.invalidateQueries({ queryKey: ["view-metrics"] });
      toast.success(status === "done" ? "Marked as followed up" : "Reminder cleared");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  const m = metrics.data;
  const pending = (followUps.data ?? []).filter((f) => belongs(f.auditId));

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between border-b pb-3">
        <MonoLabel className="opacity-100">Client engagement</MonoLabel>
        <MonoLabel>{m ? `${m.activeLinks} live links` : ""}</MonoLabel>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Report opens" value={String(m?.totalViews ?? 0)} sub="All time" />
        <StatBlock label="Opens this week" value={String(m?.viewsThisWeek ?? 0)} accent />
        <StatBlock
          label="Open rate"
          value={`${m?.openRate ?? 0}%`}
          sub={`${m?.activeLinks ?? 0} live links`}
        />
        <StatBlock
          label="Stale links"
          value={String(m?.staleLinks ?? 0)}
          sub="No opens in 14 days"
        />
      </div>

      {pending.length > 0 ? (
        <div className="mt-6 border-2 border-foreground p-6">
          <p className="label-mono flex items-center gap-2 opacity-100">
            <BellRing className="size-3.5 text-summer" /> Follow up?
          </p>
          <ul className="mt-4 divide-y">
            {pending.map((f) => (
              <li key={f.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                <div className="flex-1 text-sm">
                  <Link
                    to="/audits/$id"
                    params={{ id: f.auditId }}
                    className="brand-underline font-medium"
                  >
                    {name(f.auditId)}
                  </Link>{" "}
                  — {f.reason}. Have you followed up?
                </div>
                <div className="flex flex-1 flex-col gap-2 sm:max-w-md">
                  <Select
                    value={outcomes[f.id] || ""}
                    onValueChange={(v) => setOutcomes((o) => ({ ...o, [f.id]: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Outcome…" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOMES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={notes[f.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [f.id]: e.target.value }))}
                    placeholder="Note (optional)"
                    className="h-9"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="label-mono flex-1"
                      onClick={() => answer(f.id, "done")}
                      disabled={busy[f.id]}
                    >
                      {busy[f.id] ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      className="label-mono"
                      onClick={() => answer(f.id, "dismissed")}
                      disabled={busy[f.id]}
                    >
                      <X className="size-3.5" /> No / not needed
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {m && m.perAudit.length > 0 ? (
        <div className="mt-6 overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left opacity-70">
                <th className="py-3 font-normal">Client / audit</th>
                <th className="py-3 font-normal">Opens</th>
                <th className="py-3 font-normal">Prints</th>
                <th className="py-3 font-normal">Last open</th>
                <th className="py-3 font-normal">Days since</th>
                <th className="py-3 font-normal">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {m.perAudit.map((row) => (
                <tr key={row.auditId}>
                  <td className="py-3">
                    <Link
                      to="/audits/$id"
                      params={{ id: row.auditId }}
                      className="brand-underline font-medium"
                    >
                      {name(row.auditId)}
                    </Link>
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-1 opacity-80">
                      <Eye className="size-3.5" /> {row.views}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-1 opacity-80">
                      <Printer className="size-3.5" /> {row.prints}
                    </span>
                  </td>
                  <td className="py-3 opacity-80">
                    {new Date(row.last).toLocaleString("en-AU", { dateStyle: "medium" })}
                  </td>
                  <td className="py-3 opacity-80">{row.daysSince}</td>
                  <td className="py-3">
                    <Button asChild variant="outline" size="sm" className="label-mono">
                      <Link to="/audits/$id" params={{ id: row.auditId }}>
                        Open audit
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm opacity-60">
          No client has opened a report yet. Create a client link in an audit's Deliver tab.
        </p>
      )}
    </section>
  );
}
