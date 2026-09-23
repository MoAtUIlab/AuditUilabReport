import { createFileRoute } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportDocument } from "@/components/report-document";
import { getAudit } from "@/lib/audit.functions";
import { isUnlocked } from "@/lib/gate.server";
import appCss from "../styles.css?url";

/**
 * Real, one-click PDF download. window.print() only ever opens the browser's
 * print dialog — it can't save a file by itself, and users kept expecting
 * "Download PDF" to just produce a file. This renders the same ReportDocument
 * server-side and drives a real (headless) browser to print it to an actual
 * PDF buffer, which we return as a file attachment so the browser downloads
 * it directly, no dialog involved.
 */
export const Route = createFileRoute("/api/audits/$id/pdf")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!(await isUnlocked())) {
          return new Response("Unauthorized", { status: 401 });
        }

        const audit = await getAudit({ data: { id: params.id } });
        if (!audit) return new Response("Not found", { status: 404 });

        const bodyHtml = renderToStaticMarkup(<ReportDocument audit={audit} />);
        const origin = new URL(request.url).origin;
        const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="${new URL(appCss, origin).href}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700&family=Roboto+Mono:wght@400;500;700&display=swap" />
</head>
<body class="report-surface">${bodyHtml}</body>
</html>`;

        const [{ default: chromium }, puppeteer] = await Promise.all([
          import("@sparticuz/chromium"),
          import("puppeteer-core"),
        ]);

        const browser = await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
        try {
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: "networkidle0", timeout: 25000 });
          const pdf = await page.pdf({
            format: "a4",
            printBackground: true,
            margin: { top: "10mm", right: "6mm", bottom: "16mm", left: "6mm" },
          });
          const filename = `${(audit.reference || audit.id).replace(/[^a-z0-9-]+/gi, "-")}.pdf`;
          return new Response(pdf, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Cache-Control": "no-store",
            },
          });
        } finally {
          await browser.close();
        }
      },
    },
  },
});
