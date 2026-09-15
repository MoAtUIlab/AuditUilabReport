import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpRight, CloudOff, FileText, Loader2, Plus, Sparkles, UserPlus } from "lucide-react";
import { EngagementSection } from "@/components/engagement";
import { MetricsPanel } from "@/components/metrics-panel";
import { toast } from "sonner";
import { MonoLabel, StatBlock, StatusChip } from "@/components/brand";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBlankAudit, useAudits, useProfiles } from "@/lib/audit-store";
import { currency, formatDate, maturityAverage, totalHours, totalValue, type Audit } from "@/lib/audit-types";
import { createProfile } from "@/lib/audit.functions";
import { draftAuditFromNotes } from "@/lib/ai.functions";
import { gateBeforeLoad } from "@/lib/gate";

export const Route = createFileRoute("/")({
  beforeLoad: gateBeforeLoad,
  head: () => ({
    meta: [
      { title: "Base Walkthrough — UiLab Field Audit Dashboard" },
      {
        name: "description",
        content:
          "UiLab Base Walkthrough: internal field-audit intake and client-ready executive dossiers for manufacturing and industrial sites.",
      },
      { property: "og:title", content: "Base Walkthrough — UiLab Field Audit Dashboard" },
      {
        property: "og:description",
        content:
          "Capture site walkthrough findings, score automation maturity and issue a client-ready dossier.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { audits, ready, saveAudit, pending } = useAudits();
  const { profiles, ready: profilesReady } = useProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const navigate = useNavigate();

  const opportunities = audits.reduce((n, a) => n + a.opportunities.length, 0);
  const value = audits.reduce((n, a) => n + totalValue(a), 0);
  const hours = audits.reduce((n, a) => n + totalHours(a), 0);

  async function openBlank() {
    const audit = createBlankAudit();
    await saveAudit(audit);
    navigate({ to: "/audits/$id", params: { id: audit.id } });
  }

  return (
    <AppShell
      eyebrow="Internal field audit"
      title="Every walkthrough, scored and ready to hand to the client."
      actions={
        <>
          {pending > 0 ? (
            <span className="label-mono flex items-center gap-2 border border-summer px-3 py-2 text-summer">
              <CloudOff className="size-3.5" /> {pending} waiting to sync
            </span>
          ) : null}
          <Button onClick={openBlank} className="label-mono">
            <Plus className="size-3.5" /> Start on-site walkthrough
          </Button>
        </>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Active audits" value={String(audits.length)} sub="Across all sites" />
        <StatBlock
          label="Opportunities logged"
          value={String(opportunities)}
          sub="Automation and applied AI"
        />
        <StatBlock
          label="Hours released / year"
          value={hours.toLocaleString("en-AU")}
          sub="Estimated, avoidable effort"
        />
        <StatBlock label="Annual value identified" value={currency(value)} accent />
      </section>

      <Tabs defaultValue="overview" className="mt-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="label-mono">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="All team members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All team members</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="overview" className="space-y-0">
          <NotesIntake saveAudit={saveAudit} />
          <EngagementSection audits={audits} profileId={selectedProfileId || undefined} />
          <TeamSection profilesReady={profilesReady} />
          <section className="mt-12">
            <div className="flex items-end justify-between border-b pb-3">
              <MonoLabel className="opacity-100">Walkthrough register</MonoLabel>
              <MonoLabel>{ready ? `${audits.length} audits` : "Loading"}</MonoLabel>
            </div>

            {ready && audits.length === 0 ? (
              <div className="border-b py-16 text-center">
                <p className="text-2xl font-bold tracking-[-0.02em]">No walkthroughs yet</p>
                <p className="mt-2 text-sm opacity-70">
                  Paste your notes above or start a blank walkthrough.
                </p>
              </div>
            ) : null}

            <ul className="divide-y">
              {audits.map((audit) => (
                <AuditRow key={audit.id} audit={audit} />
              ))}
            </ul>
          </section>
        </TabsContent>
        <TabsContent value="metrics">
          <MetricsPanel profileId={selectedProfileId || undefined} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function AuditRow({ audit }: { audit: Audit }) {
  const { profiles } = useProfiles();
  const owner = profiles.find((p) => p.id === audit.profileId);
  return (
    <li className="grid gap-4 py-6 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={audit.status} />
          <MonoLabel>{audit.reference}</MonoLabel>
          <MonoLabel>{formatDate(audit.walkthroughDate)}</MonoLabel>
          {owner ? (
            <Link
              to="/profiles/$profileId"
              params={{ profileId: owner.id }}
              className="label-mono underline decoration-2 underline-offset-4 hover:text-summer"
              style={{ textDecorationColor: owner.color }}
            >
              {owner.name}
            </Link>
          ) : null}
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em]">
          {audit.client || "Untitled walkthrough"}
        </h2>
        <p className="mt-1 text-sm opacity-70">
          {audit.site || "Site not set"} · {audit.industry || "Industry not set"}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
          <Metric label="Maturity" value={`${maturityAverage(audit)} / 5`} />
          <Metric label="Findings" value={String(audit.findings.length)} />
          <Metric label="Opportunities" value={String(audit.opportunities.length)} />
          <Metric label="Evidence" value={`${audit.photos.length} photos`} />
          <Metric label="Annual value" value={currency(totalValue(audit))} />
        </div>
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
  );
}

function NotesIntake({ saveAudit }: { saveAudit: (a: Audit) => Promise<void> }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const draft = useServerFn(draftAuditFromNotes);
  const navigate = useNavigate();

  async function buildFromNotes() {
    setBusy(true);
    try {
      const d = await draft({ data: { notes } });
      const audit = createBlankAudit();
      const filled: Audit = {
        ...audit,
        client: d.client || audit.client,
        site: d.site,
        industry: d.industry,
        headcount: d.headcount,
        executiveSummary: d.executiveSummary,
        scope: d.scope,
        maturity: audit.maturity.map((m) => {
          const match = d.maturity.find(
            (x) => x.label.toLowerCase() === m.label.toLowerCase(),
          );
          return match ? { ...m, score: match.score, note: match.note } : m;
        }),
        findings: d.findings.map((f) => ({ ...f, id: crypto.randomUUID() })),
        opportunities: d.opportunities.map((o) => ({ ...o, id: crypto.randomUUID() })),
        recommendations: d.recommendations.map((r) => ({ ...r, id: crypto.randomUUID() })),
      };
      await saveAudit(filled);
      toast.success("Audit drafted from your notes — review and edit before sharing.");
      navigate({ to: "/audits/$id", params: { id: filled.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not draft the audit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 border-2 border-foreground p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Sparkles className="size-4 text-summer" />
        <MonoLabel className="opacity-100">Paste your walkthrough notes</MonoLabel>
      </div>
      <p className="mt-3 max-w-2xl text-sm opacity-70">
        Dump everything you captured on site — scribbles, voice-memo transcripts, bullet
        points. AI will turn it into a structured audit: summary, maturity scores, findings
        and an opportunity matrix. You review and edit everything before it goes to the client.
      </p>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Holmwood Highgate, sheet-metal fabricator, ~85 staff. Office manager re-keys every job card into Xero at night — about 2 hrs/day. No sensors on the press line, downtime logged on paper…"
        className="mt-4 min-h-32"
      />
      <Button
        onClick={buildFromNotes}
        disabled={busy || notes.trim().length < 10}
        className="label-mono mt-4"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {busy ? "Drafting audit…" : "Build audit from notes"}
      </Button>
    </section>
  );
}

function TeamSection({ profilesReady }: { profilesReady: boolean }) {
  const { profiles } = useProfiles();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const addProfile = useServerFn(createProfile);
  const queryClient = useQueryClient();
  const queryReady = profilesReady;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addProfile({ data: { name: name.trim(), role: role.trim() || "Consultant" } });
      setName("");
      setRole("");
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(`${name} added to the team.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between border-b pb-3">
        <MonoLabel className="opacity-100">Team</MonoLabel>
        <MonoLabel>{profilesReady && queryReady ? `${profiles.length} people` : ""}</MonoLabel>
      </div>
      <div className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {profiles.map((p) => (
          <Link
            key={p.id}
            to="/profiles/$profileId"
            params={{ profileId: p.id }}
            className="group border-2 border-foreground p-5 transition-colors hover:bg-foreground hover:text-background"
          >
            <span
              className="inline-block h-3 w-10"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
            <p className="mt-4 text-xl font-bold tracking-[-0.02em]">{p.name}</p>
            <p className="label-mono mt-1 opacity-60">{p.role}</p>
            <p className="label-mono mt-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-70">
              View audits <ArrowUpRight className="size-3" />
            </p>
          </Link>
        ))}
        <form onSubmit={add} className="border border-dashed p-5">
          <p className="label-mono flex items-center gap-2 opacity-70">
            <UserPlus className="size-3.5" /> Add teammate
          </p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="mt-3"
            aria-label="Teammate name"
          />
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role"
            className="mt-2"
            aria-label="Teammate role"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={busy || !name.trim()}
            className="label-mono mt-3 w-full"
          >
            Add
          </Button>
        </form>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <MonoLabel>{label}</MonoLabel>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
