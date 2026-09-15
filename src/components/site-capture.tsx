import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Audit } from "@/lib/audit-types";

/** On-site capture: pin the exact location and time of the walkthrough. */
export function SiteCapture({
  draft,
  patch,
}: {
  draft: Audit;
  patch: (p: Partial<Audit>) => void;
}) {
  const [busy, setBusy] = useState(false);

  function pin() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("This device can't share its location");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        patch({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          capturedAt: new Date().toISOString(),
        });
        setBusy(false);
        toast.success("Location pinned");
      },
      () => {
        setBusy(false);
        toast.error("Couldn't get your location — check location permission");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  const pinned = draft.latitude != null && draft.longitude != null;

  return (
    <div className="border border-border bg-card p-5 lg:col-span-2">
      <Label className="label-mono mb-2 opacity-70">On-site location</Label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" className="label-mono" onClick={pin} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
          {pinned ? "Re-pin location" : "Pin my location"}
        </Button>
        <Input
          value={draft.locationLabel ?? ""}
          onChange={(e) => patch({ locationLabel: e.target.value })}
          placeholder="Area or building, e.g. Warehouse 2 — dispatch"
          className="max-w-sm"
        />
        {pinned ? (
          <a
            className="brand-underline text-sm"
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps?q=${draft.latitude},${draft.longitude}`}
          >
            {draft.latitude}, {draft.longitude}
          </a>
        ) : (
          <span className="text-sm opacity-60">Not pinned yet</span>
        )}
      </div>
      {draft.capturedAt ? (
        <p className="mt-2 text-xs opacity-60">
          Captured {new Date(draft.capturedAt).toLocaleString("en-AU")}
        </p>
      ) : null}
    </div>
  );
}
