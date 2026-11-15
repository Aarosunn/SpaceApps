"""build_layer_timelines.py - global timelines for the EarthFM "Wildfires" and "Global heat" layers.

    bash extract_layer_frames.sh          (in the cache folder: cuts 30 frames out of each cached NASA movie)
    python build_layer_timelines.py <cache folder> <EarthFM/public/sonify>

Needs numpy and Pillow. Writes, for each layer, <out>/<layer>-global.json and <out>/<layer>/0.jpg, 1.jpg, ...
Same format as build_global_sst_timeline.py: 18 x 36 cells of 10 degrees, row 0 = 90..80 N, column 0 = 180..170 W,
values 0..1 over meta.value_range, 0 = no data (real values are kept at 0.03 or above), song time proportional to date.

fires  NASA SVS 5113, fires_frp_VIIRS_eq_nl_2048p30.mp4 (clean equirectangular, no labels). 900 frames cover
       13 Nov 2024 to 13 Nov 2026, so frame n is 730/899 days after the start. Fires are bright warm dots on a dark map
       with a blue-grey ocean. Value = fire pixels per 1000 pixels of the square. This counts picture pixels, not area burned.
heat   NASA SVS 5207, 2023GISTEMP_Map_SOS.mp4 (clean equirectangular). Frame n shows year 1881 + n // 6 (time.txt).
       Colour -> anomaly through the page's colour bar giss_navy_anomaly_Vertical-both.png (-2 C at the bottom, +2 C at the top).
"""
import datetime as dt
import warnings
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

import p5_colormap as p5

warnings.simplefilter('ignore', RuntimeWarning)   # a cell with no readable pixel has no mean: handled below
CACHE, OUT = sys.argv[1], sys.argv[2]
ROWS, COLS, SONG_SECONDS, FLOOR = 18, 36, 68.6, 0.03


