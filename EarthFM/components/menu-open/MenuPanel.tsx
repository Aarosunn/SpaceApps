"use client";

import { useEffect, useState } from "react";
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

/* A switch. With `value` and `onChange` it is controlled by the parent (it does something); without them it only remembers itself. */
function Toggle({ label, on: initial, value, onChange }: { label: string; on: boolean; value?: boolean; onChange?: (on: boolean) => void }) {
  const [own, setOwn] = useState(initial);
  const on = value ?? own;
  const flip = () => {
    setOwn(!on);
    onChange?.(!on);
  };
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      <span className={s.rowRight}>
        <span className={`${s.onoff} ${on ? "" : s.off}`}>{on ? "On" : "Off"}</span>
        <button role="switch" aria-checked={on} aria-label={label} className={s.switch} onClick={flip}>
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
  captions?: boolean;
  onCaptions?: (on: boolean) => void;
  voice?: boolean;
  onVoice?: (on: boolean) => void;
  mono?: boolean;
  onMono?: (on: boolean) => void;
};

export function MenuPanel({ onClose, onMode, layer = "sst", onLayer, sonMode = "area", onSonMode, captions, onCaptions, voice, onVoice, mono, onMono }: MenuProps) {
  const [info, setInfo] = useState<"help" | "keys" | null>(null); // Help / Keyboard map text, shown in the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLInputElement;
      if (e.ctrlKey || e.metaKey || e.altKey || (t.tagName === "INPUT" && t.type !== "radio")) return;
      const k = e.key.toLowerCase();
      if (k === "h" || k === "k") setInfo((cur) => (cur === (k === "h" ? "help" : "keys") ? null : k === "h" ? "help" : "keys"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <section className={s.panel} aria-label="Settings">
      <div className={s.header}>
        <h2 className={s.title}>Settings</h2>
        <button className={s.close} aria-label="Close settings (Esc)" onClick={onClose} autoFocus>
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
        <div className={s.tight}><Toggle label="Word descriptions (voice)" on value={voice} onChange={onVoice} /></div>
        <Toggle label="Captions" on value={captions} onChange={onCaptions} />
        <Toggle label="Mono audio" on={false} value={mono} onChange={onMono} />
      </div>
      {/* Always mounted: screen readers only announce a status region that existed before its text arrived. */}
      <p role="status" style={{ margin: 0, font: "400 13px/1.45 var(--sans)", color: "var(--ink)", whiteSpace: "normal", position: info ? "static" : "absolute" }}>
          {!info ? "" : info === "help"
            ? "To add a place, click the map, or type its name in the search box and press Enter. Its NASA data plays as a melody: higher notes mean higher values. The caption at the bottom left, and the voice, say what the sound means. Press ? to see how the sound is made."
            : "M: menu. Space: play or pause. N: next place. ?: how the sound is made. Backspace: remove the last place. Arrow keys on a place: move it. B: hide the controls. P: hide the mixtape. H: help. K: this list. Esc: close."}
      </p>
      {!info && (
        <div className={`${s.group} ${s.mixGroup}`}>
          <p className={s.label}>Mixtapes</p>
          <button className={s.mixtapes}>
            <span className={s.itemText}>My mixtapes (2)</span>
            <Icon name="icon-chevron-right" size={18} />
          </button>
        </div>
      )}
      <div className={s.footer}>
        <button className={s.foot} aria-expanded={info === "help"} onClick={() => setInfo(info === "help" ? null : "help")}>
          <img alt="" width={16} height={16} src={a("help")} />
          <span className={s.footText}>Help</span>
          <kbd className={s.key}>H</kbd>
        </button>
        <button className={s.foot} aria-expanded={info === "keys"} onClick={() => setInfo(info === "keys" ? null : "keys")}>
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
          <input className={s.searchText} style={{ border: 0, outline: 0, boxShadow: "none", background: "transparent", padding: 0 }} placeholder="Search tracks or places" aria-label="Search tracks or places" value={query ?? ""} onChange={(e) => onQuery(e.target.value)} />
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
