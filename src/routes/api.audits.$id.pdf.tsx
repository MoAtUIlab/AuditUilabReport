import { createFileRoute } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ReportDocument } from "@/components/report-document";
import { getAudit } from "@/lib/audit.functions";
import { isUnlocked } from "@/lib/gate.server";
import appCss from "../styles.css?url";

const HEADER_TEMPLATE = `
  <div style="width:100%; font-size:7.5px; font-family: 'Courier New', monospace; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(30,0,16,0.6); display:flex; justify-content:space-between; padding:0 6mm; border-bottom: 0.3mm solid rgba(30,0,16,0.2); padding-bottom: 2mm;">
    <span>Property of UiLab</span>
    <span>Commercial in confidence</span>
  </div>
`;

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

        let browser;
        try {
          browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
          });
        } catch (error) {
          // TEMPORARY: surface the real error while debugging deploy issues —
          // this route is already auth-gated, so it's safe to expose to a
          // logged-in team member. Remove once PDF export is confirmed stable.
          return new Response(`Launch failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`, { status: 500 });
        }
        try {
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: "networkidle0", timeout: 25000 });

          // The cover is always page 1 (the Table of Contents right after it
          // forces a page break) and has no running header — everything from
          // page 2 on does. Printed separately because Chromium's
          // displayHeaderFooter always numbers from 1 within a single print
          // call, which would double-count page 1 if applied to the whole
          // document at once.
          const coverBytes = await page.pdf({
            format: "a4",
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            pageRanges: "1",
          });
          const restBytes = await page.pdf({
            format: "a4",
            printBackground: true,
            margin: { top: "16mm", right: "6mm", bottom: "14mm", left: "6mm" },
            pageRanges: "2-",
            displayHeaderFooter: true,
            headerTemplate: HEADER_TEMPLATE,
            footerTemplate: "<div></div>",
          });

          const merged = await PDFDocument.create();
          const font = await merged.embedFont(StandardFonts.Courier);
          for (const bytes of [coverBytes, restBytes]) {
            const source = await PDFDocument.load(bytes);
            const pages = await merged.copyPages(source, source.getPageIndices());
            for (const p of pages) merged.addPage(p);
          }
          const pages = merged.getPages();
          for (let i = 1; i < pages.length; i++) {
            const label = String(i + 1);
            const size = 8;
            const width = font.widthOfTextAtSize(label, size);
            pages[i].drawText(label, {
              x: pages[i].getWidth() / 2 - width / 2,
              y: 24,
              size,
              font,
              color: rgb(0.12, 0, 0.06),
              opacity: 0.6,
            });
          }
          const pdf = await merged.save();

          const filename = `${(audit.reference || audit.id).replace(/[^a-z0-9-]+/gi, "-")}.pdf`;
          return new Response(pdf, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          return new Response(`PDF generation failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`, { status: 500 });
        } finally {
          await browser.close();
        }
      },
    },
  },
});
