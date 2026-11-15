"""build_global_sst_timeline.py - a GLOBAL sea-surface-temperature timeline for the EarthFM map.

    python fetch_sst_frames.py                      (downloads and caches the frames; safe to re-run)
    python build_global_sst_timeline.py <folder with fNNNNN.tif frames> <out.json> [folder for the pictures]

Why: the app picks a place's grid cell by latitude and longitude. That is only right if the grid covers
the whole globe. The earlier timeline came from a regional clip with a moving camera, so most places read
the wrong water, or land.

Input: flat global frames of NASA SVS 3912 (2048 x 1024, equirectangular: row 0 = 90 N, column 0 = 180 W),
named f<frame>.tif, with dates.txt (frame number -> date) beside them, plus the page's colour bar (data/cbar_310x95_rgba.raw, 0 to 32 C). Needs numpy and Pillow.

Output: the timeline format the engine reads. Each frame is one date; time in the song is proportional
to the date, so the song runs from the first date to the last. Grid = 18 x 36 cells of 10 degrees.
With a third argument it also writes one small JPEG per date (0.jpg, 1.jpg, ...) for the app to show.
"""
import datetime as dt
import glob
import json
import os
import re
import sys

import numpy as np
from PIL import Image

import p5_colormap as p5

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = sys.argv[1], sys.argv[2]
ROWS, COLS, SONG_SECONDS = 18, 36, 68.6          # 68.6 s = the length the player already uses
# frame number -> date, from the list NASA publishes with the frames (flat_ecco2_dates.txt, cached as dates.txt)
with open(os.path.join(SRC, 'dates.txt')) as fh:
    DATES = {int(a): b[:10] for a, b in (line.split() for line in fh if line.strip())}
IMG = sys.argv[3] if len(sys.argv) > 3 else None

bar = np.fromfile(os.path.join(HERE, 'data', 'cbar_310x95_rgba.raw'), dtype=np.uint8).reshape(95, 310, 4)
legend = p5.legend_from_strip(bar[30:67, 16:290, :3])

frames = []
for path in sorted(glob.glob(os.path.join(SRC, 'f*.tif'))):
    n = int(re.search(r'f(\d+)\.tif$', path).group(1))
    if n not in DATES:
        continue
    full = Image.open(path).convert('RGB')
    rgb = np.asarray(full.resize((720, 360), Image.BOX))                                 # 0.5 degree pixels
    value = p5.invert_colormap(rgb, legend, hue_only=True)                               # 0..1 = 0..32 C, NaN = no colour
    H, W = value.shape
    lat = np.radians(90 - (np.arange(H) + 0.5) * 180 / H)
    w = np.cos(lat)[:, None] * np.isfinite(value)                                        # area weight, 0 where no data
    v = np.nan_to_num(value)
    blocks_w = w.reshape(ROWS, H // ROWS, COLS, W // COLS).sum(axis=(1, 3))
    blocks_v = (v * w).reshape(ROWS, H // ROWS, COLS, W // COLS).sum(axis=(1, 3))
    covered = np.isfinite(value).reshape(ROWS, H // ROWS, COLS, W // COLS).mean(axis=(1, 3))
    grid = np.where(covered > 0.03, blocks_v / np.maximum(blocks_w, 1e-12), 0.0)         # 0 = land / no data
    frames.append({'date': DATES[n], 'n': n, 'full': full, 'grid': grid, 'mean': float((v * w).sum() / w.sum()), 'readable': float(np.isfinite(value).mean())})

frames.sort(key=lambda f: f['date'])
day = lambda s: dt.date.fromisoformat(s).toordinal()
span = day(frames[-1]['date']) - day(frames[0]['date'])
out = []
for i, f in enumerate(frames):
    both = (f['grid'] > 0) & (frames[i - 1]['grid'] > 0) if i else None
    motion = float(np.abs(f['grid'] - frames[i - 1]['grid'])[both].mean()) if i else 0.0
    out.append({'t': round(SONG_SECONDS * (day(f['date']) - day(frames[0]['date'])) / span, 3), 'date': f['date'],
                'mean': round(f['mean'], 4), 'grid': [round(float(x), 4) for x in f['grid'].ravel()],
                'motion': round(min(1.0, motion), 4), 'events': []})
tl = {'meta': {'source': 'NASA SVS 3912, flat global frames ' + ', '.join(str(f['n']) for f in frames), 'fps': len(out) / SONG_SECONDS,
               'frame_step': 1, 'n_frames': len(out), 'grid': [ROWS, COLS], 'value_range': [0.0, 32.0], 'coverage': 'global',
               'dates': [f['date'] for f in out],
               'notes': 'value = sea surface temperature read from pixel hue via the page colour bar, 0..1 = 0..32 C; '
                        'grid = 10-degree cells, row 0 = 90..80 N, column 0 = 180..170 W, 0 = land or no data; '
                        'one frame per date, song time proportional to date; motion = mean change between dates'},
      'frames': out}
with open(OUT, 'w') as fh:
    json.dump(tl, fh, separators=(',', ':'))
if IMG:
    os.makedirs(IMG, exist_ok=True)
    for i, f in enumerate(frames):
        f['full'].resize((1024, 512), Image.LANCZOS).save(os.path.join(IMG, f'{i}.jpg'), quality=78, optimize=True)

# ---- sanity checks on the result (fail loudly rather than ship a wrong map) ----
g = np.array([f['grid'] for f in frames])
zonal = [float(np.mean(row[row > 0])) * 32 if (row > 0).any() else float('nan') for row in g[0]]
tropics, south = np.nanmean(zonal[8:10]), np.nanmean(zonal[14:16])           # 10N..10S and 50..70 S
cell = lambda la, lo: g[0][int((90 - la) // 10), int((lo + 180) // 10)] * 32
print(len(frames), 'dates:', frames[0]['date'], 'to', frames[-1]['date'], '| readable pixels per frame:', round(min(f['readable'] for f in frames), 2), 'to', round(max(f['readable'] for f in frames), 2))
print('first date, mean C by 10-degree band, north to south:', [None if x != x else round(x, 1) for x in zonal])
print(f'tropics {tropics:.1f} C, 50-70 S {south:.1f} C | equatorial Pacific (0, -150) {cell(-1, -150):.1f} C | Sahara (25, 10) {cell(25, 10):.1f} | N Atlantic (45, -35) {cell(45, -35):.1f} C')
assert tropics > 24 and south < 8, 'the tropics should be warm and the Southern Ocean cold'
assert cell(25, 10) == 0 and cell(-1, -150) > 20, 'the Sahara is land and the equatorial Pacific is warm water'
assert all(0 <= f['mean'] <= 1 and all(0 <= x <= 1 for x in f['grid']) for f in out)
print('wrote', OUT, f'({os.path.getsize(OUT)} bytes) - checks passed')
