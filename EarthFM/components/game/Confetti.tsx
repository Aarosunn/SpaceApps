"use client";

import { useEffect, useRef } from "react";
import s from "./Game.module.css";

const COLORS = ["#d8f07a", "#e0603f", "#f4f1e8", "#7ad7f0", "#ffd166"];

/* A short confetti burst each time `burst` changes (0 = none). Skipped with reduced motion. */
export function Confetti({ burst }: { burst: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!burst || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current!, g = cv.getContext("2d")!;
    const parts = Array.from({ length: 90 }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 380 + Math.random() * 520;
      return { x: 720, y: 330, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, w: 6 + Math.random() * 8, c: COLORS[Math.floor(Math.random() * COLORS.length)] };
    });
    const t0 = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, cv.width, cv.height);
      if (t > 2.2) return;
      for (const p of parts) {
        const x = p.x + p.vx * t, y = p.y + p.vy * t + 520 * t * t;
        g.save();
        g.translate(x, y);
        g.rotate(p.rot + p.vr * t);
        g.globalAlpha = Math.max(0, 1 - t / 2.2);
        g.fillStyle = p.c;
        g.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2);
        g.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [burst]);
  return <canvas ref={ref} width={1440} height={900} className={s.confetti} aria-hidden="true" />;
}
