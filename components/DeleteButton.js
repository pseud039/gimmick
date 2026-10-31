"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function DeleteButton({ slug }) {
  const router = useRouter();
  return (
    <button className="btn danger" onClick={async () => {
      if (!confirm(`Delete work files for "${slug}"? The generated page in out/ is kept.`)) return;
      try { await api("DELETE", `/api/jobs/${slug}`); router.push("/"); router.refresh(); } catch (e) { alert(e.message); }
    }}>Delete</button>
  );
}
