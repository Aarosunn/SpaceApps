import { asset } from "./asset";
import s from "./Stage.module.css";

/* 1440x900 artboard with the satellite map background (Figma frame 28:107). */
export function Stage({ children }: { children: React.ReactNode }) {
  return (
    <main className={s.stage}>
      <img className={s.map} alt="" src={asset("/figma/map.png")} />
      {children}
    </main>
  );
}

/* Bottom scrim (37:165): sits above the map layer, below the panels. */
export function Scrim() {
  return <div className={s.scrim} aria-hidden="true" />;
}
