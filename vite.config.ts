// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        // Nitro's Vercel preset writes the client build straight into the Vercel
        // Build Output API directory (.vercel/output/static) — there is no plain
        // "dist" folder to speak of. Without this, vite-plugin-pwa scans Vite's
        // default outDir, finds 0 files to precache, and drops sw.js somewhere
        // Vercel never serves, so /sw.js 404s in production. This ties the PWA
        // build to the Vercel target specifically (matches the current deploy).
        outDir: ".vercel/output/static",
        workbox: {
          globDirectory: ".vercel/output/static",
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/_serverFn\//],
          globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "html-navigations", networkTimeoutSeconds: 5 },
            },
            {
              // Only precache-friendly static assets (scripts, styles, images,
              // fonts) — a bare "not a document" check also matches fetch/XHR
              // calls to _serverFn (audits, share links, everything data-driven),
              // which would otherwise get served stale from cache instead of the
              // network and silently break the app with outdated data.
              urlPattern: ({ url, request }) =>
                url.origin === self.location.origin &&
                ["script", "style", "image", "font"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                // Renamed from "app-assets": the previous ruleset briefly cached
                // _serverFn responses too, so any device that loaded the SW in
                // that window needs a clean cache rather than reusing poisoned
                // entries for up to their 30-day expiration.
                cacheName: "app-assets-v2",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/_serverFn/"),
              handler: "NetworkOnly",
            },
          ],
        },
      }),
    ],
  },
});
