/* EarthFM 30-second demo. Every app shot is real footage of the running app (capture/capture.mjs), with the app's own
   audio. Titles, captions, transitions and sound effects are added here. English captions are burned in. */
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadMono } from "@remotion/google-fonts/DMMono";

const { fontFamily: SANS } = loadGeist("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
const { fontFamily: MONO } = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const FPS = 30;
export const TOTAL_SECONDS = 29.9; // under the 30-second limit even after audio padding
const f = (sec: number) => Math.round(sec * FPS);

const INK = "#0d140f", PANEL = "#17201a", PAPER = "#f4f1e8", LIME = "#d8f07a", CORAL = "#e0603f", SEA = "#7ad7f0", FIRE = "#ff9a3c", HEAT = "#ff5d73";

/* ---- the edit: [start in the video, length, clip, start in the clip, zoom target, accent] ---- */
type Shot = { at: number; len: number; clip: "globe" | "game" | "keys"; src: number; zoom: [ox: number, oy: number, from: number, to: number]; accent: string };
const SHOTS: Shot[] = [
  { at: 2.8, len: 4.0, clip: "globe", src: 0.9, zoom: [72, 70, 1.0, 1.12], accent: SEA }, // click the ocean: water mallets + ripples
  { at: 6.8, len: 2.6, clip: "globe", src: 11.65, zoom: [62, 48, 1.12, 1.2], accent: LIME }, // the plane flies to the next place
  { at: 9.4, len: 3.2, clip: "globe", src: 21.0, zoom: [40, 60, 1.02, 1.1], accent: FIRE }, // same place as wildfires
  { at: 12.6, len: 2.4, clip: "globe", src: 30.7, zoom: [55, 62, 1.05, 1.15], accent: HEAT }, // and as global heat
  { at: 15.0, len: 2.2, clip: "game", src: 8.77, zoom: [50, 30, 1.0, 1.14], accent: LIME }, // the mystery record spins
  { at: 17.2, len: 4.2, clip: "game", src: 11.9, zoom: [50, 32, 1.06, 1.0], accent: LIME }, // answer, confetti, reveal
];
const CUTS_WITH_WIPE = [15.0, 21.4, 25.6]; // section changes
const ACCESS = { at: 21.4, len: 4.2 };
const END = { at: 25.6, len: 4.3 };

/* ---- burned-in English captions ---- */
const CAPTIONS: { at: number; to: number; text: string; hi?: string }[] = [
  { at: 2.9, to: 4.7, text: "Click anywhere on Earth.", hi: "anywhere" },
  { at: 4.7, to: 6.8, text: "NASA data plays as music, live.", hi: "music" },
  { at: 6.8, to: 9.4, text: "Build a route and fly between places.", hi: "fly" },
  { at: 9.4, to: 12.6, text: "Wildfires crackle and pluck…", hi: "Wildfires" },
  { at: 12.6, to: 15.0, text: "…global heat swells like brass.", hi: "heat" },
  { at: 15.0, to: 17.2, text: "Then test your ear: guess the mystery sound.", hi: "mystery" },
  { at: 17.2, to: 21.4, text: "Every answer is real NASA data.", hi: "real" },
  { at: 21.5, to: 25.6, text: "No mouse, no sight needed: keys, voice, captions.", hi: "voice" },
];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function Background() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 700px at ${50 + drift / 20}% 20%, #22301f 0%, ${INK} 62%)` }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)`, backgroundSize: "64px 64px", transform: `translateY(${(frame * 0.4) % 64}px)` }} />
    </AbsoluteFill>
  );
}

/* Animated bars: a waveform motif used in the hook and the end card. */
function Bars({ count, height, color, speed = 1, grow = 1 }: { count: number; height: number; color: string; speed?: number; grow?: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, height }}>
      {Array.from({ length: count }, (_, i) => {
        const h = (0.25 + 0.75 * Math.abs(Math.sin(frame * 0.11 * speed + i * 0.55) * Math.cos(frame * 0.045 * speed + i * 0.23))) * height * grow;
        return <div key={i} style={{ width: 16, height: h, borderRadius: 8, background: color, opacity: 0.35 + 0.65 * (h / height) }} />;
      })}
    </div>
  );
}

