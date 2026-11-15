"use client";

import s from "./MapDot.module.css";

/* Figma component "Map dot" (34:145): 44px hit area, 30px dot. Name lives in aria-label + hover card. */
type Props = {
  kind?: "Playing" | "Queued";
  n: number;
  left: number;
  top: number;
  label: string;
  onClick?: () => void;
  onDragStart?: (e: React.PointerEvent) => void; // press on the dot: the parent tracks the drag
};

export function MapDot({ kind = "Playing", n, left, top, label, onClick, onDragStart }: Props) {
  return (
    <button className={s.hit} style={{ left, top, touchAction: "none", cursor: onDragStart ? "grab" : undefined }} aria-label={label} onClick={onClick} onPointerDown={onDragStart}>
      <span className={`${s.dot} ${kind === "Playing" ? s.playing : s.queued}`}>{n}</span>
    </button>
  );
}
