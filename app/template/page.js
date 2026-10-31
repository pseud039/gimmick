import fs from "node:fs";
import TemplateForm from "./TemplateForm";
import { TEMPLATE } from "@/lib/paths.js";

export const dynamic = "force-dynamic";

export default function TemplatePage() {
  const html = fs.existsSync(TEMPLATE) ? fs.readFileSync(TEMPLATE, "utf8") : null;
  const info = html && { size: html.length, placeholders: [...new Set(html.match(/\{\{[A-Z_]+\}\}/g) || [])] };
  return (<><h1>Template</h1><p className="sub">Upload one published blog page; only the content slots become placeholders, everything else stays frozen.</p><TemplateForm info={info} /></>);
}
