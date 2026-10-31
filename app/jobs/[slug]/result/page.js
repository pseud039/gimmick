import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Stepper from "@/components/Stepper";
import DeleteButton from "@/components/DeleteButton";
import ResultTabs from "./ResultTabs";
import { getJob } from "@/lib/pipeline.js";
import { isValidSlug } from "@/lib/util.js";

export const dynamic = "force-dynamic";

export default function ResultPage({ params }) {
  const job = isValidSlug(params.slug) ? getJob(params.slug, { full: true }) : null;
  if (!job) notFound();
  if (!job.hasOut) redirect(`/jobs/${job.slug}/${job.approved ? "generate" : "review"}`);
  const s = job.strategy || {};
  return (
    <>
      <h1>{job.title}</h1>
      <p className="sub">Step 4: check the draft and the facts list, then publish out/blogs/{job.slug}/index.html.</p>
      <Stepper slug={job.slug} current={4} reached={4} />
      <div className="card"><div className="stats">
        <div><b>{job.words ?? "—"}</b>words</div>
        <div><b>{job.article?.primaryKeyword || s.primaryKeyword || "—"}</b>primary keyword</div>
        <div><b>{job.article?.faqs?.length ?? "—"}</b>FAQs</div>
      </div></div>
      <ResultTabs slug={job.slug} review={job.review || ""} />
      <div className="actions">
        <Link className="btn ghost" href={`/jobs/${job.slug}/generate`}>← Back (regenerate)</Link>
        <div className="row">
          <DeleteButton slug={job.slug} />
          <a className="btn ghost" href={`/api/jobs/${job.slug}/preview`} target="_blank">Open full page ↗</a>
          <a className="btn" href={`/api/jobs/${job.slug}/download`}>Download ZIP ↓</a>
        </div>
      </div>
    </>
  );
}
