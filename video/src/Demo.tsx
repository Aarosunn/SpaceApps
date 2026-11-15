/* EarthFM 30-second demo. Every app shot is real footage of the running app (capture/capture.mjs), with the app's own
   audio. Look: the app's own paper-and-ink palette, slow dissolves, no flashy effects. English captions are burned in. */
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadMono } from "@remotion/google-fonts/DMMono";

const { fontFamily: SANS } = loadGeist("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
const { fontFamily: MONO } = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const FPS = 30;
export const TOTAL_SECONDS = 29.9; // under the 30-second limit even after audio padding
const f = (sec: number) => Math.round(sec * FPS);

// The app's own colours (EarthFM/app/globals.css)
const PAPER = "#f4f1e8", INK = "#17201a", MUTED = "#4a5148", LIME = "#d8f07a", LINE = "#d9d4c4";
const FADE = 10; // frames: every shot dissolves in and out

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.out(Easing.cubic);

/* Voice-over. Record it from SCRIPT.md, save it as public/vo.wav (or .mp3 and change the name below), then set
   VOICEOVER to true and render. The app's own sound drops to APP_GAIN under the voice. */
const VOICEOVER = false;
const VOICEOVER_FILE = "vo.wav";
const APP_GAIN = VOICEOVER ? 0.3 : 1;

/* ---- the edit: neighbouring shots overlap by 0.3 s, which is the dissolve ---- */
type Shot = { at: number; len: number; clip: "globe" | "game" | "keys"; src: number; zoom: [ox: number, oy: number, from: number, to: number] };
const HOOK = { at: 0, len: 2.9 };
const SHOTS: Shot[] = [
  { at: 2.6, len: 7.2, clip: "globe", src: 1.1, zoom: [55, 60, 1.0, 1.05] }, // click the ocean: the data plays, the map shows what is read
  { at: 9.5, len: 2.9, clip: "globe", src: 23.0, zoom: [50, 50, 1.0, 1.03] }, // the same place as wildfires
  { at: 12.1, len: 2.9, clip: "globe", src: 32.0, zoom: [50, 50, 1.0, 1.03] }, // and as global heat
  { at: 14.7, len: 6.1, clip: "game", src: 11.2, zoom: [50, 35, 1.0, 1.05] }, // the game: choose, answer, the NASA data behind it
];
const ACCESS = { at: 20.5, len: 5.3, src: 2.6 };
const END = { at: 25.5, len: 4.4 };

/* ---- burned-in English captions (the same words as the voice-over in SCRIPT.md) ---- */
const CAPTIONS: { at: number; to: number; text: string }[] = [
  { at: 2.9, to: 5.9, text: "Most climate data is made to be seen." },
  { at: 5.9, to: 9.6, text: "EarthFM turns NASA Earth data into music." },
  { at: 9.7, to: 14.8, text: "Sea temperature, wildfires, global heat: each has its own instrument." },
  { at: 14.9, to: 20.6, text: "A listening game trains your ear with real NASA numbers." },
  { at: 20.7, to: 25.5, text: "Built for blind and low-vision users: keyboard, voice, captions." },
];

/* Opacity of something that lives `len` frames: dissolve in, hold, dissolve out. */
const dissolve = (frame: number, len: number) => interpolate(frame, [0, FADE, len - FADE, len], [0, 1, 1, 0], clamp);
const rise = (frame: number, at: number) => interpolate(frame, [at, at + 16], [0, 1], { ...clamp, easing: ease });

function Hook() {
  const frame = useCurrentFrame();
  const len = f(HOOK.len);
  const a = rise(frame, 4), b = rise(frame, 16), c = rise(frame, 30);
  const line = (p: number): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * 18}px)` });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: interpolate(frame, [len - FADE, len], [1, 0], clamp) }}>
      <div style={{ position: "absolute", top: 70, fontFamily: MONO, fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: MUTED, opacity: a }}>EarthFM</div>
      <div style={{ textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 132, lineHeight: 1.12, letterSpacing: -3.5, color: INK }}>
        <div style={line(a)}>What does a</div>
        <div style={line(b)}>
          <span style={{ background: LIME, padding: "0 22px", borderRadius: 14 }}>warming planet</span>
        </div>
        <div style={line(c)}>sound like?</div>
      </div>
    </AbsoluteFill>
  );
}

/* A real app clip in a plain window, with a slow push-in. */
function AppShot({ shot }: { shot: Shot }) {
  const frame = useCurrentFrame();
  const len = f(shot.len);
  const [ox, oy, z0, z1] = shot.zoom;
  const zoom = interpolate(frame, [0, len], [z0, z1], clamp);
  const o = dissolve(frame, len);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 224, top: 30, width: 1472, height: 920, borderRadius: 22, overflow: "hidden", border: `2px solid ${INK}`, boxShadow: "0 24px 60px rgba(23,32,26,0.22)", background: INK }}>
        <OffthreadVideo src={staticFile(`clips/${shot.clip}.mp4`)} trimBefore={f(shot.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, transformOrigin: `${ox}% ${oy}%` }} />
      </div>
      <Audio src={staticFile(`clips/${shot.clip}-loud.wav`)} trimBefore={f(shot.src)} volume={(fr) => dissolve(fr, len) * APP_GAIN} />
    </AbsoluteFill>
  );
}

function Caption() {
  const frame = useCurrentFrame();
  const c = CAPTIONS.find((x) => frame >= f(x.at) && frame < f(x.to));
  if (!c) return null;
  const o = interpolate(frame, [f(c.at), f(c.at) + 8, f(c.to) - 8, f(c.to)], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 968, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ padding: "14px 32px", borderRadius: 16, background: INK, fontFamily: SANS, fontWeight: 600, fontSize: 44, color: PAPER, letterSpacing: -0.4 }}>{c.text}</div>
    </div>
  );
}

function Access() {
  const frame = useCurrentFrame();
  const len = f(ACCESS.len);
  const items = ["Explore the map by keyboard", "Spoken descriptions and captions", "Voice commands", "Labelled for screen readers"];
  return (
    <AbsoluteFill style={{ opacity: dissolve(frame, len) }}>
      <div style={{ position: "absolute", left: 110, top: 190, width: 700, fontFamily: SANS, color: INK }}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: MUTED }}>Accessibility first</div>
        <div style={{ fontWeight: 700, fontSize: 88, lineHeight: 1.05, letterSpacing: -2.5, marginTop: 14 }}>Built for<br />everyone.</div>
        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 20 }}>
          {items.map((label, i) => {
            const p = rise(frame, 12 + i * 10);
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 18, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: INK }} />
                <div style={{ fontWeight: 500, fontSize: 40 }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 860, top: 190, width: 980, height: 612, borderRadius: 20, overflow: "hidden", border: `2px solid ${INK}`, boxShadow: "0 24px 60px rgba(23,32,26,0.22)", background: INK }}>
        <OffthreadVideo src={staticFile("clips/keys.mp4")} trimBefore={f(ACCESS.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.1)", transformOrigin: "62% 45%" }} />
      </div>
      <div style={{ position: "absolute", left: 860, top: 824, width: 980, display: "flex", justifyContent: "center", gap: 12 }}>
        {["Shift", "←", "↑", "→", "↓", "Enter"].map((k) => (
          <div key={k} style={{ minWidth: 60, padding: "8px 16px", borderRadius: 12, textAlign: "center", fontFamily: MONO, fontSize: 28, color: INK, background: "#fff", border: `2px solid ${INK}` }}>{k}</div>
        ))}
      </div>
      <Audio src={staticFile("clips/keys-loud.wav")} trimBefore={f(ACCESS.src)} volume={(fr) => dissolve(fr, len) * APP_GAIN} />
    </AbsoluteFill>
  );
}

function EndCard() {
  const frame = useCurrentFrame();
  const a = rise(frame, 6), b = rise(frame, 22), c = rise(frame, 40);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: SANS, color: INK, opacity: interpolate(frame, [0, FADE], [0, 1], clamp) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30, opacity: a, transform: `translateY(${(1 - a) * 16}px)` }}>
        <div style={{ width: 140, height: 140, borderRadius: 70, background: `repeating-radial-gradient(circle, #17201a 0 5px, #2a352c 5px 9px)`, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${frame * 2}deg)` }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: LIME, border: `3px solid ${INK}` }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 196, letterSpacing: -7, lineHeight: 1 }}>EarthFM</div>
      </div>
      <div style={{ fontWeight: 600, fontSize: 58, marginTop: 22, opacity: b, transform: `translateY(${(1 - b) * 12}px)` }}>Earth data everyone can hear.</div>
      <div style={{ marginTop: 48, paddingTop: 28, borderTop: `2px solid ${LINE}`, textAlign: "center", fontFamily: MONO, fontSize: 26, lineHeight: 1.6, color: MUTED, opacity: c }}>
        NASA Space Apps Challenge 2026 · The Earth Information Jukebox
        <br />
        Data: NASA Scientific Visualization Studio · Earth Information Center
        <br />
        All sound is generated live from the data.
      </div>
    </AbsoluteFill>
  );
}

