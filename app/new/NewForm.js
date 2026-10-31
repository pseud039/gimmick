"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");

export default function NewForm({ job }) {
  const router = useRouter();
  const [title, setTitle] = useState(job?.title || "");
  const [mode, setMode] = useState(job?.via === "file" ? "paste" : "url");
  const [url, setUrl] = useState(job?.url || "");
  const [paste, setPaste] = useState(job?.source || "");
  const [slug, setSlug] = useState(job?.slug || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const finalSlug = job?.slug || slug || slugify(title);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api("POST", "/api/fetch", {
        title,
        slug: finalSlug,
        url: url || undefined,
        pastedText: mode === "paste" ? paste : undefined,
      });
      router.push(`/jobs/${finalSlug}/review`);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div style={{ display: "grid", gap: 2 }}>
        <label>Target blog title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Place of Supply Errors in GST Billing"
          required
        />
      </div>

      <div style={{ display: "grid", gap: 2 }}>
        <label>
          URL slug{" "}
          {job && (
            <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>
              (locked for existing post)
            </span>
          )}
        </label>
        <input
          value={finalSlug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={!!job}
          placeholder="auto from title"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          style={job ? { opacity: 0.5 } : {}}
        />
      </div>

      <div className="tabs mt">
        <button
          type="button"
          className={mode === "url" ? "on" : ""}
          onClick={() => setMode("url")}
        >
          Fetch from URL
        </button>
        <button
          type="button"
          className={mode === "paste" ? "on" : ""}
          onClick={() => setMode("paste")}
        >
          Paste text
        </button>
      </div>

      {mode === "url" ? (
        <div style={{ display: "grid", gap: 2 }}>
          <label>Competitor / sample article URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.example.com/blog/..."
            required={mode === "url"}
          />
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-muted)" }}>
            Only this one page will be fetched.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 2 }}>
          <label>Article text</label>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--color-muted)" }}>
            Use <code style={{ background: "var(--color-surface-2)", padding: "1px 5px", borderRadius: 4 }}>## </code> before headings
          </p>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            required={mode === "paste"}
          />
        </div>
      )}

      {err && <div className="msg err">{err}</div>}

      <div className="actions">
        <Link className="btn ghost" href={job ? `/jobs/${job.slug}/review` : "/"}>
          ← {job ? "Back to review" : "Cancel"}
        </Link>
        <button
          className="btn"
          disabled={busy || !title.trim() || !finalSlug}
        >
          {busy
            ? "Fetching…"
            : job
            ? "Re-fetch & continue →"
            : "Fetch & continue →"}
        </button>
      </div>
    </form>
  );
}
