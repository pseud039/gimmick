import fs from "node:fs";
import FactForm from "./FactForm";
import { FACTS } from "@/lib/paths.js";

export const dynamic = "force-dynamic";

export default function FactPage() {
  return (<><h1>Fact Sheet</h1><p className="sub">The writer may state ONLY these product facts. Anything not listed is not claimed.</p>
    <FactForm initial={fs.existsSync(FACTS) ? fs.readFileSync(FACTS, "utf8") : ""} /></>);
}
