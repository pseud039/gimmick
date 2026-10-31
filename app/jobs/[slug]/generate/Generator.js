"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";

export default function Generator({ slug, hasOutput, blocked }) {
  const router = useRouter();
  const [state, setState] = useState("idle"); // idle | running | done | error
  const [lines, setLines] = useState([]);
  const [err, setErr] = useState("");
  const [overwrite, setOverwrite] = useState(hasOutput);
  const es = useRef(null);
  const box = useRef(null);

  function listen() {
    es.current?.close();
    const s = new EventSource(`/api/generate/${slug}/stream`);
    es.current = s;
    s.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m === "__NO_ACTIVE_JOB__") {
        s.close();
        setState((x) => (x === "running" ? "idle" : x));
        return;
      }
      setState("running");
      if (m === "__DONE__") {
        s.close();
        setState("done");
        setTimeout(() => router.push(`/jobs/${slug}/result`), 700);
        return;
      }
      if (String(m).startsWith("__ERROR__:")) {
        s.close();
        setErr(m.slice(10));
        setState("error");
        return;
      }
      setLines((l) => [...l, m]);
    };
    s.onerror = () => {
      s.close();
      setState((x) => (x === "running" ? "error" : x));
      setErr(
        (e) => e || "Lost connection to the server. Refresh to re-attach."
      );
    };
  }

  useEffect(() => {
    listen();
    return () => es.current?.close();
  }, [slug]);

  useEffect(() => {
    box.current && (box.current.scrollTop = box.current.scrollHeight);
  }, [lines]);

  async function start() {
    setErr("");
    setLines([]);
    setState("running");
    try {
      await api("POST", "/api/generate", { slug, overwrite });
      listen();
    } catch (e) {
      setErr(e.message);
      setState("error");
    }
  }

  const running = state === "running";

  return (
    <>
      <div className="card">
        {hasOutput && !running && (
          <label
            className="row"
            style={{ margin: "0 0 16px", color: "var(--color-text)", cursor: "pointer", gap: 10 }}
          >
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            Output already exists — overwrite it
          </label>
        )}
        <div className="log" ref={box}>
          {lines.length ? lines.join("\n") : "Ready. Press Generate."}
          {running && "\n…"}
        </div>
        {err && <div className="msg err">{err}</div>}
        {state === "done" && (
          <div className="msg ok">✓ Done. Opening result…</div>
        )}
      </div>

      <div className="actions">
        <Link
          className="btn ghost"
          href={`/jobs/${slug}/review`}
          aria-disabled={running}
        >
          ← Back to review
        </Link>
        <div className="row">
          {hasOutput && !running && (
            <Link className="btn ghost" href={`/jobs/${slug}/result`}>
              View existing result
            </Link>
          )}
          <button
            className="btn"
            disabled={running || blocked || (hasOutput && !overwrite)}
            onClick={start}
          >
            {running
              ? "Generating…"
              : state === "error"
              ? "↻ Retry"
              : "Generate ✦"}
          </button>
        </div>
      </div>
    </>
  );
}
