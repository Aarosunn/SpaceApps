#!/usr/bin/env python3
"""Data test: turn SST-anomaly frame pixels back into degrees C using NASA's colour bar.

Run inside WSL:  ~/eicenv/bin/python datatest_sst.py <frames_dir> <colorbar.jpg> <newest_date YYYY-MM-DD> <out.csv>

frames_dir holds 0001.jpg .. 0901.jpg (512x256, equirectangular, Greenwich in the centre),
dumped from NASA's "nodates" movie of SVS 5176. Frame k (0-based) = newest_date - (N-1-k) days.
"""
import datetime as dt
import glob
import os
import sys

import numpy as np
from PIL import Image

frames_dir, cbar_path, newest, out_csv = sys.argv[1:5]
newest = dt.date.fromisoformat(newest)

# ---- 1. colour bar -> lookup table (value in deg C for each colour along the bar)
cb = np.asarray(Image.open(cbar_path).convert("RGB")).astype(float)   # 512 x 1024 x 3
X0, X1 = 128, 896            # x of the -4 and +4 ticks in NASA's 1024-px preview
rows = cb[244:268, X0:X1 + 1, :]                                       # inside the bar
lut = np.median(rows, axis=0)                                          # 769 x 3
vals = np.linspace(-4.0, 4.0, lut.shape[0])
# drop the thin white tick marks (every 96 px) and their neighbours
keep = np.ones(len(vals), bool)
for t in range(0, lut.shape[0], 96):
    keep[max(0, t - 3):t + 4] = False
keep[len(vals) // 2 - 6:len(vals) // 2 + 7] = True                      # keep the near-white centre (0 deg C)
lut, vals = lut[keep], vals[keep]
LUT32 = lut.astype(np.float32)


def decode(rgb):
    """rgb: (n,3) float array -> (deg C, colour distance)."""
    out_v, out_d = [], []
    for s0 in range(0, len(rgb), 1500):                       # chunked: keeps memory small
        part = rgb[s0:s0 + 1500].astype(np.float32)
        d = ((part[:, None, :] - LUT32[None, :, :]) ** 2).sum(-1)
        i = d.argmin(1)
        out_v.append(vals[i]); out_d.append(np.sqrt(d[np.arange(len(i)), i]))
    return np.concatenate(out_v), np.concatenate(out_d)


def box(lon_w, lon_e, lat_n, lat_s, w=512, h=256):
    x0 = int(round((lon_w + 180) / 360 * w)); x1 = int(round((lon_e + 180) / 360 * w))
    y0 = int(round((90 - lat_n) / 180 * h)); y1 = int(round((90 - lat_s) / 180 * h))
    return slice(y0, y1), slice(x0, x1)


REGIONS = {
    "nino34 (5N-5S, 170W-120W)": box(-170, -120, 5, -5),
    "north_atlantic (60N-40N, 50W-20W)": box(-50, -20, 60, 40),
    "tropics_all (20N-20S)": box(-180, 180, 20, -20),
}
files = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")))
N = len(files)
series = {k: [] for k in REGIONS}
err = []
for k, f in enumerate(files):
    im = np.asarray(Image.open(f).convert("RGB")).astype(float)
    for name, (ys, xs) in REGIONS.items():
        px = im[ys, xs, :].reshape(-1, 3)
        if len(px) > 4000:
            px = px[::8]                                        # sample large regions
        sat = px.max(1) - px.min(1)
        ocean = px[sat > 12] if name != "nino34 (5N-5S, 170W-120W)" else px   # grey land has almost no saturation
        v, dist = decode(ocean)
        series[name].append(float(v.mean()))
        if name.startswith("nino34"):
            err.append(float(dist.mean()))
dates = [newest - dt.timedelta(days=N - 1 - k) for k in range(N)]
with open(out_csv, "w") as fh:
    fh.write("frame,date," + ",".join(n.split(" ")[0] for n in REGIONS) + "\n")
    for k in range(N):
        fh.write("%d,%s,%s\n" % (k, dates[k], ",".join("%.3f" % series[n][k] for n in REGIONS)))
print("frames:", N, "first", dates[0], "last", dates[-1])
print("mean colour distance to the bar in the Nino 3.4 box: %.1f (0-441 scale)" % (sum(err) / len(err)))
for name in REGIONS:
    s = np.array(series[name])
    print("\n" + name)
    print("  whole period: min %.2f on %s | max %.2f on %s | day-to-day change mean abs %.3f" % (
        s.min(), dates[int(s.argmin())], s.max(), dates[int(s.argmax())], np.abs(np.diff(s)).mean()))
    line = []
    y, m = dates[0].year, dates[0].month
    while (y, m) <= (dates[-1].year, dates[-1].month):
        idx = [i for i, d in enumerate(dates) if d.year == y and d.month == m]
        if idx:
            line.append("%d-%02d %+.2f" % (y, m, s[idx].mean()))
        m += 1
        if m == 13:
            y, m = y + 1, 1
    for i in range(0, len(line), 6):
        print("  " + " | ".join(line[i:i + 6]))