export function Demo() {
  const frame = useCurrentFrame();
  const total = f(TOTAL_SECONDS);
  const fadeOut = interpolate(frame, [total - 12, total], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        <Sequence durationInFrames={f(HOOK.len)}><Hook /></Sequence>
        {SHOTS.map((sh) => (
          <Sequence key={sh.at} from={f(sh.at)} durationInFrames={f(sh.len)}><AppShot shot={sh} /></Sequence>
        ))}
        <Sequence from={f(ACCESS.at)} durationInFrames={f(ACCESS.len)}><Access /></Sequence>
        <Sequence from={f(END.at)} durationInFrames={total - f(END.at)}><EndCard /></Sequence>
        <Caption />
      </AbsoluteFill>

      {VOICEOVER && <Audio src={staticFile(VOICEOVER_FILE)} volume={1} />}
      {/* one soft bell phrase opens and closes the film (synthesised: capture/make_sfx.py); no other sound effects */}
      <Sequence from={4}><Audio src={staticFile("sfx/endchord.wav")} volume={VOICEOVER ? 0.18 : 0.32} /></Sequence>
      <Sequence from={f(END.at) + 4}><Audio src={staticFile("sfx/endchord.wav")} volume={VOICEOVER ? 0.3 : 0.55} /></Sequence>

      {/* AI-use mark, on every frame */}
      <div style={{ position: "absolute", right: 28, bottom: 14, fontFamily: MONO, fontSize: 20, color: MUTED, opacity: 0.7 }}>Made with AI assistance</div>
    </AbsoluteFill>
  );
}
