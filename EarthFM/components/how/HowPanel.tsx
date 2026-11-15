"use client";

/* "How this sound is made": the NASA picture around one place, the grid it is cut into, and the one cell
   the melody reads. A "?" opens a pop-up that explains the whole chain.
   Everything shown comes from recipeFor() in lib/sonify/useJukebox.ts, which calls the same sonify-core
   functions the player uses, so the picture cannot drift from the sound. */
import { useEffect, useRef, useState } from "react";
import type { SoundRecipe } from "@/lib/sonify/useJukebox";
import { asset } from "@/components/asset";
import s from "./HowPanel.module.css";

type Props = {
  placeName: string;
  surface: "water" | "ice" | "land";
  recipe: SoundRecipe | null;
  live: boolean; // this place is the one playing now
  getTime: () => number; // clip clock, seconds
  onClose: () => void;
};

const CW = 352, CELL = 44, VIEW_COLS = 8, VIEW_ROWS = 5; // 8 x 5 cells of 10 degrees around the place
const CH = CELL * VIEW_ROWS;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso?: string) => (iso ? `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : "");

export function HowPanel({ placeName, surface, recipe, live, getTime, onClose }: Props) {
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
    const [rows, cols] = r.grid;
    const toC = (u: number) => r.valueRange[0] + u * (r.valueRange[1] - r.valueRange[0]);
    // The window of cells shown: centred on the place's cell, kept inside the map.
    const c0 = Math.min(cols - VIEW_COLS, Math.max(0, r.cell.col - Math.floor(VIEW_COLS / 2)));
    const r0 = Math.min(rows - VIEW_ROWS, Math.max(0, r.cell.row - Math.floor(VIEW_ROWS / 2)));
    const imgs = r.frames.map((_, i) => {
      const im = new Image();
      im.src = asset(`/sonify/sst/${i}.jpg`);
      im.onload = () => draw();
      return im;
    });
    let raf = 0, last = "";
    function draw() {
      const t = live ? getTime() : 0;
      const at = r.noteAt(t), f = r.frames[at.frame], im = imgs[at.frame];
      g.setTransform(k, 0, 0, k, 0, 0);
      g.fillStyle = "#0d140f";
      g.fillRect(0, 0, CW, CH);
      // the NASA picture, cropped to the window (the image is the whole globe, equirectangular)
      if (im.complete && im.naturalWidth) {
        const sx = (c0 / cols) * im.naturalWidth, sy = (r0 / rows) * im.naturalHeight;
        g.drawImage(im, sx, sy, (VIEW_COLS / cols) * im.naturalWidth, (VIEW_ROWS / rows) * im.naturalHeight, 0, 0, CW, CH);
      }
      // the grid, with the temperature read from each cell
      g.lineWidth = 1;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "500 11px ui-monospace, SFMono-Regular, monospace";
      for (let rr = 0; rr < VIEW_ROWS; rr++)
        for (let cc = 0; cc < VIEW_COLS; cc++) {
          const x = cc * CELL, y = rr * CELL, v = f.grid[(r0 + rr) * cols + (c0 + cc)];
          g.strokeStyle = "rgba(244,241,232,0.22)";
          g.strokeRect(x + 0.5, y + 0.5, CELL, CELL);
          if (v > 0.02) {
            g.fillStyle = "rgba(13,20,15,0.55)";
            g.fillRect(x + 7, y + CELL / 2 - 8, CELL - 14, 16);
            g.fillStyle = "#f4f1e8";
            g.fillText(toC(v).toFixed(0) + "°", x + CELL / 2, y + CELL / 2 + 0.5);
          }
        }
      // the cell this place's melody reads (or the whole window, when it plays the ocean-wide average)
      const pulse = live ? 0.5 + 0.5 * Math.sin(performance.now() / 260) : 1;
      g.shadowColor = "#d8f07a";
      g.shadowBlur = 6 + 10 * pulse;
      g.strokeStyle = "#d8f07a";
      g.lineWidth = 3;
      if (r.cell.hasCell) g.strokeRect((r.cell.col - c0) * CELL + 1.5, (r.cell.row - r0) * CELL + 1.5, CELL - 3, CELL - 3);
      else g.strokeRect(1.5, 1.5, CW - 3, CH - 3);
      g.shadowBlur = 0;

      const next = `${toC(at.value).toFixed(1)}|${at.note}|${f.date ?? ""}`;
      if (next !== last) {
        last = next;
        setNow({ temp: `${toC(at.value).toFixed(1)} °C`, note: at.note, date: prettyDate(f.date) });
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
          aria-label={
            recipe
              ? `NASA sea surface temperature picture around ${placeName}, cut into 10-degree squares with the temperature in each. ${recipe.cell.hasCell ? "One square is outlined: the melody reads that one." : "The whole picture is outlined: the melody reads the ocean-wide average."}`
              : "Loading the data"
          }
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
            : recipe.cell.hasCell
              ? "The glowing square is the water this place plays."
              : `No ${surface === "water" ? "reading here" : surface + " data"} yet, so this place plays the ocean-wide average.`}
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
              <li><b>Grid.</b> The map is cut into 10-degree squares ({recipe.grid[0]} × {recipe.grid[1]}) and each square is averaged. Your place reads the square it sits in.</li>
              <li><b>Temperature → pitch.</b> Warmer water plays a higher note. {toC(recipe.lo).toFixed(0)} °C is the lowest note ({recipe.scale[0]}) and {toC(recipe.hi).toFixed(0)} °C the highest ({recipe.scale[recipe.scale.length - 1]}), in {recipe.scale.length} steps of about {((toC(recipe.hi) - toC(recipe.lo)) / recipe.scale.length).toFixed(1)} °C. The range is the same for every place, so a cold sea always sounds lower than a warm one.</li>
              <li><b>Time.</b> One song runs through the dates in order, so the melody moves as that water warms and cools through the year.</li>
              <li><b>Rhythm.</b> The more the map changes between dates, the more notes you hear ({recipe.minPulses} to {recipe.maxPulses} every {recipe.barSeconds} seconds).</li>
              <li><b>Reference blip.</b> A short fixed note every {recipe.barSeconds} seconds marks the middle of the range ({toC((recipe.lo + recipe.hi) / 2).toFixed(0)} °C). Above it is warmer, below it is cooler.</li>
              <li><b>Background tone.</b> A soft drone gets louder and brighter as the temperature rises.</li>
            </ol>
            <p className={s.limit}><b>Limits.</b> Only six dates in 2007 are used. Land and ice have no data yet, so they play the ocean-wide average. All sound is synthesized in your browser; nothing is recorded.</p>
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
