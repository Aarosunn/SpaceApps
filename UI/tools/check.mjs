// Quick fidelity check for one screen against the running dev server (no archiving).
// Usage: node check.mjs <slug> [port=3000]  -> writes tmp/<slug>.png + tmp/<slug>-diff.png, prints diff %
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const here = path.dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
const port = process.argv[3] || 3000;
if (!slug) throw new Error("usage: node check.mjs <slug> [port]");
fs.mkdirSync(path.join(here, "tmp"), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || `${process.env.HOME}/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome` });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${port}/screens/${slug}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
  });
  // hide the Next.js dev indicator so it does not pollute the diff
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const shot = path.join(here, "tmp", `${slug}.png`);
  await page.screenshot({ path: shot });
  const a = PNG.sync.read(fs.readFileSync(path.join(here, "..", "reference", `${slug}.png`)));
  const b = PNG.sync.read(fs.readFileSync(shot));
  const out = new PNG({ width: a.width, height: a.height });
  const bad = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0.1, alpha: 0.25 });
  fs.writeFileSync(path.join(here, "tmp", `${slug}-diff.png`), PNG.sync.write(out));
  console.log(`${slug}: diff ${((100 * bad) / (a.width * a.height)).toFixed(2)}%  shot=${shot}`);
} finally {
  await browser.close();
}
