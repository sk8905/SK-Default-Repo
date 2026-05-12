import Anthropic from "@anthropic-ai/sdk";
import { AREA_SLUGS, type AreaSlug } from "./areas";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are an assistant supporting an English-qualified solicitor (qualified 2016) who tracks material developments in English law across five practice areas.

You will receive a single law-firm client alert / publication. Your job:
1. Decide whether it describes a MATERIAL development in ENGLISH law within one of these five areas:
   - "banking" = Banking & Finance (loan markets, syndicated lending, derivatives, securitisation, structured finance, debt capital markets, financial regulation affecting lenders such as PRA/FCA rules, EMIR/UK MIFIR/SMCR/CRR/UK Securitisation Regulation)
   - "restructuring" = Restructuring & Insolvency (CIGA, Restructuring Plans Pt 26A, Schemes of Arrangement, administration, liquidation, CVAs, cross-border insolvency, distressed M&A, directors' duties on insolvency)
   - "corporate" = Corporate / M&A (Companies Act 2006, Takeover Code, public M&A, private M&A, ECM, corporate governance, listing rules, NSIA, FSMA)
   - "fundsreg" = Investment Fund Regulatory (AIFMD/UK AIFMD, FCA rules for fund managers, marketing rules, NPPR, ELTIF/LTAF, private fund LPA issues, ESG/SDR fund rules)
   - "fundstax" = Corporate & Investment Fund Tax (UK corporation tax, carried interest, qualifying asset holding companies (QAHC), investment manager exemption, Pillar Two, REITs, transfer pricing, withholding tax, hybrid mismatches, fund taxation specifically)
2. If the alert is not English-law material, or is purely about another jurisdiction (US, EU only, APAC), or is marketing fluff / event invite / firm news, return "irrelevant".
3. Otherwise return ONE area slug (the single best fit) and a 1-3 paragraph summary written for a qualified English solicitor: precise, no fluff, names the instrument/regulator/case, identifies the practical consequence, avoids hedging.

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
