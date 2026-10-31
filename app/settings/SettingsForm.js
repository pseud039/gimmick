"use client";
import { useState } from "react";
import { api } from "@/lib/client";

const FIELDS = [
  ["OPENROUTER_API_KEY", "OpenRouter API key", "sk-or-…", "password"],
  ["OPENROUTER_MODEL", "Model ID", "google/gemini-3-flash-preview", "text"],
  ["MAX_TOKENS", "Max output tokens", "12000", "number"],
  ["TARGET_WORDS", "Target words (article body)", "1400", "number"],
  ["SITE_URL", "Site URL", "https://billingsoftwareindia.in", "url"],
];

export default function SettingsForm({ init }) {
  const [v, setV] = useState(init);
  const [msg, setMsg] = useState(null);

  async function save(e) {
    e.preventDefault();
    try {
      await api("PUT", "/api/settings", v);
      setMsg({ t: "ok", m: "Settings saved successfully." });
    } catch (e2) {
      setMsg({ t: "err", m: e2.message });
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <div style={{ display: "grid", gap: 4 }}>
        {FIELDS.map(([k, label, ph, type]) => (
          <div key={k} style={{ display: "grid", gap: 2 }}>
            <label>{label}</label>
            <input
              value={v[k] ?? ""}
              placeholder={ph}
              onChange={(e) => setV({ ...v, [k]: e.target.value })}
              type={type}
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}

      <div className="actions">
        <span />
        <button className="btn">Save settings</button>
      </div>
    </form>
  );
}