function Hook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines: [string, string, number][] = [["What does a", PAPER, 4], ["warming planet", LIME, 22], ["sound like?", PAPER, 44]];
  const out = interpolate(frame, [f(2.55), f(2.8)], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: INK, alignItems: "center", justifyContent: "center", transform: `scale(${1 + out * 0.5})`, opacity: 1 - out * 0.3 }}>
      <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 60, opacity: 0.5 }}>
        <Bars count={56} height={360} color={LIME} grow={interpolate(frame, [0, f(2.6)], [0.15, 1], clamp)} speed={1.6} />
      </AbsoluteFill>
      <div style={{ textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 150, lineHeight: 1.04, letterSpacing: -4 }}>
        {lines.map(([text, color, at]) => {
          const p = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 170 } });
          return (
            <div key={text} style={{ color, opacity: p, transform: `translateY(${(1 - p) * 70}px) scale(${0.85 + 0.15 * p})` }}>{text}</div>
          );
        })}
      </div>
      <AbsoluteFill style={{ background: "#fff", opacity: interpolate(frame, [f(2.66), f(2.8)], [0, 0.9], clamp) }} />
    </AbsoluteFill>
  );
}

/* A real app clip in a rounded window, with a slow push-in towards where the action is. */
function AppShot({ shot }: { shot: Shot }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = f(shot.len);
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 220 } });
  const [ox, oy, z0, z1] = shot.zoom;
  const zoom = interpolate(frame, [0, len], [z0, z1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const vol = (fr: number) => interpolate(fr, [0, 5, len - 5, len], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 224, top: 28, width: 1472, height: 920, borderRadius: 28, overflow: "hidden", boxShadow: `0 0 0 3px ${shot.accent}, 0 30px 90px rgba(0,0,0,0.6), 0 0 120px ${shot.accent}33`, transform: `scale(${0.94 + 0.06 * enter})`, opacity: enter, background: PANEL }}>
        <OffthreadVideo src={staticFile(`clips/${shot.clip}.mp4`)} trimBefore={f(shot.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, transformOrigin: `${ox}% ${oy}%` }} />
      </div>
      <Audio src={staticFile(`clips/${shot.clip}-loud.wav`)} trimBefore={f(shot.src)} volume={vol} />
    </AbsoluteFill>
  );
}

function Caption() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = CAPTIONS.find((x) => frame >= f(x.at) && frame < f(x.to));
  if (!c) return null;
  const p = spring({ frame: frame - f(c.at), fps, config: { damping: 15, stiffness: 240 } });
  const out = interpolate(frame, [f(c.to) - 4, f(c.to)], [1, 0], clamp);
  const parts = c.hi ? c.text.split(c.hi) : [c.text];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 964, display: "flex", justifyContent: "center", opacity: p * out, transform: `translateY(${(1 - p) * 26}px)` }}>
      <div style={{ padding: "16px 34px", borderRadius: 22, background: "rgba(23,32,26,0.92)", border: "2px solid rgba(255,255,255,0.12)", fontFamily: SANS, fontWeight: 600, fontSize: 46, color: PAPER, letterSpacing: -0.5 }}>
        {parts[0]}
        {c.hi && <span style={{ color: LIME }}>{c.hi}</span>}
        {parts[1]}
      </div>
    </div>
  );
}

