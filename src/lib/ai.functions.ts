import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUnlocked } from "./gate.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.8-flash";

const scaleEnum = z.enum(["low", "medium", "high"]);

const draftSchema = z.object({
  client: z.string().default(""),
  site: z.string().default(""),
  industry: z.string().default(""),
  headcount: z.number().default(0),
  executiveSummary: z.string().default(""),
  scope: z.string().default(""),
  maturity: z
    .array(
      z.object({
        label: z.string(),
        score: z.number().min(0).max(5),
        note: z.string().default(""),
      }),
    )
    .default([]),
  findings: z
    .array(
      z.object({
        area: z.string(),
        observation: z.string(),
        severity: z.enum(["low", "moderate", "high", "critical"]),
        impact: z.string(),
      }),
    )
    .default([]),
  opportunities: z
    .array(
      z.object({
        title: z.string(),
        process: z.string().default(""),
        category: z.string().default(""),
        effort: scaleEnum,
        impact: scaleEnum,
        hoursSavedPerYear: z.number().default(0),
        annualValue: z.number().default(0),
        horizon: z.string().default("0–3 months"),
      }),
    )
    .default([]),
  recommendations: z
    .array(z.object({ phase: z.string(), title: z.string(), detail: z.string() }))
    .default([]),
});

export type AuditDraft = z.infer<typeof draftSchema>;

async function callGateway(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === "string") text += delta;
      } catch {
        // partial SSE chunk — ignore
      }
    }
  }
  return text;
}

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returned no JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const SYSTEM = `You are an automation and applied-AI audit assistant for UiLab, an Australian applied-AI consultancy.
You turn rough field-walkthrough notes from manufacturing/industrial sites into structured audit content.
Be concrete and specific to the business described. Estimate hours and AUD value conservatively but realistically (Australian wages, e.g. $45-75/hr loaded).
Maturity scores are 0-5 (0 = nothing in place, 5 = best practice). Horizons like "0-3 months", "3-6 months", "6-12 months".
Reply with JSON only.`;

export const draftAuditFromNotes = createServerFn({ method: "POST" })
  .inputValidator((data: { notes: string }) =>
    z.object({ notes: z.string().min(10) }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const text = await callGateway([
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Turn these raw walkthrough notes into a structured audit as JSON with keys: client, site, industry, headcount (number), executiveSummary (2-3 paragraphs), scope, maturity (array of {label, score, note} — use these six labels: Data foundations, Process documentation, Systems integration, Workforce readiness, AI adoption, Measurement & reporting), findings (array of {area, observation, severity (low|moderate|high|critical), impact}), opportunities (array of {title, process, category, effort (low|medium|high), impact (low|medium|high), hoursSavedPerYear (number), annualValue (number, AUD), horizon}), recommendations (array of 2-4 {phase, title, detail} as a phased rollout).\n\nNOTES:\n${data.notes}`,
      },
    ]);
    return draftSchema.parse(extractJson(text));
  });

export const draftExecutiveSummary = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        client: z.string(),
        site: z.string(),
        industry: z.string(),
        scope: z.string(),
        maturity: z.array(z.object({ label: z.string(), score: z.number() })),
        findings: z.array(z.object({ area: z.string(), observation: z.string() })),
        opportunities: z.array(
          z.object({
            title: z.string(),
            hoursSavedPerYear: z.number(),
            annualValue: z.number(),
          }),
        ),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const text = await callGateway([
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Write a client-ready executive summary (2-3 paragraphs, confident consulting tone, no bullet points) as JSON {"summary": "..."} for this audit:\n${JSON.stringify(data)}`,
      },
    ]);
    const parsed = z.object({ summary: z.string() }).parse(extractJson(text));
    return parsed;
  });
