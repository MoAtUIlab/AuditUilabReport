import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ArrowLeft, Link2, Printer } from "lucide-react";
import { toast } from "sonner";
import { ReportDocument } from "@/components/report-document";
import { Button } from "@/components/ui/button";
import { useAudit } from "@/lib/audit-store";
import { gateBeforeLoad } from "@/lib/gate";

export const Route = createFileRoute("/audits/$id/report")({
  beforeLoad: gateBeforeLoad,
  head: () => ({
    meta: [
      { title: "Executive dossier — UiLab Base Walkthrough" },
      {
        name: "description",
        content:
          "Client-ready executive dossier: maturity profile, field findings, photo evidence, automation opportunities and a phased roadmap.",
      },
      { property: "og:title", content: "Executive dossier — UiLab Base Walkthrough" },
      {
        property: "og:description",
        content: "Print-optimised automation and applied AI dossier from a UiLab site walkthrough.",
      },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const { audit, ready } = useAudit(id);
  const printed = useRef(false);

  // Arriving with #print (the "Download PDF" action) goes straight to save-as-PDF.
  useEffect(() => {
    if (!audit || printed.current) return;
    if (typeof window === "undefined" || window.location.hash !== "#print") return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [audit]);

  if (!audit) {
    return (
      <div className="report-surface min-h-screen p-10">
        <p className="text-lg font-medium">{ready ? "Audit not found." : "Loading dossier…"}</p>
        <Link to="/" className="brand-underline mt-4 inline-block text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  function share() {
    const url = window.location.href;
    navigator.clipboard
      ?.writeText(url)
      .then(() => toast.success("Dossier link copied to clipboard"))
      .catch(() => toast.error("Could not copy the link"));
  }

  return (
    <div className="report-surface min-h-screen">
      {/* Controls */}
      <div className="no-print sticky top-0 z-10 border-b border-ink/10 bg-paper/95 backdrop-blur">
        <div className="report-page flex items-center justify-between gap-4 py-4">
          <Link to="/audits/$id" params={{ id: audit.id }} className="label-mono flex items-center gap-2">
            <ArrowLeft className="size-3.5" /> Back to audit
          </Link>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="label-mono border-ink/25 bg-paper text-ink hover:bg-ink/5 hover:text-ink"
              onClick={share}
            >
              <Link2 className="size-3.5" /> Share link
            </Button>
            <Button className="label-mono" onClick={() => window.print()}>
              <Printer className="size-3.5" /> Print / PDF
            </Button>
          </div>
        </div>
      </div>

      <ReportDocument audit={audit} />
    </div>
  );
}
