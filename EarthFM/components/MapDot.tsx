"use client";

import s from "./MapDot.module.css";

/* Figma component "Map dot" (34:145): 44px hit area, 30px dot. Name lives in aria-label + hover card. */
export function MapDot({ kind = "Playing", n, left, top, label, onClick }: { kind?: "Playing" | "Queued"; n: number; left: number; top: number; label: string; onClick?: () => void }) {
  return (
    <button className={s.hit} style={{ left, top }} aria-label={label} onClick={onClick}>
      <span className={`${s.dot} ${kind === "Playing" ? s.playing : s.queued}`}>{n}</span>
    </button>
  );
}
