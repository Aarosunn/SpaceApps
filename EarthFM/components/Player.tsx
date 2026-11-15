"use client";

import { asset } from "./asset";
import { Icon } from "./Icon";
import s from "./Player.module.css";

const WAVE = [5.176, 10.353, 15.529, 7.765, 19.412, 12.941, 22, 11.647, 16.824, 7.765, 20.706, 14.235, 9.059, 18.118, 22, 12.941, 7.765, 16.824, 19.412, 11.647, 6.471, 15.529, 20.706, 10.353, 5.176];
const PLAYHEAD = 18; // index of the coral "now" bar

export function NowListening({ text = "Now listening: Amazon 2019", onHide }: { text?: string; onHide?: () => void }) {
  return (
    <div className={s.nowBar}>
      <Icon name="icon-speaker" size={18} />
      <p className={s.nowText}>{text}</p>
      <div className={s.spacer} />
      <button className={s.hideBtn} aria-label="Hide controls (B)" onClick={onHide}>
        <Icon name="icon-chevron-down" size={18} />
      </button>
    </div>
  );
}

type PlayerProps = {
  time?: string;
  volume?: number;
  playing?: boolean;
  progress?: number; // 0..1, drives the waveform playhead
  onPlayPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onVolume?: (v: number) => void;
};

export function SoundPlayer({ time = "0:57 / 1:15", volume = 0.75, playing = true, progress, onPlayPause, onPrev, onNext, onVolume }: PlayerProps) {
  const pct = `${Math.max(0, Math.min(1, volume)) * 100}%`; // track spans the slider box, so 100% lands on its right end
  const head = progress === undefined ? PLAYHEAD : Math.min(WAVE.length - 1, Math.floor(progress * WAVE.length));
  const setFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onVolume?.(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  };
  // Standard slider keys: arrows nudge 5%, Page Up/Down jump 10%, Home/End go to silent/full.
  const onSliderKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05, PageUp: 0.1, PageDown: -0.1 };
    let v: number | null = null;
    if (e.key in step) v = volume + step[e.key];
    else if (e.key === "Home") v = 0;
    else if (e.key === "End") v = 1;
    if (v === null) return;
    e.preventDefault();
    onVolume?.(Math.max(0, Math.min(1, +v.toFixed(2))));
  };
  return (
    <div className={s.player} role="region" aria-label="Sound player">
      <div className={s.playback}>
        <div className={s.transport}>
          <button className={`${s.round} ${s.outline}`} aria-label="Previous song" onClick={onPrev}>
            <Icon name="icon-prev" size={18} />
          </button>
          <button className={`${s.round} ${s.solid}`} aria-label={playing ? "Pause (Space)" : "Play (Space)"} aria-pressed={playing} onClick={onPlayPause}>
            <Icon name={playing ? "icon-pause" : "icon-play"} size={24} />
          </button>
          <button className={`${s.round} ${s.outline}`} aria-label="Skip to next (N)" onClick={onNext}>
            <Icon name="icon-next" size={18} />
          </button>
        </div>
        <div className={s.timeline}>
          <p className={s.time}>{time}</p>
          <div className={s.wave} aria-hidden="true">
            {WAVE.map((h, i) => (
              <div key={i} className={`${s.waveBar} ${i === head ? s.waveNow : i > head ? s.waveAhead : ""}`} style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>
      <div className={s.volumeRow}>
        <div className={s.volume}>
          <p className={s.volumeLabel}>VOLUME</p>
          <button className={s.volBtn} aria-label="Volume down" onClick={() => onVolume?.(Math.max(0, +(volume - 0.1).toFixed(2)))}>−</button>
          <div
            className={s.slider}
            onClick={setFromClick}
            onKeyDown={onSliderKey}
            tabIndex={0}
            role="slider"
            aria-label="Volume"
            aria-orientation="horizontal"
            aria-valuenow={Math.round(volume * 100)}
            aria-valuetext={`${Math.round(volume * 100)} percent`}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={s.track} />
            <div className={s.fill} style={{ width: pct }} />
            <img className={s.thumb} style={{ left: `calc(${pct} - 6px)` }} alt="" src={asset("/figma/volume-thumb.svg")} />
          </div>
          <button className={s.volBtn} aria-label="Volume up" onClick={() => onVolume?.(Math.min(1, +(volume + 0.1).toFixed(2)))}>+</button>
        </div>
      </div>
    </div>
  );
}

export function ShowControls({ left = 551, top = 940, title = "Amazon · 2019", playing = true, onPlayPause, onNext, onShow }: {
  left?: number; top?: number; title?: string; playing?: boolean; onPlayPause?: () => void; onNext?: () => void; onShow?: () => void;
}) {
  return (
    <div className={s.pill} style={{ left, top }}>
      <button className={s.miniSolid} aria-label={playing ? "Pause (Space)" : "Play (Space)"} onClick={onPlayPause}>
        <Icon name={playing ? "icon-mini-pause" : "icon-mini-play"} size={16} />
      </button>
      <button className={s.miniOutline} aria-label="Skip (N)" onClick={onNext}>
        <Icon name="icon-mini-skip" size={14} />
      </button>
      <p className={s.pillTitle}>{title}</p>
      <div className={s.pillDivider} />
      <button className={s.pillShow} onClick={onShow} aria-label="Show controls (B)">
        <Icon name="icon-show-controls" size={16} />
        <span className={s.pillText}>Show controls</span>
      </button>
    </div>
  );
}
