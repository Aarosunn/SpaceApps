import { Icon } from "./Icon";
import s from "./TopLeft.module.css";

/* Top left: menu button (M) + search field. Figma 37:136. */
export function TopLeft() {
  return (
    <div className={s.wrap}>
      <button className={s.menu} aria-label="Menu (M)">
        <Icon name="icon-menu" size={22} />
      </button>
      <div className={s.search} role="search">
        <p className={s.searchText}>Search tracks or places</p>
        <Icon name="icon-search" size={18} />
      </div>
    </div>
  );
}
