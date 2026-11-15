"use client";

import { Icon } from "./Icon";
import s from "./TopLeft.module.css";

/* Top left: menu button (M) + search field. Figma 37:136. Handlers are optional (static screens omit them). */
export function TopLeft({ onMenu, query, onQuery }: { onMenu?: () => void; query?: string; onQuery?: (q: string) => void }) {
  return (
    <div className={s.wrap}>
      <button className={s.menu} aria-label="Open menu (M)" aria-expanded={false} onClick={onMenu}>
        <Icon name="icon-menu" size={22} />
      </button>
      <label className={s.search} role="search">
        <span className="sr-only">Search tracks or places</span>
        {onQuery ? (
          <input className={s.searchText} placeholder="Search tracks or places" value={query ?? ""} onChange={(e) => onQuery(e.target.value)} />
        ) : (
          <p className={s.searchText}>Search tracks or places</p>
        )}
        <Icon name="icon-search" size={18} />
      </label>
    </div>
  );
}
