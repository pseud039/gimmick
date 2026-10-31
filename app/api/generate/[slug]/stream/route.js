export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { getGeneration } from "@/lib/generation.js";

export async function GET(req, { params }) {
  const st = getGeneration(params.slug);
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(ctrl) {
      const send = (m) => { try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(m)}\n\n`)); } catch {} };
      if (!st) { send("__NO_ACTIVE_JOB__"); ctrl.close(); return; }
      st.buffer.forEach(send); // replay so a page reload / Back-and-return catches up
      const finished = () => st.buffer.some((m) => m === "__DONE__" || String(m).startsWith("__ERROR__:"));
      if (finished()) { ctrl.close(); return; }
      const on = (m) => { send(m); if (m === "__DONE__" || String(m).startsWith("__ERROR__:")) { cleanup(); try { ctrl.close(); } catch {} } };
      st.listeners.add(on);
      const beat = setInterval(() => { try { ctrl.enqueue(enc.encode(": ping\n\n")); } catch {} }, 15000);
      cleanup = () => { st.listeners.delete(on); clearInterval(beat); };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
