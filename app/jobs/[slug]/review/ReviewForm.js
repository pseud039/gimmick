"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";

export default function ReviewForm({ job }) {
  const router = useRouter();
  const [text, setText] = useState(job.source);
  const [edit, setEdit] = useState(false);
  const [stats, setStats] = useState(job.stats);
  const [approved, setApproved] = useState(job.approved);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const dirty = text !== job.source && edit;

  async function saveEdit() {
    setBusy("save");
    setErr("");
    try {
      setStats(await api("PUT", `/api/jobs/${job.slug}/source`, { text }));
      setApproved(false);
      setEdit(false);
      router.refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function approve() {
    setBusy("approve");
    setErr("");
    try {
      await api("POST", "/api/approve", { slug: job.slug });
      router.push(`/jobs/${job.slug}/generate`);
    } catch (e) {
      setErr(e.message);
      setBusy("");
    }
  }

  return (
    <>
      {/* Stats card */}
      <div className="card">
        <div className="stats">
          <div>
            <b>{stats.words}</b>words
          </div>
          <div>
            <b>{stats.chars}</b>chars
          </div>
          <div>
            <b>{stats.headings.length}</b>headings
          </div>
          <div>
            <b
              style={{
                color: approved ? "var(--color-green)" : "var(--color-yellow)",
              }}
            >
              {approved ? "✓ Approved" : "Pending"}
            </b>
            status
          </div>
        </div>

        {stats.warning && (
          <div className="msg warn" style={{ marginTop: 16 }}>
            ⚠ {stats.warning} Use "Edit source" below or go Back and paste the text.
          </div>
        )}

        {stats.headings.length > 0 && (
          <ul className="h" style={{ marginTop: 14 }}>
            {stats.headings.slice(0, 12).map((h, i) => (
              <li key={i}>{h.replace(/^## /, "")}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Source card */}
      <div className="card">
        <div className="row between">
          <strong>Source text</strong>
          <button
            className="btn ghost"
            style={{ fontSize: 13 }}
            onClick={() => {
              setEdit(!edit);
              if (edit) setText(job.source);
            }}
          >
            {edit ? "✕ Cancel edit" : "Edit source"}
          </button>
        </div>

        <div className="mt">
          {edit ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ minHeight: 420 }}
            />
          ) : (
            <pre className="src">{text}</pre>
          )}
        </div>

        {edit && (
          <div className="row mt">
            <button
              className="btn"
              disabled={!dirty || !!busy}
              onClick={saveEdit}
            >
              {busy === "save" ? "Saving…" : "Save (needs re-approval)"}
            </button>
          </div>
        )}
      </div>

      {err && <div className="msg err">{err}</div>}

      <div className="actions">
        <Link className="btn ghost" href={`/new?slug=${job.slug}`}>
          ← Back to source
        </Link>
        {approved ? (
          <Link className="btn" href={`/jobs/${job.slug}/generate`}>
            Continue →
          </Link>
        ) : (
          <button
            className="btn"
            disabled={!!busy || edit}
            onClick={approve}
          >
            {busy === "approve" ? "Approving…" : "Approve & continue →"}
          </button>
        )}
      </div>
    </>
  );
}
