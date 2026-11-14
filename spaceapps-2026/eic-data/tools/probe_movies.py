#!/usr/bin/env python3
"""Probe every movie in downloads.json with ffmpeg (header only, over HTTP range requests).

Run inside WSL with the venv that has imageio-ffmpeg:
  python probe_movies.py <evidence_dir>      (needs: pip install imageio-ffmpeg)

Writes <out_dir>/probes.json : url -> {duration_s, fps, width, height, codec, pix_fmt, frames_est}
"""
import concurrent.futures as cf
import json
import os
import re
import subprocess
import sys

import imageio_ffmpeg

OUT = sys.argv[1]
FF = imageio_ffmpeg.get_ffmpeg_exe()
dl = json.load(open(os.path.join(OUT, "downloads.json"), encoding="utf-8"))
movies = [d for d in dl if d["category"] == "movies" and (d.get("head") or {}).get("status") == 200]
path = os.path.join(OUT, "probes.json")
probes = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}


def probe(d):
    url = d["url"]
    if url in probes and probes[url].get("duration_s"):
        return url, probes[url]
    try:
        p = subprocess.run([FF, "-hide_banner", "-rw_timeout", "60000000", "-i", url],
                           capture_output=True, text=True, timeout=150)
        err = p.stderr
    except Exception as e:  # noqa: BLE001
        return url, {"error": repr(e)}
    res = {}
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", err)
    if m:
        res["duration_s"] = round(int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)), 3)
    m = re.search(r"Stream #\d+:\d+[^\n]*Video:\s*([A-Za-z0-9_]+)[^\n]*?,\s*([a-z0-9]+)\(?[^\n]*?,\s*(\d{2,5})x(\d{2,5})[^\n]*", err)
    if m:
        res.update({"codec": m.group(1), "pix_fmt": m.group(2), "width": int(m.group(3)), "height": int(m.group(4))})
        line = m.group(0)
        f = re.search(r"([\d.]+)\s*fps", line)
        if f:
            res["fps"] = float(f.group(1))
    res["has_audio"] = bool(re.search(r"Stream #\d+:\d+[^\n]*Audio:", err))
    if res.get("duration_s") and res.get("fps"):
        res["frames_est"] = round(res["duration_s"] * res["fps"])
    if not res.get("duration_s"):
        res["error"] = err[-300:]
    return url, res


with cf.ThreadPoolExecutor(4) as ex:
    for i, (url, res) in enumerate(ex.map(probe, movies)):
        probes[url] = res
        if i % 40 == 0:
            print(i, len(movies), url.rsplit("/", 1)[-1], res, flush=True)
            json.dump(probes, open(path, "w", encoding="utf-8"), indent=1)
json.dump(probes, open(path, "w", encoding="utf-8"), indent=1)
ok = sum(1 for v in probes.values() if v.get("duration_s"))
print("DONE probed=%d ok=%d" % (len(probes), ok))
