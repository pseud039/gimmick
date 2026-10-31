import { notFound } from "next/navigation";
import Stepper from "@/components/Stepper";
import ReviewForm from "./ReviewForm";
import { getJob } from "@/lib/pipeline.js";
import { isValidSlug } from "@/lib/util.js";

export const dynamic = "force-dynamic";

export default function ReviewPage({ params }) {
  const job = isValidSlug(params.slug) ? getJob(params.slug, { full: true }) : null;
  if (!job) notFound();
  const reached = job.status === "done" ? 4 : job.approved ? 3 : 2;
  return (
    <>
      <h1>{job.title}</h1>
      <p className="sub">Step 2: read the source. Nothing reaches the LLM until you approve it.</p>
      <Stepper slug={job.slug} current={2} reached={reached} />
      <ReviewForm job={{ slug: job.slug, approved: job.approved, source: job.source, stats: job.sourceStats }} />
    </>
  );
}
