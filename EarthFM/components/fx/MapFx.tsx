"use client";

/* Map overlay that moves with the sound, so the picture shows what the ear hears:
   - the reading window (the 8 x 5 grid squares the song is made from), drawn on the real map and tinted by value;
   - the square being read right now, with a ripple / sparks / glow for every note (one style per data type);
   - an aura around the playing place that breathes with the loudness.
   Everything is read from the same SoundRecipe the player uses, at the clip clock's time. One canvas, no React renders. */
import { useEffect, useRef } from "react";
import { VIEW_COLS, VIEW_ROWS, type SoundRecipe } from "@/lib/sonify/useJukebox";
import { latLonToXy } from "@/lib/geo";
import type { LayerId } from "@/lib/sonify/layers";

const W = 1440, H = 900;
export const LAYER_RGB: Record<LayerId, string> = { sst: "122,215,240", fires: "255,154,60", heat: "255,93,115" };

type Props = {
  song: SoundRecipe | null;
  live: boolean; // the song is sounding now
  x: number; y: number; // the playing place, artboard px
  getTime: () => number;
  getLevel: () => number; // loudness 0..1
};

type Puff = { x: number; y: number; t0: number; vx: number; vy: number; size: number };

export function MapFx({ song, live, x, y, getTime, getLevel }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!, g = cv.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, lastStep = -1, lvl = 0;
    const puffs: Puff[] = [];
    if (!song) {
      g.clearRect(0, 0, W, H);
      return;
    }
    const rgb = LAYER_RGB[song.layer.id], [, cols] = song.grid, { r0, c0 } = song.window;
    const cell = (row: number, col: number) => {
      const a = latLonToXy(90 - row * 10, -180 + col * 10), b = latLonToXy(90 - (row + 1) * 10, -180 + (col + 1) * 10);
      return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
    };
    const win0 = cell(r0, c0), win1 = cell(r0 + VIEW_ROWS - 1, c0 + VIEW_COLS - 1);
    const win = { x: win0.x, y: win0.y, w: win1.x + win1.w - win0.x, h: win1.y + win1.h - win0.y };

    const draw = (now: number) => {
      g.clearRect(0, 0, W, H);
      const t = live ? getTime() : 0, st = song.stepAt(t), f = song.frames[st.frame];
      lvl += ((live ? getLevel() : 0) - lvl) * 0.25; // smooth the meter

      // the reading window: a soft data tint per square, then a dashed frame
      for (let rr = 0; rr < VIEW_ROWS; rr++)
        for (let cc = 0; cc < VIEW_COLS; cc++) {
          const v = f.grid[(r0 + rr) * cols + c0 + cc];
          if (v <= 0.02) continue;
          const c = cell(r0 + rr, c0 + cc);
          g.fillStyle = `rgba(${rgb},${(0.06 + 0.2 * v).toFixed(3)})`;
          g.fillRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
        }
      g.setLineDash([6, 8]);
      g.lineWidth = 1.5;
      g.strokeStyle = `rgba(255,255,255,${live ? 0.55 : 0.3})`;
      g.strokeRect(win.x, win.y, win.w, win.h);
      g.setLineDash([]);

      if (live) {
        // the square being read (by area), or the whole window breathing (by time)
        const stepNo = Math.floor(t / song.stepSeconds + 1e-6);
        const c = st.row >= 0 ? cell(st.row, st.col) : win;
        if (st.value !== null) {
          g.fillStyle = `rgba(${rgb},${st.row >= 0 ? 0.55 : 0.08 + 0.12 * lvl})`;
          g.fillRect(c.x, c.y, c.w, c.h);
          g.lineWidth = 2;
          g.strokeStyle = "rgba(255,255,255,0.95)";
          if (st.row >= 0) g.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
        } else if (st.row >= 0) {
          g.strokeStyle = "rgba(255,255,255,0.35)"; // a rest: hollow square
          g.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
        }
        // one burst per note
        if (!still && stepNo !== lastStep && st.value !== null) {
          const px = c.x + c.w / 2, py = c.y + c.h / 2, v = st.value;
          const n = song.layer.id === "fires" ? 2 + Math.round(v * 5) : 1;
          for (let i = 0; i < n; i++)
            puffs.push({ x: px + (song.layer.id === "fires" ? (Math.random() - 0.5) * c.w * 0.7 : 0), y: py, t0: now, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 70, size: 14 + v * 26 });
        }
        lastStep = stepNo;

        // aura around the playing place, breathing with the loudness
        if (!still)
          for (let k = 0; k < 3; k++) {
            const r = 24 + k * 14 + lvl * (26 + k * 16);
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.lineWidth = 2.5 - k * 0.6;
            g.strokeStyle = `rgba(${rgb},${Math.max(0, 0.55 * lvl + 0.12 - k * 0.1).toFixed(3)})`;
            g.stroke();
          }
      }

      // note bursts: water = widening rings, fire = sparks that rise and fade, heat = a soft glow
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i], age = (now - p.t0) / 1000, life = song.layer.id === "fires" ? 0.8 : 1.0;
        if (age > life) { puffs.splice(i, 1); continue; }
        const k = age / life, a = (1 - k) ** 1.5;
        if (song.layer.id === "sst") {
          g.beginPath();
          g.arc(p.x, p.y, 6 + k * p.size * 1.6, 0, Math.PI * 2);
          g.lineWidth = 2;
          g.strokeStyle = `rgba(${rgb},${(0.8 * a).toFixed(3)})`;
          g.stroke();
        } else if (song.layer.id === "fires") {
          g.fillStyle = `rgba(255,${Math.round(210 - 120 * k)},${Math.round(90 - 70 * k)},${a.toFixed(3)})`;
          g.beginPath();
          g.arc(p.x + p.vx * age, p.y + p.vy * age, 2.6 * (1 - k * 0.6), 0, Math.PI * 2);
          g.fill();
        } else {
          const r = 10 + k * p.size * 1.3, grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          grad.addColorStop(0, `rgba(${rgb},${(0.55 * a).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${rgb},0)`);
          g.fillStyle = grad;
          g.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        }
      }
      if (!still || live) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [song, live, x, y, getTime, getLevel]);

  return <canvas ref={ref} width={W} height={H} aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }} />;
}
