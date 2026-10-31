import path from "node:path";
import { isValidSlug } from "./util.js";

const ROOT = process.cwd();
export const WORK = path.resolve(ROOT, process.env.WORK_DIR || "work");
export const OUT = path.resolve(ROOT, process.env.OUT_DIR || "out");
export const TEMPLATE = path.join(ROOT, "template.html");
export const FACTS = path.join(ROOT, "fact-sheet.md");
export const ENV_FILE = path.join(ROOT, ".env");

// Every slug that reaches the filesystem goes through here (blocks ../ tricks).
export function checkSlug(slug) {
  if (typeof slug !== "string" || !isValidSlug(slug)) throw new Error("invalid slug (a-z, 0-9, hyphens only)");
  return slug;
}
export const jobDir = (slug) => path.join(WORK, checkSlug(slug));
export const outFile = (slug) => path.join(OUT, "blogs", checkSlug(slug), "index.html");
