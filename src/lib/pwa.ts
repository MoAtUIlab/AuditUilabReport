/**
 * Single guarded service-worker registrar.
 * Never registers in dev, in an iframe, in Lovable preview hosts, or with ?sw=off.
 */
const SW_URL = "/sw.js";

function blockedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.top !== window.self) return true;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  const previewRoots = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  return previewRoots.some((root) => host === root || host.endsWith(`.${root}`));
}

async function unregisterApp() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (blockedContext()) {
    void unregisterApp();
    return;
  }
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(SW_URL).catch(() => {});
  });
}
