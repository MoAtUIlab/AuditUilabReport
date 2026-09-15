import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Loader2, Lock, Printer, Share2 } from "lucide-react";
import { MonoLabel, UiLabWordmark } from "@/components/brand";
import { ReportDocument } from "@/components/report-document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openShare, recordShareEvent, shareIntro } from "@/lib/share.functions";
import type { Audit } from "@/lib/audit-types";

export const Route = createFileRoute("/r/$token")({
  head: () => ({
    meta: [
      { title: "Your automation opportunity report — UiLab" },
      {
        name: "description",
        content:
          "Private UiLab walkthrough report: findings, photo evidence, automation opportunities and a phased roadmap for your site.",
      },
      { property: "og:title", content: "Your automation opportunity report — UiLab" },
      {
        property: "og:description",
        content: "Open your private UiLab site walkthrough report with the passcode we sent you.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClientReportPage,
});

function ClientReportPage() {
  const { token } = Route.useParams();
  const intro = useServerFn(shareIntro);
  const open = useServerFn(openShare);
  const logEvent = useServerFn(recordShareEvent);

  const [passcode, setPasscode] = useState("");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: info, isPending } = useQuery({
    queryKey: ["share-intro", token],
    queryFn: () => intro({ data: { token } }),
    retry: false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await open({ data: { token, passcode } });
      if (result.ok) setAudit(result.audit as Audit);
      else
        setError(
          result.reason === "passcode"
            ? "That PIN doesn't match. Please check the PIN we sent you."
            : result.reason === "locked"
              ? "Too many incorrect attempts. Please wait 15 minutes and try again, or contact UiLab for a new link."
              : "This link is no longer available. Please contact UiLab for a new one.",
        );
    } catch {
      setError("Something went wrong opening the report. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function print() {
    void logEvent({ data: { token, event: "print" } }).catch(() => {});
    window.print();
  }

  function download() {
    void logEvent({ data: { token, event: "download" } }).catch(() => {});
    window.print();
  }

  async function forward() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  if (audit) {
    return (
      <div className="report-surface min-h-screen">
        <div className="no-print sticky top-0 z-10 border-b border-ink/10 bg-paper/95 backdrop-blur">
          <div className="report-page flex flex-wrap items-center justify-between gap-3 py-4">
            <UiLabWordmark tone="dark" />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="label-mono border-ink/25 bg-paper text-ink hover:bg-ink/5 hover:text-ink"
                onClick={forward}
              >
                <Share2 className="size-3.5" /> {copied ? "Link copied" : "Share with a colleague"}
              </Button>
              <Button
                variant="outline"
                className="label-mono border-ink/25 bg-paper text-ink hover:bg-ink/5 hover:text-ink"
                onClick={download}
              >
                <Download className="size-3.5" /> Download PDF
              </Button>
              <Button className="label-mono" onClick={print}>
                <Printer className="size-3.5" /> Print
              </Button>
            </div>
          </div>
        </div>
        <ReportDocument audit={audit} />
      </div>
    );
  }

  const unavailable = info && info.status !== "ok";

  return (
    <div className="flex min-h-screen items-center justify-center bg-sunset px-4 py-16 text-bone">
      <div className="w-full max-w-md">
        <UiLabWordmark />
        <p className="label-mono mt-10 text-sun">Private report</p>
        {isPending ? (
          <p className="mt-4 flex items-center gap-2 text-sm opacity-80">
            <Loader2 className="size-4 animate-spin" /> Checking your link…
          </p>
        ) : unavailable ? (
          <>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em]">This link isn't active</h1>
            <p className="mt-3 text-sm opacity-80">
              {info?.status === "expired"
                ? "The link has expired."
                : info?.status === "revoked"
                  ? "The link has been turned off."
                  : "We couldn't find this report."}{" "}
              Please get in touch with UiLab for a fresh link.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em]">
              {info?.client ? `${info.client} walkthrough report` : "Your walkthrough report"}
            </h1>
            <p className="mt-3 text-sm opacity-80">
              {info?.recipientName ? `Hi ${info.recipientName} — ` : ""}enter the 4-digit PIN we
              sent you to open the report.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4-digit PIN"
                className="border-bone/30 bg-bone/10 text-bone placeholder:text-bone/50 font-mono tracking-[0.4em]"
              />
              {error ? <p className="text-sm text-sun">{error}</p> : null}
              <Button type="submit" className="label-mono w-full" disabled={busy || !passcode}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-3.5" />}
                Open report
              </Button>
            </form>
          </>
        )}
        <MonoLabel className="mt-10 block opacity-60">UILAB.COM.AU</MonoLabel>
      </div>
    </div>
  );
}
