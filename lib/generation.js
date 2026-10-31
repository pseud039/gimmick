// In-memory registry of running generations (survives Next dev hot reloads via globalThis).
import { doGenerate } from "./pipeline.js";

const reg = (globalThis.__bpGen ??= new Map());

export function startGeneration(slug, overwrite) {
  if (reg.get(slug)?.running) throw Object.assign(new Error("generation already running for this slug"), { status: 409 });
  const st = { running: true, buffer: [], listeners: new Set() };
  reg.set(slug, st);
  const push = (m) => { st.buffer.push(m); for (const fn of st.listeners) fn(m); };
  doGenerate({ slug, overwrite, log: push })
    .then(() => push("__DONE__"))
    .catch((e) => push("__ERROR__:" + e.message))
    .finally(() => { st.running = false; setTimeout(() => { if (reg.get(slug) === st) reg.delete(slug); }, 60000); });
}

export const getGeneration = (slug) => reg.get(slug);
