"use client";

/* "How this sound is made": the NASA picture around one place, the grid it is cut into, and the square the
   melody is reading right now as it sweeps across the picture. A "?" opens a pop-up that explains the chain.
   Everything shown comes from recipeFor() in lib/sonify/useJukebox.ts, the same sweep the player is given,
   so the picture cannot drift from the sound. */
import { useEffect, useRef, useState } from "react";
import { VIEW_COLS, VIEW_ROWS, type SoundRecipe } from "@/lib/sonify/useJukebox";
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
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso?: string) => (iso ? `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : "");

export function HowPanel({ placeName, recipe, live, getTime, onClose }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [help, setHelp] = useState(false);
  const [now, setNow] = useState({ temp: "", note: "", date: "" });

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
    const toC = (u: number) => r.valueRange[0] + u * (r.valueRange[1] - r.valueRange[0]);
    // Load every date's picture up front, so the sweep never waits on the network while it plays.
    const imgs = r.frames.map((_, i) => {
      const im = new Image();
      im.src = asset(`/sonify/sst/${i}.jpg`);
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
      // the grid, with the temperature read from each square
      g.lineWidth = 1;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "500 11px ui-monospace, SFMono-Regular, monospace";
      for (let rr = 0; rr < VIEW_ROWS; rr++)
        for (let cc = 0; cc < VIEW_COLS; cc++) {
          const x = cc * CELL, y = rr * CELL, v = f.grid[(r0 + rr) * cols + (c0 + cc)];
          g.strokeStyle = "rgba(244,241,232,0.3)";
          g.strokeRect(x + 0.5, y + 0.5, CELL, CELL);
          if (v > 0.02) {
            g.fillStyle = "rgba(23,32,26,0.6)";
            g.fillRect(x + 7, y + CELL / 2 - 8, CELL - 14, 16);
            g.fillStyle = "#f4f1e8";
            g.fillText(toC(v).toFixed(0) + "°", x + CELL / 2, y + CELL / 2 + 0.5);
          }
        }
      // where the place itself is: a small ring
      g.strokeStyle = "#f4f1e8";
      g.lineWidth = 2;
      g.beginPath();
      g.arc((r.home.col - c0 + 0.5) * CELL, (r.home.row - r0 + 0.5) * CELL, CELL / 2 - 5, 0, 2 * Math.PI);
      g.stroke();
      // the square being read now
      const x = (st.col - c0) * CELL, y = (st.row - r0) * CELL;
      g.fillStyle = "rgba(216,240,122,0.45)";
      g.fillRect(x, y, CELL, CELL);
      g.strokeStyle = "#d8f07a";
      g.lineWidth = 3;
      g.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);

      const next = `${st.value}|${st.note}|${f.date}`;
      if (next !== last) {
        last = next;
        setNow({ temp: st.value === null ? "Land" : `${toC(st.value).toFixed(1)} °C`, note: st.note ?? "rest", date: prettyDate(f.date) });
      }
      if (live) raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(raf);
      imgs.forEach((im) => (im.onload = null));
    };
  }, [recipe, live, getTime]);

  const toC = (u: number) => (recipe ? recipe.valueRange[0] + u * (recipe.valueRange[1] - recipe.valueRange[0]) : 0);
  const dates = recipe?.frames.map((f) => f.date).filter(Boolean) as string[] | undefined;

  return (
    <>
      <section className={s.panel} aria-label={`How the sound for ${placeName} is made`}>
        <div className={s.head}>
          <div className={s.titles}>
            <p className={s.kicker}>HOW THIS SOUND IS MADE</p>
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
          aria-label={recipe ? `NASA sea surface temperature picture around ${placeName}, cut into ${VIEW_COLS} by ${VIEW_ROWS} squares of 10 degrees with the temperature in each. A highlighted square moves across it, left to right and top to bottom: that is the square being played.` : "Loading the data"}
        />
        {recipe && (
          <div className={s.readout} role="status" aria-live="off">
            <span className={s.big}>{now.temp}</span>
            <span className={s.arrow} aria-hidden="true">→</span>
            <span className={s.note}>{now.note}</span>
            <span className={s.date}>{now.date}</span>
          </div>
        )}
        <p className={s.hint}>
          {!recipe
            ? "Loading the data…"
            : recipe.oceanCells === 0
              ? "There is no ocean in this picture, so there is no melody here. Try a place nearer the sea."
              : live
                ? "The green square sweeps across the picture. Each square it lands on is one note."
                : "Play this place to watch the sweep."}
        </p>
      </section>

      {help && recipe && (
        <div className={s.backdrop} onClick={() => setHelp(false)}>
          <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="how-title" onClick={(e) => e.stopPropagation()}>
            <div className={s.head}>
              <p id="how-title" className={s.dialogTitle}>How the music is made</p>
              <button className={s.round} onClick={() => setHelp(false)} aria-label="Close" autoFocus>×</button>
            </div>
            <ol className={s.steps}>
              <li><b>NASA picture.</b> A sea-surface-temperature map from NASA&apos;s Scientific Visualization Studio (SVS 3912), on {dates?.length} dates from {prettyDate(dates?.[0])} to {prettyDate(dates?.[dates.length - 1])}.</li>
              <li><b>Colour → temperature.</b> Each pixel&apos;s colour is matched to NASA&apos;s colour bar (blue 0 °C to red 32 °C) to read a temperature.</li>
              <li><b>Grid.</b> The whole map is cut into 10-degree squares ({recipe.grid[0]} × {recipe.grid[1]}) and each square is averaged. The panel shows the {VIEW_COLS} × {VIEW_ROWS} squares around your place; the ring marks the place itself.</li>
              <li><b>Sweep.</b> The melody reads one square every {recipe.stepSeconds} seconds: left to right along the top row, then the next row down, then back to the start. One pass takes {recipe.passSeconds} seconds. Notes on the left of the picture come from your left speaker, notes on the right from your right.</li>
              <li><b>Temperature → pitch.</b> Warmer water plays a higher note. {toC(recipe.lo).toFixed(0)} °C is the lowest note ({recipe.scale[0]}) and {toC(recipe.hi).toFixed(0)} °C the highest ({recipe.scale[recipe.scale.length - 1]}), in {recipe.scale.length} steps of about {((toC(recipe.hi) - toC(recipe.lo)) / recipe.scale.length).toFixed(1)} °C. The range is the same everywhere, so cold seas always sound lower than warm ones.</li>
              <li><b>Land is silence.</b> A square with no ocean plays nothing, so you can hear the coastline as gaps.</li>
              <li><b>Time.</b> While the sweep repeats, the picture moves through the dates in order, so each pass is a little later in the year.</li>
              <li><b>Reference blip and background tone.</b> A short fixed note every {recipe.barSeconds} seconds marks {toC((recipe.lo + recipe.hi) / 2).toFixed(0)} °C, the middle of the range. A soft drone follows the average of the whole picture: louder and brighter when it is warmer.</li>
            </ol>
            <p className={s.limit}><b>Limits.</b> This is a NASA ocean model for 2007–2008, not today&apos;s sea. Only the ocean has data. All sound is synthesized in your browser; nothing is recorded.</p>
            <p className={s.credit}>Data: NASA Scientific Visualization Studio, svs.gsfc.nasa.gov/3912</p>
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
