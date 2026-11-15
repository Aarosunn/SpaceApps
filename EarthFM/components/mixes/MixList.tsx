"use client";

import { asset } from "@/components/asset";
import { LAYERS } from "@/lib/sonify/layers";
import type { Mix } from "@/lib/mixtapes";
import s from "./MixList.module.css";

/* "My mixtapes": the mixtapes saved in this browser. Click one to load it; the cross deletes it. */
export function MixList({ mixes, onLoad, onDelete, onClose }: { mixes: Mix[]; onLoad: (m: Mix) => void; onDelete: (name: string) => void; onClose: () => void }) {
  return (
    <section className={s.box} aria-label="My mixtapes">
      <div className={s.head}>
        <h2 className={s.title}>My mixtapes</h2>
        <button className={s.x} onClick={onClose} aria-label="Close my mixtapes">
          <img alt="" width={18} height={18} src={asset("/figma/menu-open/close.svg")} />
        </button>
      </div>
      {mixes.length === 0 && <p className={s.empty}>Nothing saved yet. Add places, press Share, then “Save to my mixtapes”.</p>}
      <ul className={s.list}>
        {mixes.map((m) => (
          <li key={m.name} className={s.row}>
            <button className={s.load} onClick={() => onLoad(m)} aria-label={`Load ${m.name}: ${m.stops.length} places, ${LAYERS[m.layer].label}`}>
              <span className={s.name}>{m.name}</span>
              <span className={s.sub}>{m.stops.length} {m.stops.length === 1 ? "place" : "places"} · {LAYERS[m.layer].label}</span>
            </button>
            <button className={s.x} onClick={() => onDelete(m.name)} aria-label={`Delete ${m.name}`}>
              <img alt="" width={16} height={16} src={asset("/figma/menu-open/close.svg")} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
