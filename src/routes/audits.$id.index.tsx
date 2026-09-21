import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  MaturityBars,
  MonoLabel,
  OpportunityMatrix,
  SeverityChip,
  StatBlock,
  StatusChip,
} from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DeliverPanel } from "@/components/deliver-panel";
import { SiteCapture } from "@/components/site-capture";
import { useAudit, useProfiles } from "@/lib/audit-store";
import { queuePhoto } from "@/lib/offline-queue";
import { uploadEvidencePhoto } from "@/lib/audit.functions";
import { draftExecutiveSummary } from "@/lib/ai.functions";
import { gateBeforeLoad } from "@/lib/gate";
import {
  ENGAGEMENT_STAGES,
  ENGAGEMENT_STAGE_LABEL,
  RATINGS,
  SCALES,
  SEVERITIES,
  STATUSES,
  STATUS_LABEL,
  currency,
  maturityAverage,
  totalHours,
  totalValue,
  uid,
  type Audit,
  type Rating,
  type Scale,
  type Severity,
} from "@/lib/audit-types";

export const Route = createFileRoute("/audits/$id/")({
  beforeLoad: gateBeforeLoad,
  head: () => ({
    meta: [
      { title: "Audit editor — UiLab Base Walkthrough" },
      {
        name: "description",
        content:
          "Capture site findings, maturity scores, automation opportunities and photo evidence for a UiLab base walkthrough.",
      },
      { property: "og:title", content: "Audit editor — UiLab Base Walkthrough" },
      {
        property: "og:description",
        content: "Field-audit intake and editor for UiLab site walkthroughs.",
      },
    ],
  }),
  component: AuditEditor,
});

type SaveState = "saved" | "saving" | "unsaved" | "queued";

