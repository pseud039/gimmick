import fs from "node:fs";
import { ENV_FILE } from "./paths.js";

export const EDITABLE = ["OPENROUTER_API_KEY", "OPENROUTER_MODEL", "MAX_TOKENS", "TARGET_WORDS", "SITE_URL"];

// Update only the keys we manage; keep comments, ordering and any other lines (e.g. UI_PASSWORD).
export function saveEnv(values) {
  const lines = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/) : [];
  const left = { ...values };
  const out = [];
  for (const l of lines) {
    const k = l.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
    if (k && k in left) { if (left[k] !== "") out.push(`${k}=${left[k]}`); delete left[k]; }
    else out.push(l);
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  for (const [k, v] of Object.entries(left)) if (v !== "") out.push(`${k}=${v}`);
  fs.writeFileSync(ENV_FILE, out.join("\n") + "\n", "utf8");
}