/* Lime wipe across the screen at a section change (centred on the cut). */
function Wipe() {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 14], [-130, 130], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}%) skewX(-12deg)`, background: `linear-gradient(90deg, transparent 0%, ${LIME} 18%, ${LIME} 82%, transparent 100%)` }} />
  );
}

function Access() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = f(ACCESS.len);
  const items: [string, string][] = [["Voice commands", SEA], ["Keyboard-only map", LIME], ["Captions + spoken descriptions", FIRE], ["Screen-reader ready", HEAT]];
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 200 } });
  const vol = (fr: number) => interpolate(fr, [0, 5, len - 5, len], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 96, top: 150, width: 720, fontFamily: SANS, color: PAPER }}>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: LIME, opacity: enter }}>Accessibility first</div>
        <div style={{ fontWeight: 800, fontSize: 92, lineHeight: 1.02, letterSpacing: -2.5, marginTop: 14, opacity: enter, transform: `translateX(${(1 - enter) * -50}px)` }}>Built for<br />everyone.</div>
        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 18 }}>
          {items.map(([label, color], i) => {
            const p = spring({ frame: frame - 10 - i * 9, fps, config: { damping: 14, stiffness: 190 } });
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 18, opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: color, boxShadow: `0 0 24px ${color}` }} />
                <div style={{ fontWeight: 600, fontSize: 42 }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 860, top: 170, width: 980, height: 612, borderRadius: 24, overflow: "hidden", boxShadow: `0 0 0 3px ${LIME}, 0 30px 90px rgba(0,0,0,0.6)`, transform: `scale(${0.92 + 0.08 * enter})`, opacity: enter, background: PANEL }}>
        <OffthreadVideo src={staticFile("clips/keys.mp4")} trimBefore={f(0.4)} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.12)", transformOrigin: "30% 70%" }} />
      </div>
      <div style={{ position: "absolute", left: 860, top: 806, width: 980, display: "flex", justifyContent: "center", gap: 14, opacity: enter }}>
        {["←", "↑", "→", "↓", "Enter"].map((k, i) => {
          const on = Math.floor(frame / 9) % 5 === i;
          return <div key={k} style={{ minWidth: 64, padding: "10px 18px", borderRadius: 14, textAlign: "center", fontFamily: MONO, fontSize: 30, color: on ? INK : PAPER, background: on ? LIME : "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.18)" }}>{k}</div>;
        })}
      </div>
      <Audio src={staticFile("clips/keys-loud.wav")} trimBefore={f(0.4)} volume={vol} />
    </AbsoluteFill>
  );
}

function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const b = spring({ frame: frame - 16, fps, config: { damping: 16, stiffness: 160 } });
  const c = spring({ frame: frame - 34, fps, config: { damping: 18, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: SANS, color: PAPER }}>
      <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 0, opacity: 0.22 }}>
        <Bars count={60} height={420} color={LIME} speed={0.8} />
      </AbsoluteFill>
      <div style={{ display: "flex", alignItems: "center", gap: 28, transform: `scale(${0.7 + 0.3 * a})`, opacity: a }}>
        <div style={{ width: 150, height: 150, borderRadius: 75, background: `repeating-radial-gradient(circle, #111 0 5px, #26262a 5px 9px)`, boxShadow: "0 0 0 4px #000, 0 20px 50px rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${frame * 5}deg)` }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: LIME, boxShadow: `inset 0 0 0 6px rgba(23,32,26,0.3)` }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 210, letterSpacing: -8, lineHeight: 1 }}>Earth<span style={{ color: LIME }}>FM</span></div>
      </div>
      <div style={{ fontWeight: 600, fontSize: 62, marginTop: 18, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>Hear the Earth.</div>
      <div style={{ marginTop: 46, textAlign: "center", fontFamily: MONO, fontSize: 28, lineHeight: 1.6, color: "rgba(244,241,232,0.82)", opacity: c }}>
        NASA Space Apps Challenge 2026 · The Earth Information Jukebox
        <br />
        Data: NASA Scientific Visualization Studio · Earth Information Center
        <br />
        All sound generated live from the data. No samples.
      </div>
    </AbsoluteFill>
  );
}

export function Demo() {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [f(TOTAL_SECONDS) - 12, f(TOTAL_SECONDS)], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: INK, opacity: fadeOut }}>
      <Background />

      <Sequence durationInFrames={f(2.8)}><Hook /></Sequence>
      {SHOTS.map((sh) => (
        <Sequence key={sh.at} from={f(sh.at)} durationInFrames={f(sh.len)}><AppShot shot={sh} /></Sequence>
      ))}
      <Sequence from={f(ACCESS.at)} durationInFrames={f(ACCESS.len)}><Access /></Sequence>
      <Sequence from={f(END.at)} durationInFrames={f(END.len)}><EndCard /></Sequence>

      <Caption />
      {CUTS_WITH_WIPE.map((t) => (
        <Sequence key={t} from={f(t) - 7} durationInFrames={14}><Wipe /></Sequence>
      ))}

      {/* sound effects (synthesised: capture/make_sfx.py) */}
      <Sequence from={f(0.15)}><Audio src={staticFile("sfx/riser.wav")} volume={0.55} /></Sequence>
      <Sequence from={f(2.74)}><Audio src={staticFile("sfx/impact.wav")} volume={0.8} /></Sequence>
      {[6.8, 9.4, 12.6].map((t) => (
        <Sequence key={t} from={f(t) - 5}><Audio src={staticFile("sfx/whoosh.wav")} volume={0.3} /></Sequence>
      ))}
      {CUTS_WITH_WIPE.map((t) => (
        <Sequence key={t} from={f(t) - 8}><Audio src={staticFile("sfx/whoosh.wav")} volume={0.55} /></Sequence>
      ))}
      {CAPTIONS.map((c) => (
        <Sequence key={c.at} from={f(c.at)}><Audio src={staticFile("sfx/pop.wav")} volume={0.28} /></Sequence>
      ))}
      <Sequence from={f(END.at) + 2}><Audio src={staticFile("sfx/endchord.wav")} volume={0.8} /></Sequence>

      {/* AI-use mark, on every frame */}
      <div style={{ position: "absolute", right: 28, bottom: 14, fontFamily: MONO, fontSize: 20, color: "rgba(244,241,232,0.55)" }}>Made with AI assistance</div>
    </AbsoluteFill>
  );
}