function AuditEditor() {
  const { id } = Route.useParams();
  const { audit, ready, saveAudit, removeAudit } = useAudit(id);
  const { profiles } = useProfiles();
  const [draft, setDraft] = useState<Audit | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready || !audit) return;
    setDraft((prev) => (prev && prev.id === audit.id ? prev : audit));
  }, [ready, audit]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (!draft) {
    return (
      <AppShell eyebrow="Audit" title={ready ? "Audit not found" : "Loading audit…"}>
        <Button asChild variant="outline" className="label-mono">
          <Link to="/">
            <ArrowLeft className="size-3.5" /> Back to dashboard
          </Link>
        </Button>
      </AppShell>
    );
  }

  const patch = (partial: Partial<Audit>) => {
    const next = { ...draft, ...partial };
    setDraft(next);
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveState("saving");
      void saveAudit(next).then(({ synced, offline }) => {
        if (synced) {
          setSaveState("saved");
        } else if (offline) {
          setSaveState("queued");
        } else {
          setSaveState("queued");
          toast.error("Could not reach the server — your edit is saved on this device and will retry.");
        }
      });
    }, 800);
  };

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "unsaved"
        ? "Unsaved changes"
        : saveState === "queued"
          ? "Saved on this device — will sync"
          : "Saved";

  return (
    <AppShell
      eyebrow={`${draft.reference} · ${saveLabel}`}
      title={draft.client || "New walkthrough"}
      actions={
        <>
          <StatusChip status={draft.status} />
          <Button asChild variant="outline" className="label-mono">
            <Link to="/">
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
          </Button>
          <Button asChild className="label-mono">
            <Link to="/audits/$id/report" params={{ id: draft.id }}>
              <FileText className="size-3.5" /> Client dossier
            </Link>
          </Button>
        </>
      }
    >
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Maturity index" value={`${maturityAverage(draft)} / 5`} />
        <StatBlock label="Findings" value={String(draft.findings.length)} />
        <StatBlock
          label="Hours / year"
          value={totalHours(draft).toLocaleString("en-AU")}
          sub="Released effort"
        />
        <StatBlock label="Annual value" value={currency(totalValue(draft))} accent />
      </div>

      <Tabs defaultValue="intake">
        <TabsList className="label-mono h-auto flex-wrap bg-card">
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="introduction">Introduction</TabsTrigger>
          <TabsTrigger value="maturity">Maturity</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="timeline-cost">Timeline & Cost</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="proposal">Proposal</TabsTrigger>
          <TabsTrigger value="deliver">Deliver</TabsTrigger>
        </TabsList>

        {/* ---------------- Intake ---------------- */}
        <TabsContent value="intake" className="mt-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Client">
              <Input value={draft.client} onChange={(e) => patch({ client: e.target.value })} />
            </Field>
            <Field label="Site">
              <Input value={draft.site} onChange={(e) => patch({ site: e.target.value })} />
            </Field>
            <SiteCapture draft={draft} patch={patch} />
            <Field label="Industry">
              <Input value={draft.industry} onChange={(e) => patch({ industry: e.target.value })} />
            </Field>
            <Field label="Auditor">
              <Input value={draft.auditor} onChange={(e) => patch({ auditor: e.target.value })} />
            </Field>
            <Field label="Owner (team profile)">
              <div className="flex flex-wrap gap-2">
                {profiles.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant={draft.profileId === p.id ? "default" : "outline"}
                    className="label-mono"
                    onClick={() =>
                      patch({
                        profileId: draft.profileId === p.id ? null : p.id,
                        auditor:
                          draft.profileId === p.id ? draft.auditor : `${p.name} · UiLab`,
                      })
                    }
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
            </Field>
            <Field label="Walkthrough date">
              <Input
                type="date"
                value={draft.walkthroughDate}
                onChange={(e) => patch({ walkthroughDate: e.target.value })}
              />
            </Field>
            <Field label="Site headcount">
              <Input
                type="number"
                value={draft.headcount}
                onChange={(e) => patch({ headcount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Reference">
              <Input
                value={draft.reference}
                onChange={(e) => patch({ reference: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={draft.status === s ? "default" : "outline"}
                    className="label-mono"
                    onClick={() => patch({ status: s })}
                  >
                    {STATUS_LABEL[s]}
                  </Button>
                ))}
              </div>
            </Field>
            <Field label="Scope of walkthrough" className="lg:col-span-2">
              <Textarea
                rows={4}
                value={draft.scope}
                onChange={(e) => patch({ scope: e.target.value })}
              />
            </Field>
            <Field label="Executive summary" className="lg:col-span-2">
              <Textarea
                rows={7}
                value={draft.executiveSummary}
                onChange={(e) => patch({ executiveSummary: e.target.value })}
              />
              <DraftSummaryButton draft={draft} patch={patch} />
            </Field>
          </div>

          <div className="mt-12 border-t pt-6">
            <Button
              variant="outline"
              className="label-mono text-destructive"
              onClick={async () => {
                await removeAudit(draft.id);
                toast.success("Audit deleted");
                navigate({ to: "/" });
              }}
            >
              <Trash2 className="size-3.5" /> Delete this audit
            </Button>
          </div>
        </TabsContent>

        {/* ---------------- Introduction ---------------- */}
        <TabsContent value="introduction" className="mt-8">
          <div className="grid gap-6">
            <Field label="Introduction">
              <Textarea
                rows={6}
                placeholder="On [date], UiLab visited [client], organised and led by [contact] with [roles] joining on occasion. [Client] focuses on [what they make/do]..."
                value={draft.introduction}
                onChange={(e) => patch({ introduction: e.target.value })}
              />
            </Field>
            <Field label="Growth goals">
              <Textarea
                rows={6}
                placeholder={
                  "One goal per line, e.g.\nSecuring consistent quality across all lines\nIncreasing throughput and machine occupancy\nReduction in unplanned downtime"
                }
                value={draft.growthGoals}
                onChange={(e) => patch({ growthGoals: e.target.value })}
              />
            </Field>
          </div>
        </TabsContent>

        {/* ---------------- Maturity ---------------- */}
        <TabsContent value="maturity" className="mt-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-8">
              {draft.maturity.map((m, i) => (
                <div key={m.id} className="border bg-card p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <Input
                      value={m.label}
                      className="max-w-xs border-0 px-0 text-base font-medium shadow-none focus-visible:ring-0"
                      onChange={(e) => {
                        const maturity = [...draft.maturity];
                        maturity[i] = { ...m, label: e.target.value };
                        patch({ maturity });
                      }}
                    />
                    <span className="label-mono text-summer">{m.score.toFixed(1)} / 5</span>
                  </div>
                  <Slider
                    className="mt-5"
                    value={[m.score]}
                    min={0}
                    max={5}
                    step={0.5}
                    onValueChange={([v]) => {
                      const maturity = [...draft.maturity];
                      maturity[i] = { ...m, score: v ?? 0 };
                      patch({ maturity });
                    }}
                  />
                  <Textarea
                    rows={2}
                    className="mt-4"
                    placeholder="Observation supporting this score"
                    value={m.note}
                    onChange={(e) => {
                      const maturity = [...draft.maturity];
                      maturity[i] = { ...m, note: e.target.value };
                      patch({ maturity });
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="border bg-card p-6 lg:sticky lg:top-8 lg:self-start">
              <MonoLabel className="opacity-100">Maturity profile</MonoLabel>
              <p className="mt-4 mb-6 text-5xl leading-none font-bold text-summer">
                {maturityAverage(draft)}
                <span className="text-lg opacity-50"> / 5</span>
              </p>
              <MaturityBars audit={draft} />
            </div>
          </div>
        </TabsContent>

        {/* ---------------- Findings ---------------- */}
        <TabsContent value="findings" className="mt-8">
          <div className="space-y-4">
            {draft.findings.map((f, i) => (
              <div key={f.id} className="border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Input
                    placeholder="Area (e.g. Parts store)"
                    value={f.area}
                    className="max-w-xs"
                    onChange={(e) => {
                      const findings = [...draft.findings];
                      findings[i] = { ...f, area: e.target.value };
                      patch({ findings });
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {SEVERITIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          const findings = [...draft.findings];
                          findings[i] = { ...f, severity: s };
                          patch({ findings });
                        }}
                        className={f.severity === s ? "" : "opacity-40"}
                      >
                        <SeverityChip severity={s as Severity} />
                      </button>
                    ))}
                    <ReorderButtons
                      isFirst={i === 0}
                      isLast={i === draft.findings.length - 1}
                      onMove={(dir) => patch({ findings: moveItem(draft.findings, i, dir) })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete finding"
                      onClick={() =>
                        patch({ findings: draft.findings.filter((x) => x.id !== f.id) })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  rows={2}
                  className="mt-4"
                  placeholder="What was observed"
                  value={f.observation}
                  onChange={(e) => {
                    const findings = [...draft.findings];
                    findings[i] = { ...f, observation: e.target.value };
                    patch({ findings });
                  }}
                />
                <Textarea
                  rows={2}
                  className="mt-3"
                  placeholder="Business impact"
                  value={f.impact}
                  onChange={(e) => {
                    const findings = [...draft.findings];
                    findings[i] = { ...f, impact: e.target.value };
                    patch({ findings });
                  }}
                />
              </div>
            ))}
          </div>
          <Button
            className="label-mono mt-6"
            onClick={() =>
              patch({
                findings: [
                  ...draft.findings,
                  { id: uid("f"), area: "", observation: "", severity: "moderate", impact: "" },
                ],
              })
            }
          >
            <Plus className="size-3.5" /> Add finding
          </Button>
        </TabsContent>

        {/* ---------------- Opportunities ---------------- */}
        <TabsContent value="opportunities" className="mt-8">
          <div className="border bg-card p-6">
            <MonoLabel className="opacity-100">Automation opportunities matrix</MonoLabel>
            <div className="mt-6">
              <OpportunityMatrix audit={draft} />
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {draft.opportunities.map((o, i) => {
              const set = (partial: Partial<typeof o>) => {
                const opportunities = [...draft.opportunities];
                opportunities[i] = { ...o, ...partial };
                patch({ opportunities });
              };
              return (
                <div key={o.id} className="border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Opportunity"
                      value={o.title}
                      onChange={(e) => set({ title: e.target.value })}
                    />
                    <ReorderButtons
                      isFirst={i === 0}
                      isLast={i === draft.opportunities.length - 1}
                      onMove={(dir) =>
                        patch({ opportunities: moveItem(draft.opportunities, i, dir) })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete opportunity"
                      onClick={() =>
                        patch({ opportunities: draft.opportunities.filter((x) => x.id !== o.id) })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Field label="Section">
                      <Input
                        placeholder="e.g. Material Mixing, Production Line, General"
                        value={o.section}
                        onChange={(e) => set({ section: e.target.value })}
                      />
                    </Field>
                    <Field label="Process">
                      <Input value={o.process} onChange={(e) => set({ process: e.target.value })} />
                    </Field>
                    <Field label="Category">
                      <Input
                        value={o.category}
                        onChange={(e) => set({ category: e.target.value })}
                      />
                    </Field>
                    <Field label="Horizon">
                      <Input value={o.horizon} onChange={(e) => set({ horizon: e.target.value })} />
                    </Field>
                    <Field label="Impact">
                      <PickScale value={o.impact} onChange={(v) => set({ impact: v })} />
                    </Field>
                    <Field label="Effort">
                      <PickScale value={o.effort} onChange={(v) => set({ effort: v })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Hours / yr">
                        <Input
                          type="number"
                          value={o.hoursSavedPerYear}
                          onChange={(e) => set({ hoursSavedPerYear: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Value / yr (AUD)">
                        <Input
                          type="number"
                          value={o.annualValue}
                          onChange={(e) => set({ annualValue: Number(e.target.value) })}
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-3">
                    <Field label="Complexity">
                      <PickRating value={o.complexity} onChange={(v) => set({ complexity: v })} />
                    </Field>
                    <Field label="Timeline">
                      <PickRating
                        value={o.timelineRating}
                        onChange={(v) => set({ timelineRating: v })}
                      />
                    </Field>
                    <Field label="Pricing">
                      <PickRating value={o.pricingRating} onChange={(v) => set({ pricingRating: v })} />
                    </Field>
                  </div>
                  <Field label="Narrative" className="mt-4">
                    <Textarea
                      rows={3}
                      placeholder="Detailed write-up of the current process and the recommended automation — shown in the report's detailed opportunities section."
                      value={o.narrative}
                      onChange={(e) => set({ narrative: e.target.value })}
                    />
                  </Field>
                </div>
              );
            })}
          </div>
          <Button
            className="label-mono mt-6"
            onClick={() =>
              patch({
                opportunities: [
                  ...draft.opportunities,
                  {
                    id: uid("o"),
                    title: "",
                    process: "",
                    category: "",
                    effort: "medium",
                    impact: "medium",
                    hoursSavedPerYear: 0,
                    annualValue: 0,
                    horizon: "0–3 months",
                    complexity: 1,
                    timelineRating: 1,
                    pricingRating: 1,
                    section: "General",
                    narrative: "",
                  },
                ],
              })
            }
          >
            <Plus className="size-3.5" /> Add opportunity
          </Button>
        </TabsContent>

        {/* ---------------- Timeline & Cost ---------------- */}
        <TabsContent value="timeline-cost" className="mt-8">
          <p className="mb-6 max-w-2xl text-sm opacity-70">
            A phased $ estimate of the whole engagement, by section — shown in the report as the
            Timeline & cost estimate table.
          </p>
          <div className="space-y-4">
            {draft.costPhases.map((c, i) => {
              const set = (partial: Partial<typeof c>) => {
                const costPhases = [...draft.costPhases];
                costPhases[i] = { ...c, ...partial };
                patch({ costPhases });
              };
              return (
                <div key={c.id} className="border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Section, e.g. Production Line"
                      value={c.section}
                      onChange={(e) => set({ section: e.target.value })}
                    />
                    <ReorderButtons
                      isFirst={i === 0}
                      isLast={i === draft.costPhases.length - 1}
                      onMove={(dir) => patch({ costPhases: moveItem(draft.costPhases, i, dir) })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete cost phase"
                      onClick={() =>
                        patch({ costPhases: draft.costPhases.filter((x) => x.id !== c.id) })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Field label="Estimated time">
                      <Input
                        placeholder="Month 1 – Month 8"
                        value={c.estimatedTime}
                        onChange={(e) => set({ estimatedTime: e.target.value })}
                      />
                    </Field>
                    <Field label="Estimated cost">
                      <Input
                        placeholder="$200,000 – $300,000"
                        value={c.estimatedCost}
                        onChange={(e) => set({ estimatedCost: e.target.value })}
                      />
                    </Field>
                    <Field label="UiLab support">
                      <Input
                        placeholder="Per project fixed fee or retainer"
                        value={c.supportModel}
                        onChange={(e) => set({ supportModel: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            className="label-mono mt-6"
            onClick={() =>
              patch({
                costPhases: [
                  ...draft.costPhases,
                  {
                    id: uid("c"),
                    section: "",
                    estimatedTime: "",
                    estimatedCost: "",
                    supportModel: "",
                  },
                ],
              })
            }
          >
            <Plus className="size-3.5" /> Add cost phase
          </Button>
        </TabsContent>

        {/* ---------------- Evidence ---------------- */}
        <TabsContent value="evidence" className="mt-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {draft.photos.map((p, i) => {
              const set = (partial: Partial<typeof p>) => {
                const photos = [...draft.photos];
                photos[i] = { ...p, ...partial };
                patch({ photos });
              };
              return (
                <figure key={p.id} className="border bg-card">
                  <img
                    src={p.url}
                    alt={p.caption || "Site evidence photo"}
                    loading="lazy"
                    width={1280}
                    height={854}
                    className="aspect-[3/2] w-full object-cover"
                  />
                  <figcaption className="space-y-3 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Area"
                        value={p.area}
                        onChange={(e) => set({ area: e.target.value })}
                      />
                      <Input
                        placeholder="Tag"
                        value={p.tag}
                        onChange={(e) => set({ tag: e.target.value })}
                      />
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="Caption"
                      value={p.caption}
                      onChange={(e) => set({ caption: e.target.value })}
                    />
                    <Input
                      placeholder="Image URL"
                      value={p.url}
                      onChange={(e) => set({ url: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      className="label-mono w-full text-destructive"
                      onClick={() => patch({ photos: draft.photos.filter((x) => x.id !== p.id) })}
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <EvidenceUploadButton
              auditId={draft.id}
              onUploaded={(photo) => patch({ photos: [...draft.photos, photo] })}
            />
            <Button
              variant="outline"
              className="label-mono"
              onClick={() =>
                patch({
                  photos: [
                    ...draft.photos,
                    { id: uid("p"), url: "", caption: "", area: "", tag: "" },
                  ],
                })
              }
            >
              <Plus className="size-3.5" /> Add photo by link
            </Button>
          </div>
        </TabsContent>

        {/* ---------------- Roadmap ---------------- */}
        <TabsContent value="roadmap" className="mt-8">
          <div className="border bg-card p-6">
            <MonoLabel className="opacity-100">Engagement stage</MonoLabel>
            <p className="mt-1 mb-4 text-sm opacity-70">
              Which stage of the UiLab engagement model is the client at right now?
            </p>
            <div className="flex flex-wrap gap-2">
              {ENGAGEMENT_STAGES.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={draft.engagementStage === s ? "default" : "outline"}
                  className="label-mono"
                  onClick={() => patch({ engagementStage: s })}
                >
                  Stage {s} — {ENGAGEMENT_STAGE_LABEL[s]}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {draft.recommendations.map((r, i) => {
              const set = (partial: Partial<typeof r>) => {
                const recommendations = [...draft.recommendations];
                recommendations[i] = { ...r, ...partial };
                patch({ recommendations });
              };
              return (
                <div key={r.id} className="border bg-card p-5">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr_auto]">
                    <Input
                      placeholder="Phase"
                      value={r.phase}
                      onChange={(e) => set({ phase: e.target.value })}
                    />
                    <Input
                      placeholder="Title"
                      value={r.title}
                      onChange={(e) => set({ title: e.target.value })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        patch({
                          recommendations: draft.recommendations.filter((x) => x.id !== r.id),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Textarea
                    rows={3}
                    className="mt-4"
                    placeholder="What we recommend and why"
                    value={r.detail}
                    onChange={(e) => set({ detail: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
          <Button
            className="label-mono mt-6"
            onClick={() =>
              patch({
                recommendations: [
                  ...draft.recommendations,
                  { id: uid("r"), phase: "", title: "", detail: "" },
                ],
              })
            }
          >
            <Plus className="size-3.5" /> Add recommendation
          </Button>
        </TabsContent>

        {/* ---------------- Proposal ---------------- */}
        <TabsContent value="proposal" className="mt-8">
          <p className="mb-6 max-w-2xl text-sm opacity-70">
            This becomes the priced proposal at the end of the client dossier, printed with blank
            signature lines for both parties to sign by hand — nothing here is e-signed.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Investment">
              <Input
                placeholder="$27,300 + GST"
                value={draft.proposalInvestment}
                onChange={(e) => patch({ proposalInvestment: e.target.value })}
              />
            </Field>
            <Field label="Timeline">
              <Input
                placeholder="6 weeks"
                value={draft.proposalTimeline}
                onChange={(e) => patch({ proposalTimeline: e.target.value })}
              />
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={draft.proposalStartDate}
                onChange={(e) => patch({ proposalStartDate: e.target.value })}
              />
            </Field>
            <Field label="Scope of work" className="lg:col-span-2">
              <Textarea
                rows={6}
                placeholder={"One line per item, e.g.\nFeasibility studies\nIntegrator engagement\nProcess sequencing"}
                value={draft.proposalScope}
                onChange={(e) => patch({ proposalScope: e.target.value })}
              />
            </Field>
          </div>
        </TabsContent>

        {/* ---------------- Deliver ---------------- */}
        <TabsContent value="deliver" className="mt-8">
          <DeliverPanel audit={draft} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={className}>
      <Label className="label-mono mb-2 opacity-70">{label}</Label>
      {children}
    </div>
  );
}

function PickScale({ value, onChange }: { value: Scale; onChange: (v: Scale) => void }) {
  return (
    <div className="flex gap-2">
      {SCALES.map((s) => (
        <Button
          key={s}
          type="button"
          variant={value === s ? "default" : "outline"}
          className="label-mono flex-1"
          onClick={() => onChange(s)}
        >
          {s}
        </Button>
      ))}
    </div>
  );
}

function PickRating({ value, onChange }: { value: Rating; onChange: (v: Rating) => void }) {
  return (
    <div className="flex gap-2">
      {RATINGS.map((r) => (
        <Button
          key={r}
          type="button"
          variant={value === r ? "default" : "outline"}
          className="label-mono flex-1"
          onClick={() => onChange(r)}
        >
          {r}/3
        </Button>
      ))}
    </div>
  );
}

function moveItem<T>(arr: T[], index: number, dir: -1 | 1): T[] {
  const next = [...arr];
  const target = index + dir;
  if (target < 0 || target >= next.length) return next;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}

function ReorderButtons({
  onMove,
  isFirst,
  isLast,
}: {
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Move up"
        disabled={isFirst}
        onClick={() => onMove(-1)}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Move down"
        disabled={isLast}
        onClick={() => onMove(1)}
      >
        <ChevronDown className="size-4" />
      </Button>
    </div>
  );
}

function EvidenceUploadButton({
  auditId,
  onUploaded,
}: {
  auditId: string;
  onUploaded: (photo: { id: string; url: string; path: string; caption: string; area: string; tag: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useServerFn(uploadEvidencePhoto);

  async function handleFile(file: File) {
    setBusy(true);
    const photoId = uid("p");
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
      const form = new FormData();
      form.set("file", file);
      const { path, url } = await upload({ data: form });
      onUploaded({ id: photoId, url, path, caption: "", area: "", tag: "" });
      toast.success("Photo uploaded");
    } catch (e) {
      // No signal: keep the photo on the device and upload it when we're back in range.
      try {
        await queuePhoto(auditId, photoId, file);
        onUploaded({
          id: photoId,
          url: URL.createObjectURL(file),
          path: "",
          caption: "",
          area: "",
          tag: "",
        });
        toast.success("Photo saved on this phone — it uploads when you get signal");
      } catch {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Upload evidence photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button className="label-mono" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
        {busy ? "Uploading…" : "Upload photo"}
      </Button>
    </>
  );
}

function DraftSummaryButton({
  draft,
  patch,
}: {
  draft: Audit;
  patch: (p: Partial<Audit>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const draftSummary = useServerFn(draftExecutiveSummary);

  async function run() {
    setBusy(true);
    try {
      const { summary } = await draftSummary({
        data: {
          client: draft.client,
          site: draft.site,
          industry: draft.industry,
          scope: draft.scope,
          maturity: draft.maturity.map((m) => ({ label: m.label, score: m.score })),
          findings: draft.findings.map((f) => ({ area: f.area, observation: f.observation })),
          opportunities: draft.opportunities.map((o) => ({
            title: o.title,
            hoursSavedPerYear: o.hoursSavedPerYear,
            annualValue: o.annualValue,
          })),
        },
      });
      patch({ executiveSummary: summary });
      toast.success("Summary drafted — review and edit before sharing.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not draft the summary");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={run}
      disabled={busy || !draft.client}
      className="label-mono mt-3"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      {busy ? "Drafting…" : "Draft with AI"}
    </Button>
  );
}
