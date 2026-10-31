"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function FactForm({ initial }) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [msg, setMsg] = useState(null);

  async function save() {
    try {
      await api("PUT", "/api/factsheet", { content: v });
      setSaved(v);
      setMsg({ t: "ok", m: "Fact sheet saved." });
    } catch (e) {
      setMsg({ t: "err", m: e.message });
    }
  }

  const dirty = v !== saved;

  return (
    <div className="card">
      <textarea
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          setMsg(null);
        }}
        style={{ minHeight: 480 }}
        placeholder="Add company facts, tone guidelines, key keywords, etc."
      />
      {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}
      <div className="actions">
        <button
          className="btn ghost"
          disabled={!dirty}
          onClick={() => setV(saved)}
        >
          Discard changes
        </button>
        <button className="btn" disabled={!dirty} onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}
