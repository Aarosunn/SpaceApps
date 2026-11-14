import s from "./MapDot.module.css";

/* Figma component "Map dot" (34:145): 44px hit area, 30px dot. Name lives in aria-label + hover card. */
export function MapDot({ kind = "Playing", n, left, top, label }: { kind?: "Playing" | "Queued"; n: number; left: number; top: number; label: string }) {
  return (
    <button className={s.hit} style={{ left, top }} aria-label={label}>
      <span className={`${s.dot} ${kind === "Playing" ? s.playing : s.queued}`}>{n}</span>
    </button>
  );
}
