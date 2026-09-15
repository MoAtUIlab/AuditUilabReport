import {
  MaturityBars,
  MonoLabel,
  OpportunityMatrix,
  RatingChip,
  ScaleChip,
  SeverityChip,
  UiLabWordmark,
} from "@/components/brand";
import {
  ENGAGEMENT_STAGES,
  ENGAGEMENT_STAGE_LABEL,
  currency,
  formatDate,
  maturityAverage,
  totalHours,
  totalValue,
  type Audit,
} from "@/lib/audit-types";

const GENERAL_OBSERVATIONS = [
  {
    title: "Fault vs. cost analysis",
    body: "Reviewing the production process with “stage in which a fault is noticed vs. cost of fixing it” in mind often uncovers additional automation potential.",
  },
  {
    title: "Handling frequency",
    body: "Asking how many times each part is picked up by the same person is a reliable way to surface automation potential.",
  },
  {
    title: "Spreadsheets and handwritten labels",
    body: "Experience shows that every spreadsheet is an automation that hasn't happened yet, or a bypass where automation (like an ERP) has failed.",
  },
  {
    title: "Downtime attribution",
    body: "A simple log of what caused downtime, how often, and for how long makes it possible to prioritise fixes with confidence rather than guesswork.",
  },
];

const RATING_LEGEND: {
  rating: 1 | 2 | 3;
  complexity: string;
  timeline: string;
  pricing: string;
}[] = [
  { rating: 1, complexity: "Off-the-shelf solution", timeline: "Under 4 months", pricing: "Under $50,000" },
  {
    rating: 2,
    complexity: "Requires research; integrator consultation",
    timeline: "4 to 12 months",
    pricing: "Under $300,000",
  },
  {
    rating: 3,
    complexity: "New frontiers; tailored solution; 3+ months development",
    timeline: "12+ months",
    pricing: "Over $300,000 (individual assessment)",
  },
];

function engagementStatus(stage: string, current: string): "Complete" | "Next" | "Future" {
  const order = ENGAGEMENT_STAGES;
  const stageIdx = order.indexOf(stage as (typeof order)[number]);
  const currentIdx = order.indexOf(current as (typeof order)[number]);
  if (stageIdx < currentIdx) return "Complete";
  if (stageIdx === currentIdx) return "Next";
  return "Future";
}

