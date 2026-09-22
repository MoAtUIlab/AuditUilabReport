/**
 * Single guarded service-worker registrar.
 * Never registers in dev, in an iframe, or with ?sw=off.
 */
const SW_URL = "/sw.js";

function blockedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.top !== window.self) return true;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return true;
  return false;
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
  // With skipWaiting + clientsClaim, a new SW can take control mid-session (e.g. a
  // phone PWA that's never fully closed). Reload once so the tab picks up the JS
  // bundle that matches the now-active worker, instead of running stale code against
  // a fetch layer that's already moved on.
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(SW_URL).catch(() => {});
  });
}
