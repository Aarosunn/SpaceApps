import { asset } from "./asset";
import { BleedAsset } from "./Icon";
import { MapDot } from "./MapDot";
import s from "./MapLayer.module.css";

/* Map layer (pins + route), Figma node 32:124. Positions are map coordinates on the 1440x900 artboard. */
export function RouteLegs() {
  return (
    <>
      <BleedAsset className={s.abs} style={{ left: 425, top: 429.66, width: 357, height: 110.345 }} inset="-4.05% -1.54% -5.89% -1.54%" src={asset("/figma/route-leg-1.svg")} />
      <BleedAsset className={s.abs} style={{ left: 782, top: 452, width: 230, height: 180 }} inset="-2.5% -2.39% -3.61% -2.39%" src={asset("/figma/route-leg-2.svg")} />
    </>
  );
}

export function Plane({ left, top, rotate }: { left: number; top: number; rotate: number }) {
  return (
    <div className={s.planeBox} style={{ left, top, width: 52.877, height: 52.877 }} aria-hidden="true">
      <div style={{ transform: `rotate(${rotate}deg)` }}>
        <BleedAsset style={{ position: "relative", width: 38, height: 38 }} inset="-0.65% -5.91% -10.39% -5.13%" src={asset("/figma/plane.svg")} />
      </div>
    </div>
  );
}

export function Boat({ left, top }: { left: number; top: number }) {
  return <BleedAsset className={s.abs} style={{ left, top, width: 30, height: 30 }} inset="-7.33% -14% -20.67% -14%" src={asset("/figma/boat.svg")} />;
}

export function PinCursor({ left, top }: { left: number; top: number }) {
  return (
    <div className={s.cursorBox} style={{ left, top, width: 43.981, height: 46.177 }} aria-hidden="true">
      <BleedAsset className={s.pin} inset="-4.51% -8.33% -16.67% -8.33%" src={asset("/figma/pin-pointer.svg")} />
    </div>
  );
}

export function HoverCard({ left, top, title, hint }: { left: number; top: number; title: string; hint: string }) {
  return (
    <div className={s.hoverCard} style={{ left, top }} role="tooltip">
      <p className={s.hoverTitle}>{title}</p>
      <p className={s.hoverHint}>{hint}</p>
    </div>
  );
}

/* Default route state used by the main screen. */
export function MapLayer({ children }: { children?: React.ReactNode }) {
  return <div className={s.layer}>{children}</div>;
}

export function MainRoute() {
  return (
    <>
      <RouteLegs />
      <Plane left={594.66} top={407.74} rotate={34.71} />
      <Boat left={964.76} top={557.96} />
      <MapDot n={1} left={403} top={518} label="Stop 1: Amazon, fires, playing" />
      <MapDot n={2} kind="Queued" left={760} top={430} label="Stop 2: Central Africa, fires, next" />
      <MapDot n={3} kind="Queued" left={990} top={610} label="Stop 3: Indian Ocean, sea heat" />
    </>
  );
}
