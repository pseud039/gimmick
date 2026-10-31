import Link from "next/link";

// current: 1..4, reached: furthest step the job has earned (you can jump back to any step up to it)
export default function Stepper({ slug, current, reached }) {
  const steps = [
    ["Source", slug ? `/new?slug=${slug}` : "/new"],
    ["Review", `/jobs/${slug}/review`],
    ["Generate", `/jobs/${slug}/generate`],
    ["Result", `/jobs/${slug}/result`],
  ];

  return (
    <div className="steps">
      {steps.map(([name, href], i) => {
        const n = i + 1;
        const cls =
          n === current
            ? "cur"
            : n < current || n <= reached
            ? "done"
            : "off";
        return (
          <Link key={name} href={href} className={`step ${cls}`}>
            <b>{n < current ? "✓" : n}</b>
            {name}
          </Link>
        );
      })}
    </div>
  );
}
