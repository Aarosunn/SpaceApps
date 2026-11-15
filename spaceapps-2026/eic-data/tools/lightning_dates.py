#!/usr/bin/env python3
"""Date the team's 40 lightning frames with NASA's labels.txt and compare with the plan's count-based answer key.

Run inside WSL (needs numpy + Pillow):
  ~/eicenv/bin/python lightning_dates.py <lit_dir> <labels.txt> <out.csv>

<lit_dir>    spaceapps-2026/notes/feasibility/data/lit  (f_<seconds>.png, from the flat SOS movie at 60 fps)
<labels.txt> https://svs.gsfc.nasa.gov/vis/a000000/a005000/a005011/labels.txt  (one 'DD Mon YYYY HH:MM' per frame;
             NASA misprints the year as 2003 from 1 Jan 2023 onward)

The counting and the filter are copied from the plan (plans/2026-11-14-earthsound-v2.md, lines 305-311 and 491-502):
yellow = R>150 & G>130 & B<80; north = top half, south = bottom half; keep if n+s > 3000 and ratio > 2 or < 0.5.
"""
import csv
import datetime as dt
import glob
import os
import re
import sys

import numpy as np
from PIL import Image

lit_dir, labels, out_csv = sys.argv[1:4]


def parse(s):
    d = dt.datetime.strptime(s.strip(), "%d %b %Y %H:%M")
    return d.replace(year=2023) if d.year == 2003 else d


D = [parse(x) for x in open(labels, encoding="utf-8") if x.strip()]
rows = []
for p in glob.glob(os.path.join(lit_dir, "f_*.png")):
    t = float(re.search(r"f_([\d.]+)\.png$", p).group(1))
    a = np.asarray(Image.open(p).convert("RGB")).astype(int)
    mask = (a[..., 0] > 150) & (a[..., 1] > 130) & (a[..., 2] < 80)
    half = mask.shape[0] // 2
    n, s = int(mask[:half].sum()), int(mask[half:].sum())
    frame = round(t * 60)
    d = D[min(frame, len(D) - 1)]
    ratio = (n + 1) / (s + 1)
    kept = (n + s > 3000) and not (0.5 <= ratio <= 2)
    key = ("Northern summer" if n > s else "Southern summer") if kept else ""
    m = d.month
    season = "northern summer (Jun-Aug)" if m in (6, 7, 8) else "southern summer (Dec-Feb)" if m in (12, 1, 2) else "neither (%s)" % d.strftime("%B")
    match = "" if not kept else ("yes" if key.lower()[:8] == season[:8] else "NO")
    rows.append((t, frame, d.strftime("%Y-%m-%d"), n, s, round(ratio, 2), "yes" if kept else "no", key, season, match))
rows.sort()
with open(out_csv, "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["t_seconds", "movie_frame", "nasa_label_date", "north_pixels", "south_pixels", "north_over_south",
                "kept_by_plan_filter", "plan_answer_key", "season_by_nasa_date", "key_matches_date"])
    w.writerows(rows)
kept = [r for r in rows if r[6] == "yes"]
yes = [r for r in kept if r[9] == "yes"]
no = [r for r in kept if r[9] == "NO"]
print("frames %d | kept by the plan's filter %d (north %d, south %d) | key matches NASA date %d | key says summer but date is spring/autumn %d" % (
    len(rows), len(kept), sum(1 for r in kept if r[7].startswith("North")), sum(1 for r in kept if r[7].startswith("South")), len(yes), len(no)))
for r in rows:
    print("%5.1f  %s  N=%-5d S=%-5d ratio=%-6s kept=%-3s %-16s %-26s %s" % (r[0], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9]))
