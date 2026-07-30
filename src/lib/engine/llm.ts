/**
 * Optional LLM enrichment layer.
 * ANY failure (no key, network, timeout, bad JSON) → null, never throws.
 */

/**
 * Check if an OpenAI API key is available.
 */
export function hasKey(): boolean {
  return typeof process !== "undefined" && !!process.env.OPENAI_API_KEY;
}

/**
 * Call OpenAI chat completions with JSON response format.
 * Returns parsed JSON on success, null on any failure.
 */
export async function callJson(
  system: string,
  user: string,
  timeoutMs = 20000,
): Promise<unknown | null> {
  if (!hasKey()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Ask the LLM to map unknown CSV headers to the canonical schema.
 * Returns a header mapping object or null on failure.
 */
export async function mapSchema(
  headers: string[],
  app: string,
): Promise<Record<string, string> | null> {
  const system = `You are a CSV header mapper for Indian UPI payment statements.
Given a list of headers and the app name (${app}), return a JSON mapping from
canonical field names to the actual header names. Canonical fields for statements:
txn_id, datetime, amount, status, utr. For register: sale_id, datetime, amount, mode, app, utr_expected.
Return only JSON, no markdown.`;

  const user = `Headers: ${JSON.stringify(headers)}\nApp: ${app}`;

  const result = await callJson(system, user);
  if (!result || typeof result !== "object") return null;
  return result as Record<string, string>;
}

/**
 * Optionally enrich a finding with better bilingual text.
 * Returns enriched text fields or null to fall back to templates.
 */
export async function enrichFinding(
  finding: { kind: string; amountPaise: number; titleEn: string },
  evidence: { raw: string }[],
): Promise<{ titleEn?: string; titleHi?: string; detailEn?: string; detailHi?: string } | null> {
  const system = `You are a bilingual (Hindi-English) financial assistant for Indian merchants.
Given a reconciliation finding with evidence, produce clear bilingual titles and details.
Return JSON with fields: titleEn, titleHi, detailEn, detailHi.
Keep it concise and actionable. Return only JSON.`;

  const user = `Finding: ${JSON.stringify(finding)}\nEvidence: ${JSON.stringify(evidence.map((e) => e.raw))}`;

  const result = await callJson(system, user);
  if (!result || typeof result !== "object") return null;
  return result as { titleEn?: string; titleHi?: string; detailEn?: string; detailHi?: string };
}
