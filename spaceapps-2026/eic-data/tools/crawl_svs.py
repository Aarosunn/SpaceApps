#!/usr/bin/env python3
"""Crawl the NASA SVS Earth Information Center (EIC) gallery tree via the public JSON API.

Usage:  python -I crawl_svs.py <out_dir>

Writes:
  <out_dir>/svs_api/<id>.json   raw API record for every gallery / page reached
  <out_dir>/tree.json           parent -> child edges with section titles
  <out_dir>/pages.json          one compact summary per page (media counts, datasets, dates)
  <out_dir>/media.json          every media item (movies, frames dirs, images, captions)

Only stdlib. Polite: sequential, 0.25 s between requests, cached on disk (re-run is free).
"""
import collections
import json
import os
import re
import sys
import time
import urllib.request

OUT = sys.argv[1]
API = "https://svs.gsfc.nasa.gov/api/%s"
UA = {"User-Agent": "Mozilla/5.0 (hackathon research; low request rate)"}
ROOT = 40467  # Earth Information Center (EIC) gallery
# The 10 SVS pages named in the official Jukebox "NASA Data & Resources" list (besides the gallery itself)
OFFICIAL = [13786, 5313, 3912, 5669, 5533, 5425, 5196, 5011, 4960, 4950]
MAX_DEPTH = 6

os.makedirs(os.path.join(OUT, "svs_api"), exist_ok=True)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows console is cp1252; titles contain e.g. CO₂


def fetch(pid):
    path = os.path.join(OUT, "svs_api", "%s.json" % pid)
    if os.path.exists(path) and os.path.getsize(path) > 2:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    req = urllib.request.Request(API % pid, headers=UA)
    err = None
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                raw = r.read()
            break
        except Exception as e:  # noqa: BLE001 - report and retry
            err = e
            time.sleep(2)
    else:
        print("FAIL", pid, err, flush=True)
        return None
    with open(path, "wb") as f:
        f.write(raw)
    time.sleep(0.25)
    return json.loads(raw)


def page_id_from_url(url):
    m = re.search(r"gsfc\.nasa\.gov/(\d+)/?", url or "")
    if m:
        return int(m.group(1))
    # media_group refs point at a media file: .../vis/a000000/a003900/a003912/<file> -> page 3912
    m = re.search(r"/a0*(\d+)/[^/]+$", url or "")
    return int(m.group(1)) if m else None


queue = collections.deque([(ROOT, 0)])
for pid in OFFICIAL:
    queue.append((pid, 1))
seen = set()
edges = []
pages = {}
media = []

while queue:
    pid, depth = queue.popleft()
    if pid in seen:
        continue
    seen.add(pid)
    d = fetch(pid)
    if d is None:
        continue
    ptype = d.get("page_type")
    counts = collections.Counter()
    for g in d.get("media_groups", []):
        for it in g.get("items", []):
            t = it.get("type")
            inst = it.get("instance") or {}
            if t in ("gallery_page", "details_page"):
                child = inst.get("id")
                edges.append({"parent": pid, "section": g.get("title"), "child": child,
                              "child_type": inst.get("page_type"), "child_title": inst.get("title"),
                              "link": t})
                if ptype == "Gallery" and child and depth < MAX_DEPTH:
                    queue.append((child, depth + 1))
            elif t == "media_group":
                child = page_id_from_url(inst.get("url"))
                edges.append({"parent": pid, "section": g.get("title"), "child": child,
                              "child_type": "media_group_ref", "child_title": it.get("title"),
                              "link": t, "media_group_url": inst.get("url")})
                if ptype == "Gallery" and child and depth < MAX_DEPTH:
                    queue.append((child, depth + 1))
            elif t == "media":
                mt = inst.get("media_type")
                counts[mt] += 1
                media.append({"page": pid, "group": g.get("id"), "group_title": g.get("title"),
                              "media_type": mt, "filename": inst.get("filename"), "url": inst.get("url"),
                              "width": inst.get("width"), "height": inst.get("height"),
                              "media_id": inst.get("id")})
            else:
                counts["other:%s" % t] += 1
    pages[pid] = {
        "id": pid, "url": d.get("url"), "page_type": ptype, "title": d.get("title"),
        "release_date": d.get("release_date"), "update_date": d.get("update_date"),
        "progress": d.get("progress"), "depth": depth, "n_groups": len(d.get("media_groups", [])),
        "media_counts": dict(counts),
        "datasets": [{"name": x.get("name"), "common_name": x.get("common_name"),
                      "platform": x.get("platform"), "sensor": x.get("sensor"),
                      "date_range": x.get("date_range"), "url": x.get("url")}
                     for x in (d.get("datasets") or [])],
        "keywords": d.get("keywords"),
        "missions": [m.get("name") if isinstance(m, dict) else m for m in (d.get("missions") or [])],
        "description": d.get("description"),
    }
    print("%-6s d%d %-16s %s" % (pid, depth, ptype, (d.get("title") or "")[:70]), flush=True)

for name, obj in (("tree.json", edges), ("pages.json", pages), ("media.json", media)):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1)
print("DONE pages=%d edges=%d media=%d" % (len(pages), len(edges), len(media)))
