"use client";
import { useState } from "react";

export default function ResultTabs({ slug, review }) {
  const [tab, setTab] = useState("preview");
  return (
    <div className="card">
      <div className="tabs">
        <button
          className={tab === "preview" ? "on" : ""}
          onClick={() => setTab("preview")}
        >
          Preview
        </button>
        <button
          className={tab === "review" ? "on" : ""}
          onClick={() => setTab("review")}
        >
          Review checklist
        </button>
      </div>
      {tab === "preview" ? (
        <iframe
          src={`/api/jobs/${slug}/preview`}
          title="preview"
          sandbox="allow-same-origin allow-popups allow-forms"
        />
      ) : (
        <pre className="src">{review || "No review.md yet."}</pre>
      )}
    </div>
  );
}
