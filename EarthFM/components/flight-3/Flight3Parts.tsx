import { asset } from "@/components/asset";
import { BleedAsset, Icon } from "@/components/Icon";
import s from "./Mixtape.module.css";
import m from "@/components/MapLayer.module.css";
import p from "@/components/Player.module.css";
import c from "@/components/LiveCaption.module.css";

/* Plane at arrival: Figma 38:1055 (50.296 box, rotated 65.62deg). */
export function ArrivedPlane() {
  return (
    <div className={m.planeBox} style={{ left: 749.69, top: 424.06, width: 50.296, height: 50.296 }} aria-hidden="true">
      <div style={{ transform: "rotate(65.62deg)" }}>
        <BleedAsset style={{ position: "relative", width: 38, height: 38 }} inset="-0.65% -5.91% -10.39% -5.13%" src={asset("/figma/plane.svg")} />
      </div>
    </div>
  );
}

const STOPS = [
  { n: 1, name: "Amazon", sub: "Fires · played", cls: `${s.stopIdle} ${s.stopPlayed}`, num: s.numActive, chevron: true },
  { n: 2, name: "Central Africa", sub: "Fires · playing now", cls: s.stopActive, num: s.numIdle },
  { n: 3, name: "Indian Ocean", sub: "Sea heat · then, sailing there", cls: s.stopIdle, num: s.numIdle },
];

/* Mixtape (route) panel, Figma 38:1166: stop 1 played, stop 2 playing. */
export function ArrivedMixtape() {
  return (
    <section className={s.panel} aria-label="Mixtape">
      <div className={s.titleBlock}>
        <div className={s.meta}>
          <p className={s.metaText}>Mixtape · 3 stops · 8:12</p>
          <button className={s.hideBtn} aria-label="Hide playlist (P)">
            <Icon name="icon-chevron-right" size={18} />
          </button>
        </div>
        <div className={s.nameRow}>
          <p className={s.name}>Fires of the Southern Hemisphere</p>
          <BleedAsset style={{ position: "relative", width: 16, height: 16, flexShrink: 0 }} inset="-10.46% -16.8% -22.92% -16.67%" src={asset("/figma/icon-edit.svg")} />
        </div>
      </div>
      {STOPS.map((st) => (
        <button key={st.n} className={`${s.stop} ${st.cls}`}>
          <Icon name="icon-drag" size={16} />
          <span className={`${s.num} ${st.num}`}>{st.n}</span>
          <span className={s.stopText}>
            <p className={s.stopName}>{st.name}</p>
            <p className={s.stopSub}>{st.sub}</p>
          </span>
          {st.chevron && <Icon name="icon-chevron-right" size={18} />}
        </button>
      ))}
      <div className={s.actions}>
        <button className={s.add}>
          <span className={s.btnInner}>
            <Icon name="icon-plus" size={18} />
            <span className={s.btnText}>Add place</span>
          </span>
        </button>
        <button className={s.share}>
          <Icon name="icon-share" size={18} />
          <span className={s.btnText}>Share</span>
        </button>
      </div>
    </section>
  );
}

export function ArrivedRoute() {
  return (
    <>
      <BleedAsset className={m.abs} style={{ left: 425, top: 429.66, width: 357, height: 110.345 }} inset="-4.05% -1.54% -5.89% -1.54%" src={asset("/figma/flight-3/7ccce.svg")} />
      <BleedAsset className={m.abs} style={{ left: 782, top: 452, width: 230, height: 180 }} inset="-2.5% -2.39% -3.61% -2.39%" src={asset("/figma/flight-3/5a2dd.svg")} />
    </>
  );
}

/* Now listening bar without the hide chevron (38:1237). */
export function ArrivedNowListening() {
  return (
    <div className={p.nowBar} style={{ top: 722, padding: "10px 14px" }}>
      <Icon name="icon-speaker" size={18} />
      <p className={p.nowText}>Now listening: Central Africa 2019</p>
    </div>
  );
}

/* Live caption wraps at 398px (38:1114), top 814. */
export function ArrivedCaption() {
  return (
    <div className={c.caption} style={{ top: 814 }} aria-live="polite">
      <Icon name="icon-caption" size={22} />
      <p className={c.text} style={{ width: 398, whiteSpace: "normal" }}>Now playing Central Africa, 2019. Rhodes chords, steady crackle.</p>
    </div>
  );
}
