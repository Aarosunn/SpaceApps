import { asset } from "./asset";
import { Icon } from "./Icon";
import s from "./Player.module.css";

const WAVE = [5.176, 10.353, 15.529, 7.765, 19.412, 12.941, 22, 11.647, 16.824, 7.765, 20.706, 14.235, 9.059, 18.118, 22, 12.941, 7.765, 16.824, 19.412, 11.647, 6.471, 15.529, 20.706, 10.353, 5.176];
const PLAYHEAD = 18; // index of the coral "now" bar

export function NowListening({ text = "Now listening: Amazon 2019" }: { text?: string }) {
  return (
    <div className={s.nowBar}>
      <Icon name="icon-speaker" size={18} />
      <p className={s.nowText}>{text}</p>
      <div className={s.spacer} />
      <button className={s.hideBtn} aria-label="Hide controls">
        <Icon name="icon-chevron-down" size={18} />
      </button>
    </div>
  );
}

export function SoundPlayer({ time = "0:57 / 1:15", volume = 0.75 }: { time?: string; volume?: number }) {
  const fill = Math.round(308 * volume);
  return (
    <div className={s.player} role="region" aria-label="Sound player">
      <div className={s.playback}>
        <div className={s.transport}>
          <button className={`${s.round} ${s.outline}`} aria-label="Previous song">
            <Icon name="icon-prev" size={18} />
          </button>
          <button className={`${s.round} ${s.solid}`} aria-label="Pause">
            <Icon name="icon-pause" size={24} />
          </button>
          <button className={`${s.round} ${s.outline}`} aria-label="Skip to next (N)">
            <Icon name="icon-next" size={18} />
          </button>
        </div>
        <div className={s.timeline}>
          <p className={s.time}>{time}</p>
          <div className={s.wave} aria-hidden="true">
            {WAVE.map((h, i) => (
              <div key={i} className={`${s.waveBar} ${i === PLAYHEAD ? s.waveNow : i > PLAYHEAD ? s.waveAhead : ""}`} style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>
      <div className={s.volumeRow}>
        <div className={s.volume}>
          <p className={s.volumeLabel}>VOLUME</p>
          <button className={s.volBtn} aria-label="Volume down">−</button>
          <div className={s.slider} role="slider" aria-label="Volume" aria-valuenow={Math.round(volume * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className={s.track} />
            <div className={s.fill} style={{ width: fill }} />
            <img className={s.thumb} style={{ left: fill - 6 }} alt="" src={asset("/figma/volume-thumb.svg")} />
          </div>
          <button className={s.volBtn} aria-label="Volume up">+</button>
        </div>
      </div>
    </div>
  );
}

export function ShowControls({ left = 551, top = 940, title = "Amazon · 2019" }: { left?: number; top?: number; title?: string }) {
  return (
    <div className={s.pill} style={{ left, top }}>
      <button className={s.miniSolid} aria-label="Pause">
        <Icon name="icon-mini-pause" size={16} />
      </button>
      <button className={s.miniOutline} aria-label="Skip (N)">
        <Icon name="icon-mini-skip" size={14} />
      </button>
      <p className={s.pillTitle}>{title}</p>
      <div className={s.pillDivider} />
      <Icon name="icon-show-controls" size={16} />
      <p className={s.pillText}>Show controls</p>
    </div>
  );
}
