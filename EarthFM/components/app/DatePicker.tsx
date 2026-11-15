"use client";

import { useEffect, useRef } from "react";
import s from "@/components/YearPicker.module.css";

/* The timeline at the bottom right (the Figma year picker, 28:126), now fed by the layer's real dates.
   Only shown in "By Area" mode, where the song reads ONE date's picture: this picks which one.
   One bar per date; its height is the place's average value on that date, so the bars are a tiny chart too.
   Keyboard: Tab to the selected bar, then Left / Right / Home / End (a radio group).
   Every date is a full-height button with the bar drawn inside it, so a short bar is as easy to hit as a tall one. */
export function DatePicker({ layer, dates, levels, index, onPick }: { layer: string; dates: string[]; levels: number[]; index: number; onPick: (i: number) => void }) {
  const bars = useRef<HTMLDivElement>(null);
  const last = dates.length - 1;
  const pick = (i: number) => onPick(Math.min(last, Math.max(0, i)));
  // Bar heights span this place's own lowest to highest date, so small changes (a steady ocean) still show.
  const lo = Math.min(...levels), range = Math.max(...levels) - lo || 1;
  // Arrow keys change the date: keep keyboard focus on the bar that is now selected.
  useEffect(() => {
    const box = bars.current;
    if (box && box.contains(document.activeElement)) box.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [index]);
  return (
    <div className={s.picker}>
      <div className={s.timeline}>
        <div className={s.labels}>
          <p className={s.title}>Pick a date · {layer}</p>
          <p className={s.yearNav}>
            <span aria-live="polite">{dates[index]}</span>
            <button className={s.step} style={{ marginLeft: 12 }} aria-label="Earlier date" aria-disabled={index === 0} onClick={() => pick(index - 1)}>‹</button>
            <button className={s.step} style={{ marginLeft: 4 }} aria-label="Later date" aria-disabled={index === last} onClick={() => pick(index + 1)}>›</button>
          </p>
        </div>
        <div
          ref={bars}
          className={s.bars}
          style={{ gap: 2 }}
          role="radiogroup"
          aria-label={`Date of the ${layer} picture`}
          onKeyDown={(e) => {
            const to = e.key === "ArrowLeft" || e.key === "ArrowUp" ? index - 1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? index + 1 : e.key === "Home" ? 0 : e.key === "End" ? last : null;
            if (to === null) return;
            e.preventDefault();
            pick(to);
          }}
        >
          {dates.map((d, i) => (
            <button
              key={d + i}
              className={s.hit}
              role="radio"
              aria-checked={i === index}
              aria-label={d}
              tabIndex={i === index ? 0 : -1}
              onClick={() => pick(i)}
            >
              <span className={`${s.bar} ${i === index ? s.selected : i > index ? s.future : ""}`} style={{ height: 10 + Math.round(((levels[i] - lo) / range) * 24) }} />
            </button>
          ))}
        </div>
        <div className={s.years}>
          <p>{dates[0]}</p>
          <p>{dates[Math.round(last / 2)]}</p>
          <p>{dates[last]}</p>
        </div>
      </div>
    </div>
  );
}
