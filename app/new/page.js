import NewForm from "./NewForm";
import Stepper from "@/components/Stepper";
import { getJob } from "@/lib/pipeline.js";
import { isValidSlug } from "@/lib/util.js";

export const dynamic = "force-dynamic";

export default function NewPage({ searchParams }) {
  const slug = isValidSlug(searchParams.slug || "") ? searchParams.slug : null;
  const job = slug ? getJob(slug, { full: true }) : null;
  const reached = !job ? 0 : job.status === "done" ? 4 : job.approved ? 3 : 2;
  return (
    <>
      <h1>{job ? "Edit source" : "New post"}</h1>
      <p className="sub">Step 1: give the target title and ONE source (a competitor URL, or pasted text).</p>
      <Stepper slug={slug} current={1} reached={reached} />
      <NewForm job={job && { slug: job.slug, title: job.title, url: job.url || "", via: job.via, source: job.via === "file" ? job.source : "" }} />
    </>
  );
}
