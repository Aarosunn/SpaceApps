"use client";

import { asset } from "./asset";
import { BleedAsset, Icon } from "./Icon";
import s from "./Mixtape.module.css";

export type Stop = { n: number; name: string; sub: string; active?: boolean };

export const DEFAULT_STOPS: Stop[] = [
  { n: 1, name: "Amazon", sub: "Fires · playing now", active: true },
  { n: 2, name: "Central Africa", sub: "Fires · next, flying there" },
  { n: 3, name: "Indian Ocean", sub: "Sea heat · then, sailing there" },
];

/* Mixtape (route) panel, Figma 32:274. */
export function Mixtape({
  meta = "Mixtape · 3 stops · 8:12",
  title = "Fires of the Southern Hemisphere",
  stops = DEFAULT_STOPS,
  onHide,
  onSelect,
  onAdd,
  onShare,
  shareOpen,
}: {
  meta?: string;
  title?: string;
  stops?: Stop[];
  onHide?: () => void;
  onSelect?: (n: number) => void;
  onAdd?: () => void;
  onShare?: () => void;
  shareOpen?: boolean;
}) {
  return (
    <section className={s.panel} aria-label="Mixtape">
      <div className={s.titleBlock}>
        <div className={s.meta}>
          <p className={s.metaText}>{meta}</p>
          <button className={s.hideBtn} aria-label="Hide playlist (P)" onClick={onHide}>
            <Icon name="icon-chevron-right" size={18} />
          </button>
        </div>
        <div className={s.nameRow}>
          <p className={s.name}>{title}</p>
          <BleedAsset style={{ position: "relative", width: 16, height: 16, flexShrink: 0 }} inset="-10.46% -16.8% -22.92% -16.67%" src={asset("/figma/icon-edit.svg")} />
        </div>
      </div>
      {stops.map((st) => (
        <button key={st.n} className={`${s.stop} ${st.active ? s.stopActive : s.stopIdle}`} aria-current={st.active || undefined} onClick={() => onSelect?.(st.n)}>
          <Icon name="icon-drag" size={16} />
          <span className={`${s.num} ${st.active ? s.numActive : s.numIdle}`}>{st.n}</span>
          <span className={s.stopText}>
            <p className={s.stopName}>{st.name}</p>
            <p className={s.stopSub}>{st.sub}</p>
          </span>
          {st.active && <Icon name="icon-chevron-right" size={18} />}
        </button>
      ))}
      <div className={s.actions}>
        <button className={s.add} onClick={onAdd}>
          <span className={s.btnInner}>
            <Icon name="icon-plus" size={18} />
            <span className={s.btnText}>Add place</span>
          </span>
        </button>
        <button className={s.share} onClick={onShare} aria-expanded={shareOpen}>
          <Icon name="icon-share" size={18} />
          <span className={s.btnText}>Share</span>
        </button>
      </div>
    </section>
  );
}

export function ShowPlaylistTab({ left = 1480, count = 3 }: { left?: number; count?: number }) {
  return (
    <button className={s.tab} style={{ left }} aria-label="Show playlist (P)">
      <Icon name="icon-playlist" size={18} />
      <span className={s.tabText}>Mixtape</span>
      <span className={s.badge}>
        <span className={s.badgeText}>{count}</span>
      </span>
    </button>
  );
}
