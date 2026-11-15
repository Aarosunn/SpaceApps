"use client";

import { asset } from "../asset";
import s from "../Mixtape.module.css";

/* Collapsed "Show playlist (P)" tab, Figma 45:697. Reuses the shared tab styles; only the icon differs (chevron-left).
   Text and badge are clipped by the 37px width. */
export function ShowPlaylistTab({ left = 1389, count = 3, onShow }: { left?: number; count?: number; onShow?: () => void }) {
  return (
    <button className={s.tab} style={{ left }} aria-label="Show playlist (P)" onClick={onShow}>
      <span style={{ position: "relative", display: "block", width: 18, height: 18, flexShrink: 0 }}>
        <img alt="" src={asset("/figma/playlist-hidden/icon-chevron-left.svg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </span>
      <span className={s.tabText}>Mixtape</span>
      <span className={s.badge}>
        <span className={s.badgeText}>{count}</span>
      </span>
    </button>
  );
}
