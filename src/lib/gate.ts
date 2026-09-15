import { redirect } from "@tanstack/react-router";
import { checkGate } from "./gate.functions";

/** Route guard: send visitors to /unlock unless the shared password session is active. */
export async function gateBeforeLoad() {
  const { unlocked } = await checkGate();
  if (!unlocked) throw redirect({ to: "/unlock" });
}
