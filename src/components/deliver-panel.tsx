import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Copy,
  Download,
  FileText,
  Link2,
  Loader2,
  Mail,
  Plus,
  Printer,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { MonoLabel } from "@/components/brand";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createShareLink,
  listAuditViews,
  listShareLinks,
  revokeShareLink,
} from "@/lib/share.functions";
import { formatDate, type Audit } from "@/lib/audit-types";

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** The client dossier goes out two ways: a PDF you download, or a private landing page with a PIN. */
export function DeliverPanel({ audit }: { audit: Audit }) {
  const queryClient = useQueryClient();
  const create = useServerFn(createShareLink);
  const revoke = useServerFn(revokeShareLink);
  const fetchLinks = useServerFn(listShareLinks);
  const fetchViews = useServerFn(listAuditViews);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("30");
  const [pin, setPin] = useState(randomPin);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  function printPreview() {
    const win = previewRef.current?.contentWindow;
    if (!win) {
      toast.error("Preview hasn't finished loading yet — try again in a moment.");
      return;
    }
    win.focus();
    win.print();
  }

  const links = useQuery({
    queryKey: ["shares", audit.id],
    queryFn: () => fetchLinks({ data: { auditId: audit.id } }),
    retry: false,
  });
  const views = useQuery({
    queryKey: ["views", audit.id],
    queryFn: () => fetchViews({ data: { auditId: audit.id } }),
    retry: false,
  });

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function makeLink() {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("The PIN needs to be exactly 4 digits");
      return;
    }
    setBusy(true);
    try {
      const { token, passcode } = await create({
        data: {
          auditId: audit.id,
          recipientName: name,
          recipientEmail: email,
          expiresInDays: days ? Number(days) : null,
          passcode: pin,
        },
      });
      // Copy the link alone — combining it with the PIN in one clipboard write
      // has broken in the wild when pasted somewhere that collapses the
      // newline (address bars, some chat apps), turning "link\nPIN: 1234"
      // into one mangled URL the client can't open.
      await copy(`${origin}/r/${token}`);
      toast.success(`Link copied. Share the PIN separately: ${passcode}`);
      setName("");
      setEmail("");
      setPin(randomPin());
      await queryClient.invalidateQueries({ queryKey: ["shares", audit.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="space-y-8">
      {/* The flow, drawn out */}
      <section className="border border-border bg-card p-6">
        <MonoLabel className="opacity-100">Client dossier · how it goes out</MonoLabel>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <ol className="space-y-2 border-l-2 border-primary pl-4">
            <li className="font-medium">1 · Landing page</li>
            <li className="opacity-70">2 · Set a 4-digit PIN</li>
            <li className="opacity-70">3 · Copy or send the link</li>
            <li className="opacity-70">4 · Client opens it, prints it, forwards it to their team</li>
            <li className="opacity-70">5 · Opens and prints show up in your metrics below</li>
          </ol>
          <ol className="space-y-2 border-l-2 border-summer pl-4">
            <li className="font-medium">1 · PDF download</li>
            <li className="opacity-70">2 · Saves straight to your device</li>
            <li className="opacity-70">3 · You email it yourself — nothing tracked</li>
          </ol>
        </div>
      </section>

      {/* Full report preview + export */}
      <section className="border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <MonoLabel className="opacity-100">Report preview</MonoLabel>
            <p className="mt-2 max-w-xl text-sm opacity-70">
              This is the exact document the client receives — cover, findings, opportunities,
              roadmap, proposal and signature pages, laid out for A4.
            </p>
          </div>
          <Button className="label-mono" onClick={printPreview}>
            <Printer className="size-3.5" /> Export / Print PDF
          </Button>
        </div>
        <div className="mt-6 h-[70vh] overflow-hidden border border-border bg-muted">
          <iframe
            ref={previewRef}
            title="Client dossier preview"
            src={`/audits/${audit.id}/report`}
            className="h-full w-full"
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Branch 1 — PDF download */}
        <section className="border border-border bg-card p-6">
          <MonoLabel className="opacity-100">Branch 1 · PDF download</MonoLabel>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.02em]">Download to your device</h3>
          <p className="mt-2 text-sm opacity-70">
            Opens the dossier and goes straight to save-as-PDF, so you can attach it to your own
            email. Nothing is tracked this way.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="label-mono">
              <Link to="/audits/$id/report" params={{ id: audit.id }} hash="print">
                <Download className="size-3.5" /> Download PDF
              </Link>
            </Button>
            <Button asChild variant="outline" className="label-mono">
              <Link to="/audits/$id/report" params={{ id: audit.id }}>
                <FileText className="size-3.5" /> Preview dossier
              </Link>
            </Button>
          </div>
        </section>

        {/* Branch 2 — landing page */}
        <section className="border border-border bg-card p-6">
          <MonoLabel className="opacity-100">Branch 2 · Landing page + PIN</MonoLabel>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.02em]">Set a PIN, then send the link</h3>
          <p className="mt-2 text-sm opacity-70">
            The client opens the report in their browser with the PIN, can print it and can show it
            to their own team. You see every open and print.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="label-mono mb-2 opacity-70">4-digit PIN</Label>
              <div className="flex gap-2">
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  maxLength={4}
                  className="font-mono tracking-[0.3em]"
                />
                <Button variant="outline" className="label-mono" onClick={() => setPin(randomPin())}>
                  New
                </Button>
              </div>
            </div>
            <div>
              <Label className="label-mono mb-2 opacity-70">Expires after (days)</Label>
              <Input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <Label className="label-mono mb-2 opacity-70">Client contact name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <Label className="label-mono mb-2 opacity-70">Their email (for your records)</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@client.com.au"
              />
            </div>
          </div>
          <Button className="label-mono mt-4" onClick={makeLink} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Create link with this PIN
          </Button>
        </section>
      </div>

      {/* Links + tracking */}
      <section>
        <MonoLabel className="opacity-100">Links sent</MonoLabel>
        {links.isPending ? (
          <p className="mt-3 text-sm opacity-60">Loading…</p>
        ) : (links.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm opacity-60">No client links yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {(links.data ?? []).map((l) => {
              const stale =
                !l.revoked &&
                l.views === 0 &&
                new Date(l.createdAt).getTime() < Date.now() - 14 * 86400000;
              return (
                <li
                  key={l.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 py-4",
                    stale && "bg-sunset/5",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {l.recipientName || "Client link"}
                      {l.revoked ? <span className="ml-2 text-sm opacity-60">· turned off</span> : null}
                      {stale ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-summer">
                          · needs follow-up
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 truncate text-xs opacity-60">
                      {origin}/r/{l.token} · PIN {l.passcode}
                      {l.expiresAt ? ` · expires ${formatDate(l.expiresAt)}` : ""}
                    </p>
                    <p className="label-mono mt-2 flex items-center gap-2 opacity-100">
                      <BarChart3 className="size-3.5 text-primary" />
                      {l.views} opens · {l.prints} prints
                      {l.lastViewedAt ? ` · last ${formatDate(l.lastViewedAt)}` : " · not opened yet"}
                    </p>
                  </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="label-mono"
                    onClick={async () => {
                      const ok = await copy(`${origin}/r/${l.token}`);
                      toast[ok ? "success" : "error"](
                        ok ? `Link copied. PIN: ${l.passcode}` : "Could not copy",
                      );
                    }}
                  >
                    <Copy className="size-3.5" /> Copy link
                  </Button>
                  <Button variant="outline" className="label-mono" asChild>
                    <a
                      href={`mailto:${l.recipientEmail}?subject=${encodeURIComponent(
                        `${audit.client} — automation opportunity report`,
                      )}&body=${encodeURIComponent(
                        `Hi ${l.recipientName || "there"},\n\nYour report from our walkthrough of ${
                          audit.site || audit.client
                        } is ready:\n${origin}/r/${l.token}\nPIN: ${l.passcode}\n\nHappy to walk you through it.\n\nUiLab`,
                      )}`}
                    >
                      <Mail className="size-3.5" /> Send link
                    </a>
                  </Button>
                  {!l.revoked ? (
                    <Button
                      variant="ghost"
                      className="label-mono"
                      onClick={async () => {
                        await revoke({ data: { id: l.id } });
                        await queryClient.invalidateQueries({ queryKey: ["shares", audit.id] });
                        toast.success("Link turned off");
                      }}
                    >
                      <ShieldOff className="size-3.5" /> Turn off
                    </Button>
                  ) : null}
                </div>
              </li>);
            })}
          </ul>
        )}

        <MonoLabel className="mt-10 block opacity-100">Activity</MonoLabel>
        {(views.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm opacity-60">
            Nothing yet. Opens and prints of the client page will show here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {(views.data ?? []).slice(0, 15).map((v) => (
              <li key={v.id} className="flex items-center gap-3">
                <Link2 className="size-3.5 text-primary" />
                <span>
                  {v.event === "print"
                    ? "Printed the report"
                    : v.event === "download"
                      ? "Downloaded the PDF"
                      : "Opened the report"}
                </span>
                <span className="opacity-60">
                  {new Date(v.createdAt).toLocaleString("en-AU", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
