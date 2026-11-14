import { asset } from "@/components/asset";
import { Icon } from "@/components/Icon";
import s from "./Panel.module.css";

const H = [12, 14, 12, 16, 14, 18, 16, 14, 18, 20, 16, 18, 22, 20, 18, 24, 22, 26, 30, 24, 22, 28, 32, 30, 34];
const NOW = 2019;

/* Figma 20:565 */
export const SotScrim = () => <div className={s.scrim} aria-hidden="true" />;

/* Figma 20:736 (no hide button, unlike the shared bar) */
export function SotNowListening({ text = "Now listening: Amazon 2001–2025" }: { text?: string }) {
  return (
    <div className={s.now}>
      <Icon name="icon-speaker" size={18} />
      <p className={s.nowText}>{text}</p>
    </div>
  );
}

/* Figma 20:608 "Music through the years": year bars + transport + volume in one panel */
export function YearsPlayer() {
  return (
    <div className={s.panel} role="region" aria-label="Music through the years">
      <div className={s.timeline}>
        <div className={s.labels}>
          <p className={s.layer}>Wildfires</p>
          <p className={s.yearNow}>{NOW}</p>
        </div>
        <div className={s.bars} role="radiogroup" aria-label="Year">
          {H.map((h, i) => {
            const y = 2001 + i;
            const cls = y === NOW ? s.now19 : y > NOW ? s.future : "";
            return <div key={y} className={`${s.bar} ${cls}`} style={{ height: h, left: i * 16.48, top: 34 - h }} role="radio" aria-checked={y === NOW} aria-label={String(y)} />;
          })}
        </div>
        <div className={s.years}>
          {[2001, 2007, 2013, 2019, 2025].map((y) => (
            <p key={y} className={y === NOW ? s.hot : undefined}>{y}</p>
          ))}
        </div>
      </div>
      <div className={s.playback}>
        <div className={s.transport}>
          <button className={`${s.round} ${s.outline}`} aria-label="Previous year"><Icon name="icon-prev" size={18} /></button>
          <button className={`${s.round} ${s.solid}`} aria-label="Pause"><Icon name="icon-pause" size={24} /></button>
          <button className={`${s.round} ${s.outline}`} aria-label="Next year"><Icon name="icon-next" size={18} /></button>
        </div>
        <p className={s.time}>0:57 / 1:15</p>
      </div>
      <div className={s.volRow}>
        <p className={s.volLabel}>VOLUME</p>
        <button className={s.volBtn} aria-label="Volume down">−</button>
        <div className={s.slider} role="slider" aria-label="Volume" aria-valuenow={75} aria-valuemin={0} aria-valuemax={100}>
          <div className={s.track} />
          <div className={s.fill} />
          <img className={s.thumb} alt="" src={asset("/figma/volume-thumb.svg")} />
        </div>
        <button className={s.volBtn} aria-label="Volume up">+</button>
      </div>
    </div>
  );
}
