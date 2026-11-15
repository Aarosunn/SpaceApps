// Records real footage + real audio of the running EarthFM app (http://localhost:3000) for the demo video.
// Video: Chrome screencast frames (JPEG, with timestamps) -> constant 30 fps MP4. Audio: the page's own Web Audio output,
// tapped before the speakers and recorded with MediaRecorder. A visible cursor is injected (headless Chrome draws none).
// Usage: node capture/capture.mjs <globe|game|keys>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, "../../UI/tools/package.json"));
const { chromium } = require("playwright");

const scene = process.argv[2];
const W = 1440, H = 900, DSF = 4 / 3; // 1920 x 1200 frames
const out = path.resolve(here, "../public/clips");
const tmp = path.resolve(here, "tmp", scene);
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || `${process.env.HOME}/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome`,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, reducedMotion: "no-preference" });
const page = await ctx.newPage();

await page.addInitScript(() => {
  // voice (text to speech) off for the recording: the headless browser has no voices anyway
  try { localStorage.setItem("earthfm-voice", "0"); } catch {}
  // tap everything that goes to the speakers
  const orig = AudioNode.prototype.connect;
  window.__recs = [];
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      const c = this.context;
      if (!c.__tap) {
        c.__tap = c.createMediaStreamDestination();
        const rec = new MediaRecorder(c.__tap.stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 256000 });
        const entry = { rec, chunks: [], start: 0 };
        rec.ondataavailable = (e) => entry.chunks.push(e.data);
        rec.onstart = () => (entry.start = Date.now() / 1000);
        rec.start(100);
        window.__recs.push(entry);
      }
      orig.call(this, c.__tap);
    }
    return orig.call(this, dest, ...rest);
  };
  window.__stopAudio = async () => {
    const outs = [];
    for (const e of window.__recs) {
      await new Promise((res) => { e.rec.onstop = res; e.rec.stop(); });
      const buf = new Uint8Array(await new Blob(e.chunks, { type: "audio/webm" }).arrayBuffer());
      let s = "";
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      outs.push({ start: e.start, b64: btoa(s), bytes: buf.length });
    }
    return outs;
  };
});

const url = scene === "game" ? "http://localhost:3000/play" : "http://localhost:3000/";
await page.goto(url, { waitUntil: "networkidle" });
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await page.evaluate(async () => {
  await document.fonts.ready;
  // visible cursor (the app's own pin) + a click ring
  const c = document.createElement("img");
  c.src = "/figma/pin-cursor.svg";
  c.style.cssText = "position:fixed;left:0;top:0;width:48px;height:48px;z-index:99999;pointer-events:none;transform:translate(-200px,-200px);filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))";
  document.body.appendChild(c);
  const st = document.createElement("style");
  st.textContent = "@keyframes capRing{from{transform:translate(-50%,-50%) scale(.3);opacity:.9}to{transform:translate(-50%,-50%) scale(1.6);opacity:0}}";
  document.head.appendChild(st);
  addEventListener("mousemove", (e) => (c.style.transform = `translate(${e.clientX - 15}px,${e.clientY - 9}px)`), true);
  addEventListener("mousedown", (e) => {
    const r = document.createElement("div");
    r.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:70px;height:70px;border-radius:50%;border:4px solid #d8f07a;z-index:99998;pointer-events:none;animation:capRing .5s ease-out forwards`;
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }, true);
});

// ---- screencast ----
const client = await ctx.newCDPSession(page);
const frames = [];
client.on("Page.screencastFrame", (f) => {
  const file = path.join(tmp, `f${String(frames.length).padStart(5, "0")}.jpg`);
  fs.writeFileSync(file, Buffer.from(f.data, "base64"));
  frames.push({ file, ts: f.metadata.timestamp });
  client.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await client.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1200, everyNthFrame: 1 });

const marks = {};
const t0 = Date.now() / 1000;
const mark = (name) => (marks[name] = +(Date.now() / 1000 - t0).toFixed(2));
const wait = (ms) => page.waitForTimeout(ms);
const glide = async (x, y, steps = 28) => page.mouse.move(x, y, { steps });
const click = async (x, y) => { await glide(x, y); await wait(150); await page.mouse.click(x, y); };

await page.mouse.move(720, 300);
await wait(400);

