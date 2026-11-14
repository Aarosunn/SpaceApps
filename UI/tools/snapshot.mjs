// Archive one UI iteration: static export -> screenshots -> pixel diff vs Figma -> iterations/index.json
// Usage: node snapshot.mjs <iter-number> ["note"]
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const here = path.dirname(fileURLToPath(import.meta.url));
const UI = path.resolve(here, "..");
const APP = path.resolve(UI, "../EarthFM");
const n = Number(process.argv[2]);
const note = process.argv[3] || "";
if (!n) throw new Error("usage: node snapshot.mjs <iter-number> [note]");
const id = `iter-${String(n).padStart(2, "0")}`;
const dir = path.join(UI, "iterations", id);
const base = `/iterations/${id}/site`;
const screens = JSON.parse(fs.readFileSync(path.join(UI, "reference/screens.json"), "utf8"));

// 1. static export with a base path so it can be served from UI/
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(path.join(dir, "shots"), { recursive: true });
fs.mkdirSync(path.join(dir, "diff"), { recursive: true });
execSync("npx next build", { cwd: APP, stdio: "inherit", env: { ...process.env, EXPORT: "1", NEXT_PUBLIC_BASE_PATH: base } });
fs.cpSync(path.join(APP, "out"), path.join(dir, "site"), { recursive: true });

// 2. serve UI/ and screenshot every screen at 1440x900
const port = 8790 + (n % 100);
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { cwd: UI, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
// ponytail: pinned to the Chromium build the Playwright MCP installed; update if that cache changes.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || `${process.env.HOME}/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome` });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const result = { id, n, note, time: new Date().toISOString(), screens: {} };
try {
  for (const s of screens) {
    await page.goto(`http://127.0.0.1:${port}${base}/screens/${s.slug}/`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
    });
    const shot = path.join(dir, "shots", `${s.slug}.png`);
    await page.screenshot({ path: shot });

    // 3. pixel diff vs Figma reference (threshold 0.1 = pixelmatch default sensitivity)
    const a = PNG.sync.read(fs.readFileSync(path.join(UI, "reference", `${s.slug}.png`)));
    const b = PNG.sync.read(fs.readFileSync(shot));
    const out = new PNG({ width: a.width, height: a.height });
    const bad = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0.1, alpha: 0.25 });
    fs.writeFileSync(path.join(dir, "diff", `${s.slug}.png`), PNG.sync.write(out));
    result.screens[s.slug] = { diffPct: +((100 * bad) / (a.width * a.height)).toFixed(2) };
    console.log(`${s.slug.padEnd(24)} diff ${result.screens[s.slug].diffPct}%`);
  }
} finally {
  await browser.close();
  server.kill();
}

// 4. record (review scores are merged in later by review results)
fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(result, null, 2));
const idxPath = path.join(UI, "iterations", "index.json");
const idx = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, "utf8")) : { screens, iterations: [] };
idx.screens = screens;
idx.iterations = idx.iterations.filter((it) => it.id !== id).concat({ id, n, note, time: result.time }).sort((x, y) => x.n - y.n);
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
console.log(`saved ${id}`);