def blocks(a):
    """(H, W) -> (ROWS, COLS, pixels per cell)."""
    H, W = a.shape
    return a.reshape(ROWS, H // ROWS, COLS, W // COLS).transpose(0, 2, 1, 3).reshape(ROWS, COLS, -1)


def write(layer, frames, meta):
    """frames: list of {'date', 'x' (position on the time axis), 'grid' (ROWS, COLS; 0 = no data), 'img'}."""
    x0, x1 = frames[0]['x'], frames[-1]['x']
    lat = np.radians(90 - (np.arange(ROWS) + 0.5) * 180 / ROWS)
    out = []
    for i, f in enumerate(frames):
        g = f['grid']
        w = np.cos(lat)[:, None] * (g > 0)
        both = (g > 0) & (frames[i - 1]['grid'] > 0) if i else None
        motion = float(np.abs(g - frames[i - 1]['grid'])[both].mean()) if i and both.any() else 0.0
        out.append({'t': round(SONG_SECONDS * (f['x'] - x0) / (x1 - x0), 3), 'date': f['date'],
                    'mean': round(float((g * w).sum() / w.sum()) if w.sum() else 0.0, 4),
                    'grid': [round(float(v), 4) for v in g.ravel()], 'motion': round(min(1.0, motion), 4), 'events': []})
    tl = {'meta': dict(meta, fps=len(out) / SONG_SECONDS, frame_step=1, n_frames=len(out), grid=[ROWS, COLS], coverage='global',
                       dates=[f['date'] for f in out]), 'frames': out}
    with open(os.path.join(OUT, f'{layer}-global.json'), 'w') as fh:
        json.dump(tl, fh, separators=(',', ':'))
    os.makedirs(os.path.join(OUT, layer), exist_ok=True)
    for i, f in enumerate(frames):
        f['img'].resize((1024, 512), Image.LANCZOS).save(os.path.join(OUT, layer, f'{i}.jpg'), quality=78, optimize=True)
    assert all(0 <= f['mean'] <= 1 and all(v == 0 or FLOOR <= v <= 1 for v in f['grid']) for f in out)
    print(f'{layer}: {len(out)} dates {out[0]["date"]} .. {out[-1]["date"]}, {os.path.getsize(os.path.join(OUT, layer + "-global.json"))} bytes')


def cell(g, lat, lon):
    return g[int((90 - lat) // 10), int((lon + 180) // 10)]


# ---------------------------------------------------------------- fires
paths = sorted(glob.glob(os.path.join(CACHE, 'fires', 'f_*.png')))
fracs, imgs = [], []
for p in paths:
    im = Image.open(p).convert('RGB')
    a = np.asarray(im).astype(int)
    fire = (a[..., 0] > 110) & (a[..., 0] > a[..., 2] + 40)         # warm and bright; the ocean is bluer than it is red
    fracs.append(blocks(fire).mean(axis=2) * 1000)                   # fire pixels per 1000 pixels of the cell
    imgs.append(im)
fracs = np.array(fracs)
keep = fracs.sum(axis=(1, 2)) > 0                                    # the movie's last frame is blank: drop frames with no fire at all
top = float(np.percentile(fracs[fracs > 0], 90))                     # the busiest 10 % of burning cells all read as the top value
start = dt.date(2024, 11, 13)
frames = []
for i, (fr, im) in enumerate(zip(fracs, imgs)):
    if not keep[i]:
        continue
    v = np.clip(fr / top, 0, 1)
    days = round(31 * i * 730 / 899)
    frames.append({'date': (start + dt.timedelta(days=days)).isoformat(), 'x': days, 'grid': np.where(v >= FLOOR, v, 0.0), 'img': im})
write('fires', frames, {'source': 'NASA SVS 5113, fires_frp_VIIRS_eq_nl_2048p30.mp4, every 31st frame', 'value_range': [0.0, round(top, 1)],
                        'notes': 'value = fire pixels per 1000 pixels of the 10-degree cell (bright warm pixels on the dark map); '
                                 '0 = no fire seen; the top of the range is the 90th percentile of cells with fire, higher counts read as the top'})
allg = np.array([f['grid'] for f in frames])
africa = max(cell(g, -8, 22) for g in allg)                           # Angola / DR Congo: burns every dry season
print(f'  top of range {top:.1f} px/1000 | central Africa peak {africa:.2f} | mid-Pacific max {max(cell(g, 0, -150) for g in allg):.2f} '
      f'| Sahara max {max(cell(g, 23, 10) for g in allg):.2f} | cells with fire per date {int((allg > 0).sum(axis=(1, 2)).min())}..{int((allg > 0).sum(axis=(1, 2)).max())}')
assert africa > 0.3 and max(cell(g, 0, -150) for g in allg) == 0, 'central Africa should burn and the open Pacific should not'

# ---------------------------------------------------------------- heat
bar = np.asarray(Image.open(os.path.join(CACHE, 'giss_navy_anomaly_Vertical-both.png')).convert('RGB'))
legend = bar[636:35:-1, 150:168].mean(axis=1).round().astype(np.uint8)                     # bottom (-2 C) to top (+2 C)
paths = sorted(glob.glob(os.path.join(CACHE, 'heat', 'f_*.png')))[:30]                     # the 31st repeats 2023
frames = []
for i, p in enumerate(paths):
    im = Image.open(p).convert('RGB')
    # tol 0.09: the map's deepest reds and blues are darker than the ends of the bar (values beyond +-2 C); they snap to the ends
    value = p5.invert_colormap(np.asarray(im.resize((720, 360), Image.BOX)), legend, tol=0.09)   # 0..1 = -2..+2 C, NaN = no match
    b = blocks(value)
    ok = np.isfinite(b)
    mean = np.where(ok.mean(axis=2) > 0.3, np.nanmean(np.where(ok, b, np.nan), axis=2), 0.0) if ok.any() else np.zeros((ROWS, COLS))
    year = min(2023, 1881 + (30 * i) // 6)                                               # frames 852.. all show 2023
    frames.append({'date': str(year), 'x': year, 'grid': np.where(mean > 0, np.maximum(mean, FLOOR), 0.0), 'img': im, 'readable': float(ok.mean())})
write('heat', frames, {'source': 'NASA SVS 5207, 2023GISTEMP_Map_SOS.mp4, every 30th frame', 'value_range': [-2.0, 2.0],
                       'notes': 'value = surface temperature anomaly against 1951-1980 (GISTEMP, 24-month mean) read from pixel colour via the '
                                'page colour bar, 0..1 = -2..+2 C (the bar stops there); 0 = no data; one frame every 5 years'})
anom = lambda f: float(np.mean(f['grid'][f['grid'] > 0])) * 4 - 2
print(f'  readable pixels {min(f["readable"] for f in frames):.2f}..{max(f["readable"] for f in frames):.2f} | mean anomaly {frames[0]["date"]}: '
      f'{anom(frames[0]):+.2f} C, 1951: {anom(frames[14]):+.2f} C, {frames[-1]["date"]}: {anom(frames[-1]):+.2f} C | Arctic (75N, 60E) 2023: {cell(frames[-1]["grid"], 75, 60) * 4 - 2:+.2f} C')
assert anom(frames[-1]) > anom(frames[0]) + 0.8 and abs(anom(frames[14])) < 0.35, '2023 should be much warmer than 1881, and 1951 near zero'
assert cell(frames[-1]['grid'], 75, 60) > 0.9 and min(f['readable'] for f in frames) > 0.85, 'the Arctic in 2023 is far above +1 C, and nearly every pixel should be readable'
print('checks passed')
