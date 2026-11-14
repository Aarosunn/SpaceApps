// Merge reviewer JSON files into an iteration's result.json and apply the pass rule.
// Pass rule (skeptic rule: a raw 90 is treated as ~60): diff <= 3% AND every reviewer score >= 97.
// Usage: node merge-reviews.mjs <iter-number>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const UI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const id = `iter-${String(process.argv[2]).padStart(2, "0")}`;
const dir = path.join(UI, "iterations", id);
const res = JSON.parse(fs.readFileSync(path.join(dir, "result.json"), "utf8"));
const revDir = path.join(dir, "reviews");
for (const f of fs.existsSync(revDir) ? fs.readdirSync(revDir) : []) {
  if (!f.endsWith(".json")) continue;
  const r = JSON.parse(fs.readFileSync(path.join(revDir, f), "utf8"));
  const sc = (res.screens[r.slug] ||= {});
  const reviewer = f.replace(/^.*__/, "").replace(/\.json$/, "") || "reviewer";
  (sc.reviews ||= {})[reviewer] = r;
}
for (const [slug, sc] of Object.entries(res.screens)) {
  const rs = Object.values(sc.reviews || {});
  if (!rs.length) continue;
  const min = Math.min(...rs.map((r) => r.score));
  sc.review = { score: min, model: Object.keys(sc.reviews).join(" + "), notes: rs.map((r) => `${r.notes}\n` + r.issues.map((i) => `- [${i.severity}] ${i.region}: ${i.problem} -> ${i.fix}`).join("\n")).join("\n\n") };
  sc.pass = sc.diffPct <= 3 && rs.every((r) => r.score >= 97);
  console.log(`${slug.padEnd(24)} diff ${sc.diffPct}%  review(min) ${min}  ${sc.pass ? "PASS" : "not yet"}`);
}
fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(res, null, 2));
