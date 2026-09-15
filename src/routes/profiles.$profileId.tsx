import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, FileText, Plus } from "lucide-react";
import { MonoLabel, StatBlock, StatusChip } from "@/components/brand";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { createBlankAudit, useAudits, useProfiles } from "@/lib/audit-store";
import { currency, formatDate, totalValue } from "@/lib/audit-types";
import { gateBeforeLoad } from "@/lib/gate";

export const Route = createFileRoute("/profiles/$profileId")({
  beforeLoad: gateBeforeLoad,
  head: () => ({
    meta: [
      { title: "Team profile — UiLab Base Walkthrough" },
      { name: "description", content: "Audits owned by this team member." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profileId } = Route.useParams();
  const { profiles, ready: profilesReady } = useProfiles();
  const { audits, ready, saveAudit } = useAudits();
  const navigate = useNavigate();

  const profile = profiles.find((p) => p.id === profileId);
  const mine = audits.filter((a) => a.profileId === profileId);
  const value = mine.reduce((n, a) => n + totalValue(a), 0);

  async function newForProfile() {
    const audit = createBlankAudit(profileId, profile ? `${profile.name} · UiLab` : "");
    await saveAudit(audit);
    navigate({ to: "/audits/$id", params: { id: audit.id } });
  }

  if (profilesReady && !profile) {
    return (
      <AppShell eyebrow="Team" title="Profile not found.">
        <Button asChild variant="outline" className="label-mono">
          <Link to="/">
            <ArrowLeft className="size-3.5" /> Back to dashboard
          </Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="Team profile"
      title={profile ? `${profile.name} — ${profile.role}` : "Loading…"}
      actions={
        <>
          <Button asChild variant="outline" className="label-mono">
            <Link to="/">
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
          </Button>
          <Button onClick={newForProfile} className="label-mono">
            <Plus className="size-3.5" /> New walkthrough
          </Button>
        </>
      }
    >
      {profile ? (
        <div className="mb-8 h-2 w-24" style={{ backgroundColor: profile.color }} aria-hidden />
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatBlock label="Audits owned" value={String(mine.length)} sub="Assigned to this profile" />
        <StatBlock label="Client-ready" value={String(mine.filter((a) => a.status === "client-ready").length)} />
        <StatBlock label="Annual value identified" value={currency(value)} accent />
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between border-b pb-3">
          <MonoLabel className="opacity-100">Their walkthroughs</MonoLabel>
          <MonoLabel>{ready ? `${mine.length} audits` : "Loading"}</MonoLabel>
        </div>
        {ready && mine.length === 0 ? (
          <p className="border-b py-10 text-sm opacity-70">
            No audits assigned to this profile yet — start one above.
          </p>
        ) : null}
        <ul className="divide-y">
          {mine.map((audit) => (
            <li key={audit.id} className="grid gap-4 py-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusChip status={audit.status} />
                  <MonoLabel>{audit.reference}</MonoLabel>
                  <MonoLabel>{formatDate(audit.walkthroughDate)}</MonoLabel>
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em]">
                  {audit.client || "Untitled walkthrough"}
                </h2>
                <p className="mt-1 text-sm opacity-70">
                  {audit.site || "Site not set"} · {currency(totalValue(audit))} annual value
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="label-mono">
                  <Link to="/audits/$id" params={{ id: audit.id }}>
                    Open audit <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
                <Button asChild className="label-mono">
                  <Link to="/audits/$id/report" params={{ id: audit.id }}>
                    <FileText className="size-3.5" /> Dossier
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
