import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { UiLabWordmark } from "./brand";
import { lockSite } from "@/lib/gate.functions";

export function AppShell({
  children,
  eyebrow,
  title,
  actions,
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  actions?: ReactNode;
}) {
  const lock = useServerFn(lockSite);
  const navigate = useNavigate();

  async function handleLock() {
    await lock();
    navigate({ to: "/unlock" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <UiLabWordmark />
            <span className="label-mono hidden border-l pl-3 opacity-60 sm:block">
              Base Walkthrough
            </span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link to="/" className="label-mono hover:text-summer">
              Dashboard
            </Link>
            <a href="https://uilab.com.au" className="label-mono hidden opacity-60 hover:text-summer sm:block">
              uilab.com.au
            </a>
            <button
              onClick={handleLock}
              className="label-mono flex items-center gap-1.5 opacity-60 hover:text-summer"
            >
              <Lock className="size-3.5" /> Lock
            </button>
          </nav>
        </div>
      </header>

      {(eyebrow || title || actions) && (
        <div className="border-b">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-6 px-6 py-10">
            <div>
              {eyebrow ? <p className="label-mono text-summer">{eyebrow}</p> : null}
              {title ? (
                <h1 className="mt-3 max-w-3xl text-4xl leading-[1.05] font-bold tracking-[-0.03em] sm:text-5xl">
                  {title}
                </h1>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1400px] px-6 py-10">{children}</main>

      <footer className="mt-16 border-t">
        <div className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-4 px-6 py-8">
          <p className="label-mono opacity-60">Internal field-audit tool · Shared team access</p>
          <p className="label-mono opacity-60">UILAB.COM.AU @UILAB.AU</p>
        </div>
      </footer>
    </div>
  );
}
