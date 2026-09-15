import {
  MaturityBars,
  MonoLabel,
  OpportunityMatrix,
  ScaleChip,
  SeverityChip,
  UiLabWordmark,
} from "@/components/brand";
import {
  currency,
  formatDate,
  maturityAverage,
  totalHours,
  totalValue,
  type Audit,
} from "@/lib/audit-types";

/** The client-facing dossier body. Shared by the internal preview and the client link. */
export function ReportDocument({ audit }: { audit: Audit }) {
  const quickWins = audit.opportunities.filter((o) => o.impact === "high" && o.effort !== "high");
  const ranked = [...audit.opportunities].sort((a, b) => b.annualValue - a.annualValue);

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

        <Section number="01" title="Executive summary">
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

        <Section number="02" title="Automation maturity profile" break>
          <div className="max-w-2xl">
            <MaturityBars audit={audit} tone="light" />
          </div>
        </Section>

        <Section number="03" title="Field findings">
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

        {audit.photos.length > 0 ? (
          <Section number="04" title="Photo evidence" break>
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

        <Section number="05" title="Automation opportunities" break>
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
                  <td className="py-3 pr-3 tabular-nums">
                    {o.hoursSavedPerYear.toLocaleString("en-AU")}
                  </td>
                  <td className="py-3 text-right font-medium tabular-nums">
                    {currency(o.annualValue)}
                  </td>
                </tr>
              ))}
              <tr className="border-b-2 border-ink">
                <td className="label-mono py-3" colSpan={3}>
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

        {audit.recommendations.length > 0 ? (
          <Section number="06" title="Recommended sequence" break>
            <ol className="space-y-8">
              {audit.recommendations.map((r) => (
                <li key={r.id} className="avoid-break border-l-2 border-summer pl-5">
                  <MonoLabel className="text-summer opacity-100">{r.phase}</MonoLabel>
                  <h3 className="mt-2 text-2xl font-bold tracking-[-0.02em]">{r.title}</h3>
                  <p className="mt-2 max-w-3xl leading-relaxed opacity-80">{r.detail}</p>
                </li>
              ))}
            </ol>
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
