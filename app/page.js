import Link from "next/link";
import { listJobs } from "@/lib/pipeline.js";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";
const STEP = { fetched: "review", approved: "generate", done: "result" };

export default function Dashboard() {
  const jobs = listJobs();
  return (
    <div className="" style={{}}>
      <div className="row between" style={{ marginBottom: 28 }}>
        <div>
          <h1>Dashboard</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            {jobs.length} post{jobs.length === 1 ? "" : "s"} in the pipeline
          </p>
        </div>
        <Link className="btn" href="/new">
          ✦ New post
        </Link>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {jobs.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 36,
                marginBottom: 12,
                opacity: 0.3,
              }}
            >
              ◈
            </div>
            <p
              className="sub"
              style={{ margin: 0, fontSize: 15 }}
            >
              Nothing yet. Start with a competitor link and a target title.
            </p>
            <Link
              className="btn"
              href="/new"
              style={{ marginTop: 20, display: "inline-flex" }}
            >
               Create first post
            </Link>
          </div>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Title</th>
                <th>Status</th>
                <th className="col-words">Words</th>
                <th className="col-fetched">Fetched</th>
                <th style={{ paddingRight: 24, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.slug}>
                  <td style={{ paddingLeft: 24 }}>
                    <Link
                      href={`/jobs/${j.slug}/${STEP[j.status]}`}
                      style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={j.title}
                    >
                      {j.title}
                    </Link>
                    <div
                      className="sub"
                      style={{ margin: 0, fontSize: 12, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {j.slug}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className={`badge ${j.status}`}>{j.status}</span>
                  </td>
                  <td className="col-words" style={{ color: "var(--color-muted)" }}>
                    {j.words ?? "—"}
                  </td>
                  <td className="col-fetched" style={{ color: "var(--color-muted)", fontSize: 13, whiteSpace: "nowrap" }}>
                    {new Date(j.fetchedAt).toLocaleString()}
                  </td>
                  <td style={{ paddingRight: 24 }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexWrap: "nowrap" }}>
                      <Link
                        className="btn ghost"
                        href={`/jobs/${j.slug}/${STEP[j.status]}`}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        Open
                      </Link>
                      <DeleteButton slug={j.slug} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
