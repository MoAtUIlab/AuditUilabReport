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
  // pdf-lib and @supabase/functions-js's compiled output import `tslib` as a
  // bare package specifier. Nitro's dependency tracing for this route's
  // function bundle isn't picking it up as a runtime external even though
  // it's a direct dependency now (confirmed via Vercel's function logs:
  // ERR_MODULE_NOT_FOUND for tslib from both _libs/pdf-lib.mjs and
  // _libs/supabase__functions-js.mjs). Force it inline instead of relying on
  // externals resolution at runtime.
  externals: {
    inline: ["tslib"],
  },
});
