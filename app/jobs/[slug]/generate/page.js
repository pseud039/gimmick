import fs from "node:fs";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Stepper from "@/components/Stepper";
import Generator from "./Generator";
import { getJob } from "@/lib/pipeline.js";
import { TEMPLATE, FACTS } from "@/lib/paths.js";
import { isValidSlug } from "@/lib/util.js";

export const dynamic = "force-dynamic";

export default function GeneratePage({ params }) {
  const job = isValidSlug(params.slug) ? getJob(params.slug) : null;
  if (!job) notFound();
  if (!job.approved) redirect(`/jobs/${job.slug}/review`);
  const missing = [!fs.existsSync(TEMPLATE) && ["Template", "/template"], !fs.existsSync(FACTS) && ["Fact Sheet", "/factsheet"],
    !(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL) && ["API key / model", "/settings"]].filter(Boolean);
  return (
    <>
      <h1>{job.title}</h1>
      <p className="sub">Step 3: strategy → article → validation → render. Runs on the server; you can leave and come back.</p>
      <Stepper slug={job.slug} current={3} reached={job.status === "done" ? 4 : 3} />
      {missing.length > 0 && (
        <div className="msg warn" style={{ marginBottom: 14 }}>Before generating, set up: {missing.map(([n, h]) => <Link key={h} href={h} style={{ marginRight: 10 }}>{n}</Link>)}</div>
      )}
      <Generator slug={job.slug} hasOutput={job.hasOut} blocked={missing.length > 0} />
    </>
  );
}
