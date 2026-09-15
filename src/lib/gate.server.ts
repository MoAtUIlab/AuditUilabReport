import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean };

export function gateSessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "uilab-gate",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export async function isUnlocked(): Promise<boolean> {
  const session = await useSession<GateSession>(gateSessionConfig());
  return session.data.unlocked === true;
}

export async function requireUnlocked() {
  if (!(await isUnlocked())) {
    throw new Error("Locked");
  }
}

export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}
