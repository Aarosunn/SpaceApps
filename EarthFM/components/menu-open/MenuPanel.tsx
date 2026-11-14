import { asset } from "../asset";
import { Icon } from "../Icon";
import np from "../Player.module.css";
import s from "./MenuPanel.module.css";

const a = (f: string) => asset(`/figma/menu-open/${f}.svg`);
const DATA = [
  ["Wildfires", true],
  ["Global heat", true],
  ["Arctic sea ice", false],
  ["Sea level", false],
  ["Greenhouse gases", false],
] as const;
const GENRES = ["Lo-fi", "EDM", "Classical", "Ambient", "Hip-hop", "Jazz"];

function Seg({ a: l, b, label }: { a: string; b: string; label: string }) {
  return (
    <div className={s.seg} role="radiogroup" aria-label={label}>
      <button role="radio" aria-checked="true" className={`${s.segBtn} ${s.segOn}`}>{l}</button>
      <button role="radio" aria-checked="false" className={s.segBtn}>{b}</button>
    </div>
  );
}

function Toggle({ label, on }: { label: string; on: boolean }) {
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      <span className={s.rowRight}>
        <span className={`${s.onoff} ${on ? "" : s.off}`}>{on ? "On" : "Off"}</span>
        <button role="switch" aria-checked={on} aria-label={label} className={s.switch}>
          <img alt="" src={a(on ? "switch-on" : "switch-off")} />
        </button>
      </span>
    </div>
  );
}

/* Settings menu panel, Figma 38:289. */
export function MenuPanel() {
  return (
    <section className={s.panel} aria-label="Settings">
      <div className={s.header}>
        <h2 className={s.title}>Settings</h2>
        <button className={s.close} aria-label="Close settings">
          <img alt="" width={20} height={20} src={a("close")} />
        </button>
      </div>
      <div className={s.group}>
        <p className={s.label}>Data you are hearing</p>
        <div className={s.list}>
          {DATA.map(([n, on], i) => (
            <label key={n} className={s.item}>
              <input type="checkbox" defaultChecked={on} className={s.cb} />
              {on ? <img alt="" width={18} height={18} src={a("check")} /> : <span className={s.box} />}
              <span className={i === 0 ? s.itemBold : s.itemText}>{n}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={s.group}>
        <p className={s.label}>Genre</p>
        <div className={s.chips}>
          {GENRES.map((g, i) => (
            <button key={g} className={`${s.chip} ${i === 0 ? s.chipOn : ""}`} aria-pressed={i === 0}>{g}</button>
          ))}
        </div>
      </div>
      <div className={s.group}>
        <p className={s.label}>Mode</p>
        <Seg a="Globe" b="Play (game)" label="Mode" />
      </div>
      <div className={s.access}>
        <div className={s.group}>
          <p className={s.label}>Sonification Mode</p>
          <Seg a="Over Time" b="Over Area" label="Sonification mode" />
        </div>
        <p className={s.label}>Accessibility</p>
        <Toggle label="Word descriptions (voice)" on />
        <Toggle label="Captions" on />
        <Toggle label="Mono audio" on={false} />
      </div>
      <div className={s.group}>
        <p className={s.label}>Mixtapes</p>
        <button className={s.mixtapes}>
          <span className={s.itemText}>My mixtapes (2)</span>
          <Icon name="icon-chevron-right" size={18} />
        </button>
      </div>
      <div className={s.footer}>
        <button className={s.foot}>
          <img alt="" width={16} height={16} src={a("help")} />
          <span className={s.footText}>Help</span>
          <kbd className={s.key}>H</kbd>
        </button>
        <button className={s.foot}>
          <img alt="" width={16} height={16} src={a("kbd")} />
          <span className={s.footText}>Keyboard map</span>
          <kbd className={s.key}>K</kbd>
        </button>
      </div>
    </section>
  );
}

/* Top left with the menu button in its active (lime) state, Figma 38:254. */
export function TopLeftOpen() {
  return (
    <div className={s.top}>
      <button className={s.menuBtn} aria-label="Close menu (M)" aria-expanded="true">
        <Icon name="icon-menu" size={22} />
      </button>
      <div className={s.search} role="search">
        <p className={s.searchText}>Search tracks or places</p>
        <Icon name="icon-search" size={18} />
      </div>
    </div>
  );
}

/* Now-listening bar without the hide button, Figma 38:263. */
export function NowListeningBar({ text = "Now listening: Amazon 2019" }: { text?: string }) {
  return (
    <div className={`${np.nowBar} ${s.nowFix}`}>
      <Icon name="icon-speaker" size={18} />
      <p className={np.nowText}>{text}</p>
    </div>
  );
}
