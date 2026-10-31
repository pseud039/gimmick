"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function TemplateForm({ info }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (file) {
        const fd = new FormData();
        fd.append("html", file);
        const r = await fetch("/api/template", { method: "POST", body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
      } else {
        await api("POST", "/api/template", { htmlText: text });
      }
      setMsg({ t: "ok", m: "Template saved." });
      router.refresh();
    } catch (e2) {
      setMsg({ t: "err", m: e2.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        {info ? (
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                Template size
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{info.size}</div>
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>characters</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                Placeholders
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                {info.placeholders.map((p) => (
                  <code
                    key={p}
                    style={{
                      background: "var(--color-surface-2)",
                      padding: "2px 8px",
                      borderRadius: 5,
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-accent)",
                    }}
                  >
                    {p}
                  </code>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-yellow)" }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <span>No template uploaded yet. Upload one below to get started.</span>
          </div>
        )}
      </div>

      <form className="card" onSubmit={submit}>
        <div style={{ display: "grid", gap: 2 }}>
          <label>Upload HTML file</label>
          <input
            type="file"
            accept=".html,text/html"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "16px 0",
            color: "var(--color-muted)",
            fontSize: 13,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          or paste HTML
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        </div>

        <div style={{ display: "grid", gap: 2 }}>
          <label>HTML content</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!!file}
            placeholder="<!DOCTYPE html>…"
            style={file ? { opacity: 0.4 } : {}}
          />
        </div>

        {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}

        <div className="actions">
          <span />
          <button className="btn" disabled={busy || (!file && !text.trim())}>
            {busy ? "Converting…" : "Convert & save"}
          </button>
        </div>
      </form>
    </>
  );
}
