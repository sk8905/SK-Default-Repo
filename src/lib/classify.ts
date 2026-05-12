import Anthropic from "@anthropic-ai/sdk";
import { AREA_SLUGS, type AreaSlug } from "./areas";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are an assistant supporting an English-qualified solicitor (qualified 2016) who tracks legal developments relevant to their practice across five areas:

- "banking" = Banking & Finance (loan markets, syndicated lending, derivatives, securitisation, structured finance, debt capital markets, financial regulation affecting lenders — PRA/FCA/ECB/EBA rules, EMIR/UK MIFIR/SMCR/CRR/Basel/UK Securitisation Regulation, sanctions affecting lending)
- "restructuring" = Restructuring & Insolvency (CIGA, Restructuring Plans Pt 26A, Schemes of Arrangement, administration, liquidation, CVAs, cross-border insolvency, distressed M&A, directors' duties on insolvency, EU/US Chapter 11/15 issues with UK relevance)
- "corporate" = Corporate / M&A (Companies Act 2006, Takeover Code, public M&A, private M&A, ECM, corporate governance, listing rules, NSIA, FSMA, equivalent EU/cross-border M&A and governance developments)
- "fundsreg" = Investment Fund Regulatory (AIFMD/UK AIFMD, FCA rules for fund managers, marketing rules, NPPR, ELTIF/LTAF, private fund LPA issues, ESG/SDR fund rules, EU/global fund regulation that affects UK fund managers)
- "fundstax" = Corporate & Investment Fund Tax (UK corporation tax, carried interest, qualifying asset holding companies (QAHC), investment manager exemption, Pillar Two, REITs, transfer pricing, withholding tax, hybrid mismatches, fund taxation; also OECD/EU tax developments that affect UK practice)

Your job for each firm publication:

1. Decide whether this is a SUBSTANTIVE legal alert that would be useful reading for an English solicitor working in ONE of those five areas. "Substantive" means it analyses a development in law, regulation, case-law, market practice, or policy. Items can be about UK, EU, US, OECD or cross-border developments — provided the development is relevant to English-law practice in the named area.

2. Return "irrelevant" ONLY if the item is:
   - Pure marketing, deal announcement with no legal analysis, firm news, lateral-hire announcement, ranking/award, event invitation, podcast trailer, or similar non-substantive content
   - In a different practice area entirely (e.g. IP, employment, real estate, antitrust, healthcare, life sciences, projects/energy, dispute resolution-only) — UNLESS the item is also a material development in one of the five named areas
   - About a single foreign jurisdiction with no English-law relevance whatsoever (e.g. a US-state-law update on a topic that has no UK analogue)

3. Otherwise: pick the SINGLE best-fit area slug and write a 1-3 paragraph summary aimed at a qualified English solicitor — precise, names the instrument/regulator/case, identifies the practical consequence, no fluff, no hedging.

Output ONLY valid JSON in this exact shape:
{"area": "banking"|"restructuring"|"corporate"|"fundsreg"|"fundstax"|"irrelevant", "summary": "..."}

Do not wrap the JSON in markdown code fences. Do not add commentary.`;

export type ClassifyResult =
  | { area: AreaSlug; summary: string }
  | { area: "irrelevant"; summary: string };

export async function classifyAndSummarise(input: {
  firmName: string;
  title: string;
  body: string;
}): Promise<ClassifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });

  // Trim body to keep input cost down — first ~6000 chars is plenty for a summary.
  const body = input.body.length > 6000 ? input.body.slice(0, 6000) + " […truncated]" : input.body;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Firm: ${input.firmName}\nTitle: ${input.title}\n\nAlert content:\n${body}`,
      },
    ],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return parseResult(text);
}

function parseResult(text: string): ClassifyResult {
  // Tolerant JSON parse: find the first { ... } block.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { area: "irrelevant", summary: "Could not parse classifier output." };
  try {
    const obj = JSON.parse(match[0]);
    const area = String(obj.area || "irrelevant");
    const summary = String(obj.summary || "").trim();
    if (area === "irrelevant") return { area: "irrelevant", summary };
    if ((AREA_SLUGS as readonly string[]).includes(area)) {
      return { area: area as AreaSlug, summary };
    }
    return { area: "irrelevant", summary };
  } catch {
    return { area: "irrelevant", summary: "Could not parse classifier output." };
  }
}
