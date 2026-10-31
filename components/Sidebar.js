"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  [
    "Workspace",
    [
      ["/", "Dashboard", "⊞"],
      ["/new", "New Post", "✦"],
    ],
  ],
  [
    "Config",
    [
      ["/template", "Template", "⬡"],
      ["/factsheet", "Fact Sheet", "◈"],
      ["/settings", "Settings", "⚙"],
    ],
  ],
];

export default function Sidebar() {
  const p = usePathname();
  if (p === "/login") return null;
  const on = (h) =>
    (h === "/" ? p === "/" : p.startsWith(h)) ||
    (h === "/new" && p.startsWith("/jobs"));

  return (
    <aside>
      <div className="logo">
        Blog·Pipeline
        <small>Hitech Billsoft · SEO</small>
      </div>
      <nav>
        {LINKS.map(([label, items]) => (
          <div key={label} style={{ display: "contents" }}>
            <div className="lbl">{label}</div>
            {items.map(([h, t, icon]) => (
              <Link key={h} href={h} className={on(h) ? "on" : ""}>
                <span style={{ fontSize: 13, opacity: 0.75 }}>{icon}</span>
                {t}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
