import { cn } from "@/lib/utils";
import type { Audit, AuditStatus, Rating, Scale, Severity } from "@/lib/audit-types";
import { STATUS_LABEL } from "@/lib/audit-types";

export function UiLabWordmark({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={cn(
        "font-sans text-[1.375rem] leading-none font-bold tracking-[-0.045em]",
        tone === "light" ? "text-bone" : "text-ink",
        className,
      )}
    >
      UiLab
      <span className="text-summer">.</span>
    </span>
  );
}

export function MonoLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return <p className={cn("label-mono opacity-70", className)}>{children}</p>;
}

export function StatusChip({ status }: { status: AuditStatus }) {
  const styles: Record<AuditStatus, string> = {
    draft: "border-current text-muted-foreground",
    "in-review": "border-sun text-sun",
    "client-ready": "border-summer bg-summer text-primary-foreground",
  };
  return (
    <span className={cn("label-mono inline-flex border px-2 py-1", styles[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SeverityChip({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    low: "border-current opacity-60",
    moderate: "border-sun text-sun",
    high: "border-summer text-summer",
    critical: "border-summer bg-summer text-primary-foreground",
  };
  return (
    <span className={cn("label-mono inline-flex border px-2 py-1", styles[severity])}>
      {severity}
    </span>
  );
}

export function ScaleChip({ value, label }: { value: Scale; label: string }) {
  return (
    <span className="label-mono inline-flex items-center gap-1.5 opacity-80">
      {label}
      <span className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "h-2 w-2 rounded-full border border-current",
              (value === "low" && n <= 1) ||
                (value === "medium" && n <= 2) ||
                (value === "high" && n <= 3)
                ? "bg-current"
                : "",
            )}
          />
        ))}
      </span>
    </span>
  );
}

export function RatingChip({ value, label }: { value: Rating; label: string }) {
  return (
    <span className="label-mono inline-flex items-center gap-1.5 opacity-80">
      {label}
      <span className="flex gap-0.5">
        {([1, 2, 3] as Rating[]).map((n) => (
          <span
            key={n}
            className={cn("h-2 w-2 rounded-full border border-current", n <= value ? "bg-current" : "")}
          />
        ))}
      </span>
      <span className="tabular-nums">{value}/3</span>
    </span>
  );
}

export function StatBlock({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("border p-5", accent ? "bg-summer text-primary-foreground" : "bg-card")}>
      <MonoLabel className={accent ? "opacity-80" : undefined}>{label}</MonoLabel>
      <p className="mt-4 text-4xl leading-none font-bold tracking-[-0.03em]">{value}</p>
      {sub ? <p className="mt-2 text-sm opacity-70">{sub}</p> : null}
    </div>
  );
}

export function MaturityBars({ audit, tone = "dark" }: { audit: Audit; tone?: "dark" | "light" }) {
  return (
    <div className="space-y-4">
      {audit.maturity.map((m) => (
        <div key={m.id} className="avoid-break">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium">{m.label}</p>
            <p className="label-mono">{m.score.toFixed(1)} / 5</p>
          </div>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-2 flex-1",
                  n <= Math.round(m.score)
                    ? n >= 4
                      ? "bg-sun"
                      : "bg-summer"
                    : tone === "dark"
                      ? "bg-muted"
                      : "bg-ink/10",
                )}
              />
            ))}
          </div>
          {m.note ? <p className="mt-2 text-xs opacity-60">{m.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

const SCALES: Scale[] = ["low", "medium", "high"];

export function OpportunityMatrix({
  audit,
  tone = "dark",
}: {
  audit: Audit;
  tone?: "dark" | "light";
}) {
  const impactRows: Scale[] = ["high", "medium", "low"];
  const cellTone = tone === "dark" ? "border-border" : "report-hairline";

  return (
    <div className="avoid-break">
      <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-2">
        <div />
        {SCALES.map((e) => (
          <MonoLabel key={e} className="pb-1 text-center">
            {e} effort
          </MonoLabel>
        ))}
        {impactRows.map((impact) => (
          <div key={impact} className="col-span-4 grid grid-cols-[auto_repeat(3,1fr)] gap-2">
            <div className="flex w-24 items-center">
              <MonoLabel>{impact} impact</MonoLabel>
            </div>
            {SCALES.map((effort) => {
              const items = audit.opportunities.filter(
                (o) => o.impact === impact && o.effort === effort,
              );
              const isQuickWin = impact === "high" && effort === "low";
              return (
                <div
                  key={effort}
                  className={cn(
                    "min-h-24 border p-2",
                    cellTone,
                    isQuickWin && "border-summer bg-summer/10",
                  )}
                >
                  {items.length === 0 ? (
                    <span className="label-mono opacity-25">—</span>
                  ) : (
                    <ul className="space-y-1.5">
                      {items.map((o) => (
                        <li key={o.id} className="text-xs leading-snug">
                          <span className="text-summer">▸</span> {o.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs opacity-60">
        Highlighted cell = quick wins: high impact, low effort. Sequence these first.
      </p>
    </div>
  );
}
