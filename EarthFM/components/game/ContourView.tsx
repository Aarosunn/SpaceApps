import type { Contour } from "@/lib/game/audio";
import s from "./Game.module.css";

const WIDTH = 360, HEIGHT = 110, RANGE = 18; // semitones shown top-to-bottom: +18 .. -18

const yOf = (semis: number) => HEIGHT / 2 - (semis / RANGE) * (HEIGHT / 2 - 10);

/* The visual mirror of a sound: the pitch line draws itself while the tone plays.
   For the mystery sound the line is hidden (a pulsing bar shows only that sound is playing). */
export function ContourView({ contour, label, sub, hidden, playKey, active }: {
  contour: Contour | null;
  label: string;
  sub?: string;
  hidden?: boolean;
  playKey: number; // changes each time this sound plays, restarting the draw animation
  active: boolean;
}) {
  const d = contour ? `M10 ${yOf(contour.from).toFixed(1)} L${WIDTH - 10} ${yOf(contour.to).toFixed(1)}` : "";
  return (
    <figure className={`${s.contour} ${active ? s.contourActive : ""}`} aria-hidden="true">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <line x1="10" x2={WIDTH - 10} y1={HEIGHT / 2} y2={HEIGHT / 2} className={s.axis} />
        {contour && !hidden && (
          <path key={playKey} d={d} className={`${s.line} ${active ? s.draw : ""}`} style={{ animationDuration: `${contour.dur}s` }} pathLength={1} />
        )}
        {hidden &&
          Array.from({ length: 24 }, (_, i) => (
            <rect key={`${playKey}-${i}`} x={14 + i * 14} y={HEIGHT / 2 - 14} width="8" height="28" rx="3" className={`${s.pulse} ${active ? s.pulsing : ""}`} style={{ animationDelay: `${(i % 6) * 0.08}s` }} />
          ))}
        {hidden && !active && <text x={WIDTH / 2} y={HEIGHT / 2 + 12} textAnchor="middle" className={s.q}>?</text>}
      </svg>
      <figcaption>
        <span className={s.cLabel}>{label}</span>
        {sub && <span className={s.cSub}>{sub}</span>}
      </figcaption>
    </figure>
  );
}
