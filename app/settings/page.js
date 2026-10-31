import SettingsForm from "./SettingsForm";
import { EDITABLE } from "@/lib/env.js";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const init = Object.fromEntries(EDITABLE.map((k) => [k, k === "OPENROUTER_API_KEY" ? (process.env[k] ? process.env[k].slice(0, 8) + "…" : "") : process.env[k] || ""]));
  return (<><h1>Settings</h1><p className="sub">Saved to .env and applied immediately.</p><SettingsForm init={init} /></>);
}