if (scene === "globe") {
  mark("start");
  await click(1010, 640); mark("clickOcean");            // Indian Ocean: sea heat, water mallets
  await wait(4300);
  await click(790, 455); mark("clickAfrica");             // Central Africa: second stop, route draws
  await wait(1500);
  await glide(618, 800, 30); await wait(150);
  await page.getByRole("button", { name: /Skip to next/ }).click(); mark("skip"); // plane flies there
  await wait(3600); mark("landed");
  await wait(2600);
  const box = page.getByPlaceholder("Search tracks or places");
  await glide(200, 48, 24); await box.click(); mark("typeStart");
  await box.pressSequentially("wildfires", { delay: 70 });
  await wait(250);
  await box.press("Enter"); mark("fires");                 // same place, fire instrument
  await glide(640, 330, 30);
  await wait(5200);
  await box.click();
  await box.pressSequentially("global heat", { delay: 60 });
  await box.press("Enter"); mark("heat");
  await glide(900, 300, 30);
  await wait(4500);
  mark("end");
} else if (scene === "game") {
  mark("start");
  await wait(600);
  const b = await page.getByRole("button", { name: "Start" }).boundingBox();
  await click(b.x + b.width / 2, b.y + b.height / 2); mark("startClicked");
  await wait(1300);
  const l = await page.getByRole("button", { name: /Listen/ }).boundingBox();
  await click(l.x + l.width / 2, l.y + l.height / 2); mark("listen");
  await page.waitForFunction(() => !!document.querySelector('[class*="armOn"]'), null, { timeout: 20000 }); mark("mystery");
  await page.waitForFunction(() => { const o = document.querySelector('button[class*="option"]'); return o && !o.disabled; }, null, { timeout: 20000 }); mark("choose");
  await wait(700);
  const o = await page.locator('button[class*="option"]').first().boundingBox();
  await click(o.x + o.width / 2, o.y + o.height / 2); mark("answer");
  await wait(4500);
  mark("end");
} else if (scene === "keys") {
  // audio navigation: Shift + arrows explore the map (the place is shown and spoken), Enter adds it
  mark("start");
  await page.mouse.move(5, 5);
  await wait(500);
  for (const k of ["Shift+ArrowLeft", "Shift+ArrowUp", "Shift+ArrowUp", "Shift+ArrowRight", "Shift+ArrowRight", "Shift+ArrowRight"]) { await page.keyboard.press(k); await wait(650); }
  mark("moved");
  await wait(700);
  await page.keyboard.press("Enter"); mark("enter");
  await wait(3500);
  mark("end");
}

await client.send("Page.stopScreencast");
const audio = await page.evaluate(() => window.__stopAudio());
await browser.close();

// ---- assemble: frames -> 30 fps mp4, audio -> wav aligned to the first frame ----
const first = frames[0].ts, last = frames[frames.length - 1].ts;
const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, (frames[i + 1]?.ts ?? last + 1 / 30) - f.ts).toFixed(4)}`).join("\n") + `\nfile '${frames[frames.length - 1].file}'\n`;
fs.writeFileSync(path.join(tmp, "list.txt"), list);
const mp4 = path.join(out, `${scene}.mp4`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"), "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "medium", mp4]);
let wav = null;
const a = audio.sort((x, y) => y.bytes - x.bytes)[0];
if (a && a.bytes > 1000) {
  fs.writeFileSync(path.join(tmp, "audio.webm"), Buffer.from(a.b64, "base64"));
  wav = path.join(out, `${scene}.wav`);
  const offset = a.start - first; // > 0: audio started after the first frame -> pad with silence; < 0: trim the head
  const filter = offset >= 0 ? `adelay=${Math.round(offset * 1000)}:all=1` : `atrim=start=${(-offset).toFixed(3)},asetpts=PTS-STARTPTS`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(tmp, "audio.webm"), "-af", filter, "-ar", "48000", "-ac", "2", wav]);
}
// marks were taken on the wall clock from t0; express them relative to the first frame
const rel = Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v + t0 - first).toFixed(2)]));
fs.writeFileSync(path.join(out, `${scene}.json`), JSON.stringify({ frames: frames.length, seconds: +(last - first).toFixed(2), marks: rel, audio: !!wav }, null, 1));
console.log(scene, "frames", frames.length, "seconds", (last - first).toFixed(1), "audio", a?.bytes ?? 0, JSON.stringify(rel));
fs.rmSync(tmp, { recursive: true, force: true });
