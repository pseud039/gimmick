import { GoogleGenAI } from "@google/genai";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseJson(text) {
  const t = String(text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

export async function gemini({ system, user, temperature = 0.7 }) {
  const model = process.env.OPENROUTER_MODEL;
  const key = process.env.OPENROUTER_API_KEY;
  if (!model) throw new Error("Set OPENROUTER_MODEL (copy the id from openrouter.ai/models).");
  if (!key) throw new Error("Set OPENROUTER_API_KEY.");
  console.log(`Using model: ${model}`);

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "X-Title": "Hitech blog pipeline",
        },
        body: JSON.stringify({
          model,
          temperature,
         max_tokens: 12000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: AbortSignal.timeout(240000),
      });
      const raw = await res.text();
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}: ${raw.slice(0, 500)}`);
        err.fatal = [400, 401, 402, 403, 404].includes(res.status); // retrying won't help
        throw err;
      }
      const data = JSON.parse(raw);
      if (data.error) throw new Error(`OpenRouter error: ${JSON.stringify(data.error).slice(0, 500)}`);
      const choice = data.choices?.[0];
      if (choice?.finish_reason === "length") throw new Error("output truncated (hit max_tokens)");
      return parseJson(choice?.message?.content);
    } catch (e) {
      lastErr = e;
      if (e.fatal) break;
      await sleep(2000 * attempt);
    }
  }
  throw new Error(`LLM call failed: ${lastErr?.message}`);
}
