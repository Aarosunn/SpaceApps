import s from "./YearPicker.module.css";

const HEIGHTS = [12, 14, 12, 16, 14, 18, 16, 14, 18, 20, 16, 18, 22, 20, 18, 24, 22, 26, 30, 24, 22, 28, 32, 30, 34];
const FIRST = 2001;

/* Year picker (no background), Figma 28:126. One bar per year 2001-2025. */
export function YearPicker({ layer = "Wildfires", year = 2019 }: { layer?: string; year?: number }) {
  return (
    <div className={s.picker}>
      <div className={s.timeline}>
        <div className={s.labels}>
          <p className={s.title}>Pick a year · {layer}</p>
          <p className={s.yearNav}>
            {year}
            <span className={s.arrow} style={{ marginLeft: 14.8 }}>←</span>
            <span className={s.arrow} style={{ marginLeft: 10, marginRight: 0 }}>→</span>
          </p>
        </div>
        <div className={s.bars} role="radiogroup" aria-label="Year">
          {HEIGHTS.map((h, i) => {
            const y = FIRST + i;
            const cls = y === year ? s.selected : y > year ? s.future : "";
            return <div key={y} className={`${s.bar} ${cls}`} style={{ height: h }} role="radio" aria-checked={y === year} aria-label={String(y)} />;
          })}
        </div>
        <div className={s.years}>
          {[2001, 2007, 2013, 2019, 2025].map((y) => (
            <p key={y}>{y}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
