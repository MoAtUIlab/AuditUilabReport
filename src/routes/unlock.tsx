import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { UiLabWordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unlockSite } from "@/lib/gate.functions";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Unlock — UiLab Base Walkthrough" },
      { name: "description", content: "Enter the shared site password to continue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const unlock = useServerFn(unlockSite);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await unlock({ data: { password } });
      if (res.ok) {
        navigate({ to: "/" });
      } else {
        setError(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={submit} className="w-full max-w-sm border-2 border-foreground p-8">
        <UiLabWordmark />
        <p className="label-mono mt-2 text-summer">Base Walkthrough</p>
        <h1 className="mt-8 text-3xl font-bold tracking-[-0.02em]">Team access</h1>
        <p className="mt-2 text-sm opacity-70">
          Enter the shared site password. Ask a teammate if you don't have it.
        </p>
        <div className="mt-6 space-y-3">
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Site password"
            aria-label="Site password"
            className="h-12"
          />
          {error ? (
            <p className="label-mono text-summer">Wrong password — try again</p>
          ) : null}
          <Button type="submit" disabled={busy || !password} className="label-mono h-12 w-full">
            <KeyRound className="size-4" /> {busy ? "Unlocking…" : "Unlock"}
          </Button>
        </div>
      </form>
    </div>
  );
}
