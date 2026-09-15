import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Clock, Link2, MailCheck, Send, TrendingUp, Users } from "lucide-react";
import { MonoLabel, StatBlock } from "@/components/brand";
import { cn } from "@/lib/utils";
import { viewMetrics } from "@/lib/share.functions";

export function MetricsPanel({ profileId }: { profileId?: string | undefined }) {
  const fetchMetrics = useServerFn(viewMetrics);
  const { data: m } = useQuery({
    queryKey: ["view-metrics", profileId || "all"],
    queryFn: () => fetchMetrics(profileId ? { data: { profileId } } : { data: {} }),
    retry: false,
  });

  const weeks = m?.weekly ?? [];
  const maxWeek = Math.max(1, ...weeks.map((w) => Math.max(w.views, w.prints)));
  const funnel = m?.funnel ?? { sent: 0, opened: 0, followedUp: 0, progressed: 0 };
  const funnelMax = Math.max(funnel.sent, 1);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-AU", { month: "short", day: "numeric" });
  }

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between border-b pb-3">
        <MonoLabel className="opacity-100">Engagement metrics</MonoLabel>
        <MonoLabel>{m ? "Last 12 weeks" : ""}</MonoLabel>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock
          label="Open rate"
          value={`${m?.openRate ?? 0}%`}
          sub="Of live client links"
        />
        <StatBlock
          label="Avg. time to open"
          value={m?.avgTimeToOpenHours == null ? "—" : `${m.avgTimeToOpenHours}h`}
          sub="From link creation"
        />
        <StatBlock
          label="Follow-up rate"
          value={
            funnel.opened
              ? `${Math.round((funnel.followedUp / Math.max(funnel.opened, 1)) * 100)}%`
              : "—"
          }
          sub="Of opened reports"
        />
        <StatBlock
          label="Conversion"
          value={
            funnel.followedUp
              ? `${Math.round((funnel.progressed / Math.max(funnel.followedUp, 1)) * 100)}%`
              : "—"
          }
          sub="Follow-ups that progressed"
          accent
        />
      </div>

      {/* Weekly opens / prints chart */}
      <div className="mt-8 border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-summer" />
          <MonoLabel className="opacity-100">Weekly activity</MonoLabel>
        </div>
        {weeks.length === 0 || weeks.every((w) => w.views + w.prints === 0) ? (
          <p className="mt-4 text-sm opacity-60">No client report activity yet.</p>
        ) : (
          <div className="mt-6">
            <svg
              viewBox={`0 0 ${weeks.length * 48} 120`}
              preserveAspectRatio="none"
              className="h-48 w-full"
            >
              {weeks.map((w, i) => {
                const x = i * 48 + 8;
                const viewH = (w.views / maxWeek) * 90;
                const printH = (w.prints / maxWeek) * 90;
                return (
                  <g key={w.week}>
                    <rect
                      x={x}
                      y={100 - viewH}
                      width={14}
                      height={viewH}
                      className="fill-summer"
                    />
                    <rect
                      x={x + 18}
                      y={100 - printH}
                      width={14}
                      height={printH}
                      className="fill-sun"
                    />
                  </g>
                );
              })}
            </svg>
            <div className="mt-2 flex justify-between text-xs opacity-60">
              {weeks.map((w) => (
                <span key={w.week} className="w-12 text-center">
                  {fmtDate(w.week)}
                </span>
              ))}
            </div>
            <div className="mt-4 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 bg-summer" /> Opens
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 bg-sun" /> Prints / downloads
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Conversion funnel */}
      <div className="mt-8 border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <MailCheck className="size-4 text-summer" />
          <MonoLabel className="opacity-100">Conversion funnel</MonoLabel>
        </div>
        <div className="mt-6 space-y-3">
          <FunnelRow
            icon={<Send className="size-3.5" />}
            label="Links sent"
            value={funnel.sent}
            pct={100}
            color="bg-muted"
          />
          <FunnelRow
            icon={<Link2 className="size-3.5" />}
            label="Opened"
            value={funnel.opened}
            pct={(funnel.opened / funnelMax) * 100}
            color="bg-sun"
          />
          <FunnelRow
            icon={<Users className="size-3.5" />}
            label="Followed up"
            value={funnel.followedUp}
            pct={(funnel.followedUp / funnelMax) * 100}
            color="bg-summer"
          />
          <FunnelRow
            icon={<Clock className="size-3.5" />}
            label="Progressed"
            value={funnel.progressed}
            pct={(funnel.progressed / funnelMax) * 100}
            color="bg-primary"
          />
        </div>
      </div>
    </section>
  );
}

function FunnelRow({
  icon,
  label,
  value,
  pct,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[10rem_1fr_auto]">
      <span className="label-mono flex items-center gap-2 opacity-80">
        {icon} {label}
      </span>
      <div className="h-4 w-full bg-muted">
        <div className={cn("h-4", color)} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="label-mono text-right tabular-nums">{value}</span>
    </div>
  );
}
