import { defineConfig } from "nitro";

// The PDF export route runs a headless Chromium instance (decompress + launch
// + render + wait for fonts/photos + print), which comfortably exceeds
// Vercel's default 10s serverless function timeout — that's what was causing
// the browser's generic "Couldn't download" failure. Extend just this route.
export default defineConfig({
  vercel: {
    functionRules: {
      "/api/audits/**": {
        maxDuration: 60,
        memory: 1769, // 1 vCPU tier on Vercel; headless Chromium needs more than the default 1024MB
      },
    },
  },
});
