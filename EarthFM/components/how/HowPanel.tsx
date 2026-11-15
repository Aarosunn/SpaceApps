"use client";

/* "How this sound is made": the NASA picture around one place, the grid it is cut into, and what the melody is
   reading right now. In "by area" mode a square sweeps across the picture; in "by time" mode the whole picture is
   read at once while the dates advance. A "?" opens a pop-up that explains the chain.
   Everything shown comes from recipeFor() in lib/sonify/useJukebox.ts, the same song the player is given,
   so the picture cannot drift from the sound. */
import { useEffect, useRef, useState } from "react";
import { VIEW_COLS, VIEW_ROWS, prettyDate, type SoundRecipe } from "@/lib/sonify/useJukebox";
import { asset } from "@/components/asset";
import s from "./HowPanel.module.css";

type Props = {
  placeName: string;
  recipe: SoundRecipe | null;
  live: boolean; // this place is the one playing now
  getTime: () => number; // clip clock, seconds
  onClose: () => void;
};

const CW = 352, CELL = CW / VIEW_COLS, CH = CELL * VIEW_ROWS;

export function HowPanel({ placeName, recipe, live, getTime, onClose }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [help, setHelp] = useState(false);
  const [now, setNow] = useState({ value: "", note: "", date: "" });

  // Close the pop-up with Escape.
  useEffect(() => {
    if (!help) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHelp(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [help]);

  useEffect(() => {
    if (!recipe) return;
    const r = recipe, cv = canvas.current!;
    const k = window.devicePixelRatio || 1;
    cv.width = CW * k;
    cv.height = CH * k;
    const g = cv.getContext("2d")!;
    const [rows, cols] = r.grid, { r0, c0 } = r.window;
    const short = (v: number) => r.fmt(v).replace(r.layer.unit, ""); // the number alone, for the small squares
    // Load every date's picture up front, so playback never waits on the network.
    const imgs = r.frames.map((_, i) => {
      const im = new Image();
      im.src = asset(`${r.layer.images}/${i}.jpg`);
      im.onload = () => draw();
      return im;
    });
    let raf = 0, last = "", shown = -1;
    function draw() {
      const t = live ? getTime() : 0;
      const st = r.stepAt(t), f = r.frames[st.frame];
      if (imgs[st.frame].complete && imgs[st.frame].naturalWidth) shown = st.frame; // else keep the last picture that loaded
      g.setTransform(k, 0, 0, k, 0, 0);
      g.fillStyle = "#17201a";
      g.fillRect(0, 0, CW, CH);
      // the NASA picture, cropped to the window (the image is the whole globe, equirectangular)
      if (shown >= 0) {
        const im = imgs[shown];
        g.drawImage(im, (c0 / cols) * im.naturalWidth, (r0 / rows) * im.naturalHeight, (VIEW_COLS / cols) * im.naturalWidth, (VIEW_ROWS / rows) * im.naturalHeight, 0, 0, CW, CH);
      }
      // the grid, with the value read from each square
      g.lineWidth = 1;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "500 10px ui-monospace, SFMono-Regular, monospace";
      for (let rr = 0; rr < VIEW_ROWS; rr++)
        for (let cc = 0; cc < VIEW_COLS; cc++) {
          const x = cc * CELL, y = rr * CELL, v = f.grid[(r0 + rr) * cols + (c0 + cc)];
          g.strokeStyle = "rgba(244,241,232,0.3)";
          g.strokeRect(x + 0.5, y + 0.5, CELL, CELL);
          if (v > 0.02) {
            g.fillStyle = "rgba(23,32,26,0.6)";
            g.fillRect(x + 4, y + CELL / 2 - 8, CELL - 8, 16);
            g.fillStyle = "#f4f1e8";
            g.fillText(short(v), x + CELL / 2, y + CELL / 2 + 0.5);
          }
        }
      // where the place itself is: a small ring
      g.strokeStyle = "#f4f1e8";
      g.lineWidth = 2;
      g.beginPath();
      g.arc((r.home.col - c0 + 0.5) * CELL, (r.home.row - r0 + 0.5) * CELL, CELL / 2 - 5, 0, 2 * Math.PI);
      g.stroke();
      // what is being read now: one square (by area) or the whole picture (by time)
      g.strokeStyle = "#d8f07a";
      g.lineWidth = 3;
      if (r.mode === "area") {
        const x = (st.col - c0) * CELL, y = (st.row - r0) * CELL;
        g.fillStyle = "rgba(216,240,122,0.45)";
        g.fillRect(x, y, CELL, CELL);
        g.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
      } else g.strokeRect(1.5, 1.5, CW - 3, CH - 3);

      const next = `${st.value}|${st.note}|${f.date}`;
      if (next !== last) {
        last = next;
        setNow({ value: st.value === null ? r.layer.noData : r.fmt(st.value), note: st.note ?? "rest", date: prettyDate(f.date) });
      }
      if (live) raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(raf);
      imgs.forEach((im) => (im.onload = null));
    };
  }, [recipe, live, getTime]);

  const r = recipe;
  const area = r?.mode === "area";

  return (
    <>
      <section className={s.panel} aria-label={`How the sound for ${placeName} is made`}>
        <div className={s.head}>
          <div className={s.titles}>
            <p className={s.kicker}>HOW THIS SOUND IS MADE{r ? ` · ${r.layer.label.toUpperCase()}` : ""}</p>
            <p className={s.title}>{placeName}</p>
          </div>
          <button className={s.round} onClick={() => setHelp(true)} aria-haspopup="dialog" aria-label="Explain exactly how the music is generated" title="How does this work?">?</button>
          <button className={s.round} onClick={onClose} aria-label="Close this panel" title="Close">×</button>
        </div>
        <canvas
          ref={canvas}
          className={s.canvas}
          style={{ width: CW, height: CH }}
          role="img"
          aria-label={
            r
              ? `NASA ${r.layer.label.toLowerCase()} picture around ${placeName}, cut into ${VIEW_COLS} by ${VIEW_ROWS} squares of 10 degrees with the value in each. ${area ? "A highlighted square moves across it, left to right and top to bottom: that is the square being played." : "The whole picture is outlined: its average is what is being played, as the dates advance."}`
              : "Loading the data"
          }
        />
        {r && (
          <div className={s.readout} role="status" aria-live="off">
            <span className={s.big}>{now.value}</span>
            <span className={s.arrow} aria-hidden="true">→</span>
            <span className={s.note}>{now.note}</span>
            <span className={s.date}>{now.date}</span>
          </div>
        )}
        <p className={s.hint}>
          {!r
            ? "Loading the data…"
            : r.rests.size >= r.padLevel.length
              ? `There is no ${r.layer.label.toLowerCase()} data in this picture, so there is no melody here. Try another place or another layer.`
              : !live
                ? "Play this place to watch it."
                : area
                  ? "By area: the green square sweeps across the picture. Each square it lands on is one note."
                  : "By time: the melody follows the average of the whole picture, from the first date to the last."}
        </p>
      </section>

      {help && r && (
        <div className={s.backdrop} onClick={() => setHelp(false)}>
          <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="how-title" onClick={(e) => e.stopPropagation()}>
            <div className={s.head}>
              <p id="how-title" className={s.dialogTitle}>How the music is made · {r.layer.label}</p>
              <button className={s.round} onClick={() => setHelp(false)} aria-label="Close" autoFocus>×</button>
            </div>
            <ol className={s.steps}>
              <li><b>NASA picture.</b> {r.layer.picture} {r.frames.length} dates are used, from {r.dates[0]} to {r.dates[1]}.</li>
              <li><b>Picture → number.</b> {r.layer.reading}</li>
              <li><b>Grid.</b> The whole map is cut into 10-degree squares ({r.grid[0]} × {r.grid[1]}) and each square is averaged. The panel shows the {VIEW_COLS} × {VIEW_ROWS} squares around your place; the ring marks the place itself.</li>
              {area ? (
                <li><b>By area: the sweep.</b> The melody reads one square every {r.stepSeconds} seconds: left to right along the top row, then the next row down, then back to the start. One pass takes {r.passSeconds} seconds. Notes on the left of the picture come from your left speaker, notes on the right from your right. While the sweep repeats, the picture moves through the dates in order.</li>
              ) : (
                <li><b>By time: the whole picture.</b> The melody follows the average of all the squares in the picture, and one song runs from the first date to the last. You hear how this region changes over time rather than how it varies from place to place.</li>
              )}
              <li><b>Number → pitch.</b> Higher notes are {r.layer.higher}. {r.fmt(r.lo)} is the lowest note ({r.scale[0]}) and {r.fmt(r.hi)} the highest ({r.scale[r.scale.length - 1]}), in {r.scale.length} steps. The range is the same everywhere, so two places can be compared by ear.</li>
              <li><b>Silence.</b> {r.layer.silence}</li>
              <li><b>Reference blip and background tone.</b> A short fixed note every {r.barSeconds} seconds marks the middle of the range ({r.fmt((r.lo + r.hi) / 2)}). A soft drone follows the average of the whole picture: louder and brighter when it is higher.</li>
            </ol>
            <p className={s.limit}><b>Limits.</b> {r.layer.limits} All sound is synthesized in your browser; nothing is recorded.</p>
            <p className={s.credit}>Data: {r.layer.credit}</p>
          </div>
        </div>
      )}
    </>
  );
}

/* Small "?" shown when the panel is closed. */
export function HowButton({ onClick }: { onClick: () => void }) {
  return (
    <button className={s.fab} onClick={onClick} aria-label="Show how this sound is made" title="How this sound is made (?)">?</button>
  );
}