/** The client-facing dossier body. Shared by the internal preview and the client link. */
export function ReportDocument({ audit }: { audit: Audit }) {
  const quickWins = audit.opportunities.filter((o) => o.impact === "high" && o.effort !== "high");
  const ranked = [...audit.opportunities].sort((a, b) => b.annualValue - a.annualValue);
  const hasProposal = Boolean(
    audit.proposalInvestment || audit.proposalTimeline || audit.proposalScope,
  );

  let sectionNumber = 0;
  const nextSection = () => String(++sectionNumber).padStart(2, "0");

  return (
    <>
      <article className="report-page pb-24">
        <header className="avoid-break bg-sunset px-8 py-14 text-bone">
          <div className="flex items-center justify-between">
            <UiLabWordmark />
            <MonoLabel className="opacity-80">{audit.reference}</MonoLabel>
          </div>
          <p className="label-mono mt-16 text-sun">Base Walkthrough · Executive dossier</p>
          <h1 className="mt-4 text-5xl leading-[1.02] font-bold tracking-[-0.035em]">
            {audit.client}
          </h1>
          <p className="mt-4 max-w-xl text-lg opacity-85">
            Automation and applied AI opportunities identified during an on-site walkthrough of{" "}
            <span className="brand-underline">{audit.site}</span>.
          </p>
          <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-bone/25 pt-6 sm:grid-cols-4">
            <Meta label="Walkthrough" value={formatDate(audit.walkthroughDate)} />
            <Meta label="Industry" value={audit.industry} />
            <Meta label="Site headcount" value={String(audit.headcount)} />
            <Meta label="Prepared by" value={audit.auditor} />
          </dl>
        </header>

        {audit.introduction || audit.growthGoals ? (
          <Section number={nextSection()} title="Introduction">
            {audit.introduction ? (
              <p className="max-w-3xl leading-relaxed">{audit.introduction}</p>
            ) : null}
            {audit.growthGoals ? (
              <div className="mt-8">
                <MonoLabel className="opacity-100">Specifically:</MonoLabel>
                <ol className="mt-4 space-y-2">
                  {audit.growthGoals
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed opacity-80">
                        <span className="label-mono text-summer opacity-100">{i + 1}</span>
                        {line}
                      </li>
                    ))}
                </ol>
              </div>
            ) : null}
          </Section>
        ) : null}

        <Section number={nextSection()} title="About UiLab">
          <p className="max-w-3xl leading-relaxed">
            UiLab is a Logan City Council-owned, privately operated enterprise focused on driving
            growth and prosperity for Logan's industries and residents through the adoption of
            emerging technologies. We specialise in AI and robotics, particularly automation
            within manufacturing and warehousing, to help businesses grow.
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <MonoLabel className="text-summer opacity-100">What makes us different</MonoLabel>
              <p className="mt-3 max-w-md leading-relaxed opacity-80">
                Our goal is to create a thriving City of Logan that embraces and is embraced by
                the advanced and emerging technologies shaping the world around us. If you thrive,
                Logan thrives — your success and growth is our focus.
              </p>
            </div>
            <div>
              <MonoLabel className="text-summer opacity-100">
                Our goal for {audit.client || "you"}
              </MonoLabel>
              <p className="mt-3 max-w-md leading-relaxed opacity-80">
                We want to help {audit.client || "your team"} unlock production capacity,
                streamline core processes, and enable short, medium, and long-term business growth
                whilst lifting profitability.
              </p>
            </div>
          </div>
          <div className="mt-10 border-t border-ink/15 pt-6">
            <MonoLabel className="opacity-100">We support your every step</MonoLabel>
            <ol className="mt-4 grid gap-4 sm:grid-cols-5">
              {[
                "Scope definition & process analysis",
                "Feasibility, vendor selection & project plan",
                "Procurement, design validation & factory acceptance",
                "Delivery, commissioning & handover",
                "Ongoing support & growth",
              ].map((step, i) => (
                <li key={step} className="avoid-break">
                  <span className="label-mono text-summer opacity-100">{i + 1}</span>
                  <p className="mt-1.5 text-sm leading-snug opacity-80">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section number={nextSection()} title="Executive summary">
          <p className="max-w-3xl text-lg leading-relaxed">{audit.executiveSummary}</p>
          <div className="mt-10 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3">
            <Headline label="Annual value identified" value={currency(totalValue(audit))} accent />
            <Headline
              label="Hours released / year"
              value={totalHours(audit).toLocaleString("en-AU")}
            />
            <Headline label="Automation maturity" value={`${maturityAverage(audit)} / 5`} />
          </div>
          {audit.scope ? (
            <div className="mt-10 border-l-2 border-summer pl-5">
              <MonoLabel className="opacity-100">Scope</MonoLabel>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed opacity-80">{audit.scope}</p>
            </div>
          ) : null}
        </Section>

        <Section number={nextSection()} title="Automation maturity profile" break>
          <div className="max-w-2xl">
            <MaturityBars audit={audit} tone="light" />
          </div>
        </Section>

        <Section number={nextSection()} title="Field findings">
          <ul className="divide-y divide-ink/10 border-t border-ink/10">
            {audit.findings.map((f) => (
              <li key={f.id} className="avoid-break py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <SeverityChip severity={f.severity} />
                  <MonoLabel className="opacity-100">{f.area}</MonoLabel>
                </div>
                <p className="mt-3 max-w-3xl leading-relaxed">{f.observation}</p>
                <p className="mt-2 max-w-3xl text-sm opacity-70">
                  <span className="label-mono mr-2 text-summer">Impact</span>
                  {f.impact}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section number={nextSection()} title="General observations" break>
          <p className="max-w-3xl leading-relaxed opacity-80">
            A few methodology notes that shaped how we looked for automation potential during the
            walkthrough:
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {GENERAL_OBSERVATIONS.map((o) => (
              <div key={o.title} className="avoid-break border-l-2 border-summer pl-5">
                <MonoLabel className="opacity-100">{o.title}</MonoLabel>
                <p className="mt-2 text-sm leading-relaxed opacity-80">{o.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {audit.photos.length > 0 ? (
          <Section number={nextSection()} title="Photo evidence" break>
            <div className="grid gap-6 sm:grid-cols-2">
              {audit.photos.map((p) => (
                <figure key={p.id} className="avoid-break">
                  <img
                    src={p.url}
                    alt={p.caption || `${p.area} evidence photo`}
                    loading="lazy"
                    width={1280}
                    height={854}
                    className="aspect-[3/2] w-full border border-ink/10 object-cover"
                  />
                  <figcaption className="mt-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <MonoLabel className="opacity-100">{p.area}</MonoLabel>
                      <span className="label-mono border border-summer px-2 py-1 text-summer">
                        {p.tag}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed opacity-80">{p.caption}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Section>
        ) : null}

        <Section number={nextSection()} title="Rating system" break>
          <p className="max-w-3xl leading-relaxed opacity-80">
            The following rating system is used throughout this report to give a quick-reference
            assessment of each automation opportunity.
          </p>
          <table className="mt-8 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-y border-ink/20">
                <th className="label-mono py-3 pr-3">Rating</th>
                <th className="label-mono py-3 pr-3">Complexity</th>
                <th className="label-mono py-3 pr-3">Timeline</th>
                <th className="label-mono py-3">Pricing</th>
              </tr>
            </thead>
            <tbody>
              {RATING_LEGEND.map((row) => (
                <tr key={row.rating} className="border-b border-ink/10 align-top">
                  <td className="py-3 pr-3 font-medium tabular-nums">{row.rating}/3</td>
                  <td className="py-3 pr-3 opacity-80">{row.complexity}</td>
                  <td className="py-3 pr-3 opacity-80">{row.timeline}</td>
                  <td className="py-3 opacity-80">{row.pricing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section number={nextSection()} title="Automation opportunities" break>
          <OpportunityMatrix audit={audit} tone="light" />

          {quickWins.length > 0 ? (
            <div className="mt-10 bg-sunset p-6 text-bone">
              <MonoLabel className="text-sun opacity-100">Start here</MonoLabel>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {quickWins.map((o) => (
                  <li key={o.id} className="text-sm leading-snug">
                    <span className="text-summer">▸</span> {o.title}
                    <span className="opacity-60"> · {o.horizon}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <table className="mt-10 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-y border-ink/20">
                <th className="label-mono py-3 pr-3">Opportunity</th>
                <th className="label-mono py-3 pr-3">Process</th>
                <th className="label-mono py-3 pr-3">Effort / impact</th>
                <th className="label-mono py-3 pr-3">Complexity / timeline / pricing</th>
                <th className="label-mono py-3 pr-3">Hours / yr</th>
                <th className="label-mono py-3 text-right">Value / yr</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((o) => (
                <tr key={o.id} className="avoid-break border-b border-ink/10 align-top">
                  <td className="py-3 pr-3">
                    <p className="font-medium">{o.title}</p>
                    <p className="mt-1 text-xs opacity-60">
                      {o.category} · {o.horizon}
                    </p>
                  </td>
                  <td className="py-3 pr-3 opacity-80">{o.process}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-1">
                      <ScaleChip value={o.effort} label="Effort" />
                      <ScaleChip value={o.impact} label="Impact" />
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-1">
                      <RatingChip value={o.complexity} label="Complexity" />
                      <RatingChip value={o.timelineRating} label="Timeline" />
                      <RatingChip value={o.pricingRating} label="Pricing" />
                    </div>
                  </td>
                  <td className="py-3 pr-3 tabular-nums">
                    {o.hoursSavedPerYear.toLocaleString("en-AU")}
                  </td>
                  <td className="py-3 text-right font-medium tabular-nums">
                    {currency(o.annualValue)}
                  </td>
                </tr>
              ))}
              <tr className="border-b-2 border-ink">
                <td className="label-mono py-3" colSpan={4}>
                  Total
                </td>
                <td className="py-3 pr-3 font-bold tabular-nums">
                  {totalHours(audit).toLocaleString("en-AU")}
                </td>
                <td className="py-3 text-right font-bold tabular-nums">
                  {currency(totalValue(audit))}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        {audit.costPhases.length > 0 ? (
          <Section number={nextSection()} title="Timeline and cost estimate" break>
            <p className="max-w-3xl leading-relaxed opacity-80">
              Whilst each step is itemised, we can work on multiple steps concurrently. These
              figures are indicative and will become firmer as we progress with a full scope.
            </p>
            <table className="mt-8 w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-y border-ink/20">
                  <th className="label-mono py-3 pr-3">Section</th>
                  <th className="label-mono py-3 pr-3">Estimated time</th>
                  <th className="label-mono py-3 pr-3">Estimated cost</th>
                  <th className="label-mono py-3">UiLab support</th>
                </tr>
              </thead>
              <tbody>
                {audit.costPhases.map((c) => (
                  <tr key={c.id} className="avoid-break border-b border-ink/10 align-top">
                    <td className="py-3 pr-3 font-medium">{c.section}</td>
                    <td className="py-3 pr-3 opacity-80">{c.estimatedTime}</td>
                    <td className="py-3 pr-3 opacity-80">{c.estimatedCost}</td>
                    <td className="py-3 opacity-80">{c.supportModel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ) : null}

        {audit.opportunities.some((o) => o.narrative) ? (
          <Section number={nextSection()} title="Automation opportunities in detail" break>
            <p className="max-w-3xl leading-relaxed opacity-80">
              The following section outlines each opportunity in detail, organised by area. Note:
              this is not necessarily the order we would advise for implementation.
            </p>
            {Object.entries(
              audit.opportunities.reduce<Record<string, typeof audit.opportunities>>((acc, o) => {
                const key = o.section || "General";
                (acc[key] ??= []).push(o);
                return acc;
              }, {}),
            ).map(([section, items]) => (
              <div key={section} className="mt-10">
                <h3 className="text-xl font-bold tracking-[-0.02em]">{section}</h3>
                <div className="mt-6 space-y-8">
                  {items.map((o) => (
                    <div key={o.id} className="avoid-break border-l-2 border-summer pl-5">
                      <MonoLabel className="opacity-100">{o.title}</MonoLabel>
                      {o.narrative ? (
                        <p className="mt-2 max-w-3xl leading-relaxed opacity-80">{o.narrative}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-4">
                        <RatingChip value={o.complexity} label="Complexity" />
                        <RatingChip value={o.timelineRating} label="Timeline" />
                        <RatingChip value={o.pricingRating} label="Pricing" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        ) : null}

        <Section number={nextSection()} title="The automation journey" break>
          <p className="max-w-3xl leading-relaxed opacity-80">The full journey at a glance:</p>
          <table className="mt-8 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-y border-ink/20">
                <th className="label-mono py-3 pr-3">Stage</th>
                <th className="label-mono py-3 pr-3">Focus</th>
                <th className="label-mono py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {ENGAGEMENT_STAGES.map((stage) => {
                const status = engagementStatus(stage, audit.engagementStage);
                return (
                  <tr key={stage} className="border-b border-ink/10 align-top">
                    <td className="py-3 pr-3 font-medium">Stage {stage}</td>
                    <td className="py-3 pr-3 opacity-80">{ENGAGEMENT_STAGE_LABEL[stage]}</td>
                    <td className="py-3">
                      <span
                        className={
                          status === "Complete"
                            ? "label-mono text-summer opacity-100"
                            : status === "Next"
                              ? "label-mono text-sun opacity-100"
                              : "label-mono opacity-50"
                        }
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {audit.recommendations.length > 0 ? (
            <ol className="mt-10 space-y-8">
              {audit.recommendations.map((r) => (
                <li key={r.id} className="avoid-break border-l-2 border-summer pl-5">
                  <MonoLabel className="text-summer opacity-100">{r.phase}</MonoLabel>
                  <h3 className="mt-2 text-2xl font-bold tracking-[-0.02em]">{r.title}</h3>
                  <p className="mt-2 max-w-3xl leading-relaxed opacity-80">{r.detail}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </Section>

        {hasProposal ? (
          <Section number={nextSection()} title="Proposal" break>
            <p className="max-w-3xl leading-relaxed opacity-80">
              Prepared for: {audit.client} · Prepared by: UiLab (Underwood Innovation Lab Pty Ltd)
            </p>
            <div className="mt-8 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3">
              <Headline label="Investment" value={audit.proposalInvestment || "—"} accent />
              <Headline label="Timeline" value={audit.proposalTimeline || "—"} />
              <Headline label="Start date" value={formatDate(audit.proposalStartDate)} />
            </div>
            {audit.proposalScope ? (
              <div className="mt-10">
                <MonoLabel className="opacity-100">Scope of work</MonoLabel>
                <ul className="mt-4 space-y-2">
                  {audit.proposalScope
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-relaxed opacity-80">
                        <span className="text-summer">▸</span> {line}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-14 border-t border-ink/20 pt-8">
              <p className="max-w-2xl text-sm leading-relaxed opacity-70">
                By signing below, both parties agree to the scope of work, investment, and
                timeline outlined in this proposal.
              </p>
              <div className="mt-10 grid gap-10 sm:grid-cols-2">
                <SignatureBlock heading={`For ${audit.client || "the client"}`} />
                <SignatureBlock heading="For Underwood Innovation Lab Pty Ltd" />
              </div>
            </div>
          </Section>
        ) : null}

        <footer className="avoid-break mt-16 flex flex-wrap items-end justify-between gap-4 border-t border-ink/20 pt-6">
          <div>
            <UiLabWordmark tone="dark" />
            <p className="mt-2 max-w-md text-xs opacity-60">
              Prepared for {audit.client}. Figures are estimates based on observed process times
              during the walkthrough and are intended to prioritise work, not to serve as a
              contract.
            </p>
          </div>
          <MonoLabel>UILAB.COM.AU · {audit.reference}</MonoLabel>
        </footer>
      </article>

      <div className="print-running-footer" aria-hidden>
        <div className="report-page flex justify-between px-8 pb-2">
          <span>UiLab · Base Walkthrough</span>
          <span>
            {audit.client} · {audit.reference}
          </span>
        </div>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <MonoLabel className="text-sun opacity-100">{label}</MonoLabel>
      <dd className="mt-1.5 text-sm">{value}</dd>
    </div>
  );
}

function Headline({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={accent ? "bg-summer p-6 text-primary-foreground" : "bg-paper p-6"}>
      <MonoLabel className={accent ? "opacity-80" : undefined}>{label}</MonoLabel>
      <p className="mt-3 text-3xl leading-none font-bold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function SignatureBlock({ heading }: { heading: string }) {
  return (
    <div className="avoid-break">
      <MonoLabel className="opacity-100">{heading}</MonoLabel>
      <div className="mt-8 space-y-6 text-sm">
        <div className="border-b border-ink/30 pb-1">Signature:</div>
        <div className="border-b border-ink/30 pb-1">Name:</div>
        <div className="border-b border-ink/30 pb-1">Date:</div>
      </div>
    </div>
  );
}

function Section({
  number,
  title,
  children,
  break: pageBreak,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  break?: boolean;
}) {
  return (
    <section className={`px-8 pt-14 ${pageBreak ? "print-break" : ""}`}>
      <div className="mb-8 flex items-baseline gap-4 border-b border-ink/20 pb-3">
        <span className="label-mono text-summer opacity-100">{number}</span>
        <h2 className="text-2xl font-bold tracking-[-0.025em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
