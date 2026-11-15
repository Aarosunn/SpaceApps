"use client";

import { useState } from "react";
import { asset } from "../asset";
import { Icon } from "../Icon";
import { LAYERS, LAYER_ORDER, type LayerId, type SonMode } from "@/lib/sonify/layers";
import np from "../Player.module.css";
import s from "./MenuPanel.module.css";

const a = (f: string) => asset(`/figma/menu-open/${f}.svg`);

function Seg({ a: l, b, label, initialFirst = true, onPick }: { a: string; b: string; label: string; initialFirst?: boolean; onPick?: (first: boolean) => void }) {
  const [first, setFirst0] = useState(initialFirst);
  const setFirst = (v: boolean) => {
    setFirst0(v);
    onPick?.(v);
  };
  return (
    <div className={s.seg} role="radiogroup" aria-label={label}>
      <button role="radio" aria-checked={first} className={`${s.segBtn} ${first ? s.segOn : ""}`} onClick={() => setFirst(true)}>{l}</button>
      <button role="radio" aria-checked={!first} className={`${s.segBtn} ${first ? "" : s.segOn}`} onClick={() => setFirst(false)}>{b}</button>
    </div>
  );
}

function Toggle({ label, on: initial }: { label: string; on: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      <span className={s.rowRight}>
        <span className={`${s.onoff} ${on ? "" : s.off}`}>{on ? "On" : "Off"}</span>
        <button role="switch" aria-checked={on} aria-label={label} className={s.switch} onClick={() => setOn(!on)}>
          <img alt="" src={a(on ? "switch-on" : "switch-off")} />
        </button>
      </span>
    </div>
  );
}

/* Settings menu panel, Figma 38:289. One data layer plays at a time, so the list behaves as radio buttons. */
function DataItem({ name, on, onPick }: { name: string; on: boolean; onPick: () => void }) {
  return (
    <label className={s.item}>
      <input type="radio" name="data-layer" checked={on} onChange={onPick} className={s.cb} />
      <span className={`${s.radio} ${on ? s.radioOn : ""}`} aria-hidden="true" />
      <span className={on ? s.itemBold : s.itemText}>{name}</span>
    </label>
  );
}

type MenuProps = {
  onClose?: () => void;
  onMode?: (mode: "globe" | "play") => void;
  layer?: LayerId;
  onLayer?: (layer: LayerId) => void;
  sonMode?: SonMode;
  onSonMode?: (mode: SonMode) => void;
};

export function MenuPanel({ onClose, onMode, layer = "sst", onLayer, sonMode = "area", onSonMode }: MenuProps) {
  return (
    <section className={s.panel} aria-label="Settings">
      <div className={s.header}>
        <h2 className={s.title}>Settings</h2>
        <button className={s.close} aria-label="Close settings (Esc)" onClick={onClose}>
          <img alt="" width={20} height={20} src={a("close")} />
        </button>
      </div>
      <div className={s.group}>
        <p className={s.label}>Data you are hearing</p>
        <div className={s.list}>
          {LAYER_ORDER.map((id) => (
            <DataItem key={id} name={LAYERS[id].menu} on={id === layer} onPick={() => onLayer?.(id)} />
          ))}
        </div>
      </div>
      <div className={s.group}>
        <p className={s.label}>Mode</p>
        <Seg a="Globe" b="Play (game)" label="Mode" onPick={(globe) => onMode?.(globe ? "globe" : "play")} />
      </div>
      <div className={s.access}>
        <div className={s.group}>
          <p className={s.label}>Sonification Mode</p>
          <Seg a="By Time" b="By Area" label="Sonification mode" initialFirst={sonMode === "time"} onPick={(time) => onSonMode?.(time ? "time" : "area")} />
        </div>
        <p className={s.label}>Accessibility</p>
        <div className={s.tight}><Toggle label="Word descriptions (voice)" on /></div>
        <Toggle label="Captions" on />
        <Toggle label="Mono audio" on={false} />
      </div>
      <div className={`${s.group} ${s.mixGroup}`}>
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
export function TopLeftOpen({ onMenu, query, onQuery }: { onMenu?: () => void; query?: string; onQuery?: (q: string) => void }) {
  return (
    <div className={s.top}>
      <button className={s.menuBtn} aria-label="Close menu (M)" aria-expanded="true" onClick={onMenu}>
        <Icon name="icon-menu" size={22} />
      </button>
      <div className={s.search} role="search">
        {onQuery ? (
          <input className={s.searchText} style={{ border: 0, outline: 0, background: "transparent", padding: 0 }} placeholder="Search tracks or places" aria-label="Search tracks or places" value={query ?? ""} onChange={(e) => onQuery(e.target.value)} />
        ) : (
          <p className={s.searchText}>Search tracks or places</p>
        )}
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
