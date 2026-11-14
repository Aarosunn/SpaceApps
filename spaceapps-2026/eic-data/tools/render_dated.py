#!/usr/bin/env python3
"""List every EIC frame set whose FILE NAMES carry a date or time, with the decoded range and cadence.

Usage: python -I render_dated.py <evidence_dir> <repo_eic_data_dir> "<snapshot label>" <snapshot_utc_iso>
Fetches each dated folder listing again (one request per folder) so that ALL names are decoded, not just first/last.
Writes: dated-frame-sets.md  and  <evidence_dir>/dated_sets.json
"""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.request

E, OUT, SNAP, NOW = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
now = dt.datetime.fromisoformat(NOW)
framesets = json.load(open(os.path.join(E, "framesets.json"), encoding="utf-8"))
pages = json.load(open(os.path.join(E, "pages.json"), encoding="utf-8"))
UA = {"User-Agent": "Mozilla/5.0 (hackathon research; low request rate)"}

PATTERNS = [
    ("ISO timestamp YYYY-MM-DDTHH:MM:SSZ (UTC)", re.compile(r"(20\d{2})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z"),
     lambda m: dt.datetime(int(m[1]), int(m[2]), int(m[3]), int(m[4]), int(m[5]), int(m[6]))),
    ("YYYYDDDHHMM (year, day-of-year, hour, minute)", re.compile(r"(?<!\d)(20\d{2})(\d{3})(\d{2})(\d{2})(?!\d)"),
     lambda m: dt.datetime(int(m[1]), 1, 1) + dt.timedelta(days=int(m[2]) - 1, hours=int(m[3]), minutes=int(m[4]))),
    ("YYYYMMDD", re.compile(r"(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)"), lambda m: dt.datetime(int(m[1]), int(m[2]), int(m[3]))),
    ("YYYY.MM.DD", re.compile(r"(?<!\d)(20\d{2})\.(\d{2})\.(\d{2})(?!\d)"), lambda m: dt.datetime(int(m[1]), int(m[2]), int(m[3]))),
    ("YYYY-MM-DD", re.compile(r"(?<!\d)(20\d{2})-(\d{2})-(\d{2})(?!\d)"), lambda m: dt.datetime(int(m[1]), int(m[2]), int(m[3]))),
    ("MM_DD_YYYY", re.compile(r"(?<!\d)(\d{2})_(\d{2})_(20\d{2})(?!\d)"), lambda m: dt.datetime(int(m[3]), int(m[1]), int(m[2]))),
    ("YYYYDDD (year + day-of-year)", re.compile(r"(?<!\d)(20\d{2})(\d{3})(?!\d)"),
     lambda m: dt.datetime(int(m[1]), 1, 1) + dt.timedelta(days=int(m[2]) - 1)),
    ("YYYY_MM (one file per year)", re.compile(r"(?<!\d)((?:19|20)\d{2})_(\d{2})(?!\d)"), lambda m: dt.datetime(int(m[1]), int(m[2]), 1)),
]


def decode(name):
    for label, rx, fn in PATTERNS:
        m = rx.search(name)
        if m:
            try:
                return label, fn(m)
            except ValueError:
                continue
    return None


def names_in(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        text = urllib.request.urlopen(req, timeout=120).read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return None, repr(e)
    path = url.split("svs.gsfc.nasa.gov", 1)[-1]
    out = []
    for h in re.findall(r'<a href="?([^" >]+)"?>', text):
        if h.startswith("http") or h.startswith("#") or h.startswith("mailto") or ".." in h:
            continue
        name = h.rstrip("/").rsplit("/", 1)[-1]
        full = h if h.startswith("/") else path + h
        if full.startswith(path) and "." in name and full.rstrip("/") != path.rstrip("/"):
            out.append(name)
    time.sleep(0.3)
    return out, None


def flat(r, out):
    out.append(r)
    for c in r.get("children") or []:
        c2 = dict(c)
        c2["page"], c2["group"] = r["page"], r["group"]
        c2["name"] = r["name"] + "/" + c["url"].rstrip("/").rsplit("/", 1)[-1]
        c2["width"], c2["height"] = r.get("width"), r.get("height")
        flat(c2, out)
    return out


allsets = []
for r in framesets:
    flat(r, allsets)

rows = []
if "--from-json" in sys.argv:
    rows = json.load(open(os.path.join(E, "dated_sets.json"), encoding="utf-8"))
    allsets = []
for r in allsets:
    if not r.get("n_files") or not r.get("first"):
        continue
    if not (decode(r["first"][0]) and decode(r["last"][-1])):
        continue
    names, err = names_in(r["url"])
    if not names:
        print("skip", r["url"], err)
        continue
    dec = [(decode(n), n) for n in names]
    dec = [(d[1], n, d[0]) for d, n in dec if d]
    if len(dec) < 2:
        continue
    dec.sort()
    label = dec[0][2]
    times = [d[0] for d in dec]
    steps = {}
    for a, b in zip(times, times[1:]):
        steps[b - a] = steps.get(b - a, 0) + 1
    usual = max(steps.items(), key=lambda kv: kv[1])[0]
    span = times[-1] - times[0]
    expected = int(span / usual) + 1 if usual.total_seconds() > 0 else len(times)
    gaps = [(a, b) for a, b in zip(times, times[1:]) if b - a > usual]
    exts = sorted({n.rsplit(".", 1)[-1].lower() for _, n, _ in dec})
    rows.append({"page": r["page"], "title": pages[str(r["page"])]["title"], "set": r["name"], "url": r["url"], "pattern": label,
                 "n": len(times), "first": times[0].isoformat(), "last": times[-1].isoformat(), "usual_step_s": usual.total_seconds(),
                 "expected": expected, "missing": expected - len(times), "gaps": [(a.isoformat(), b.isoformat()) for a, b in gaps[:8]],
                 "example_first": dec[0][1], "example_last": dec[-1][1], "ext": exts, "width": r.get("width"), "height": r.get("height"),
                 "age_h": round((now - times[-1]).total_seconds() / 3600, 1), "modified_last": r.get("modified_last")})
    print("%-6d %-44s n=%-5d %s .. %s step=%s" % (r["page"], r["name"][:44], len(times), times[0], times[-1], usual), flush=True)

if "--from-json" not in sys.argv:
    json.dump(rows, open(os.path.join(E, "dated_sets.json"), "w", encoding="utf-8"), indent=1)
# a constant "date" in every name is a render stamp, not a data date: drop those sets
rows = [x for x in rows if x["usual_step_s"] > 0]
seen = set()
uniq = []
for x in rows:
    if x["url"] not in seen:
        seen.add(x["url"])
        uniq.append(x)
rows = uniq


def step_txt(s):
    if s % 86400 == 0:
        d = int(s // 86400)
        return "1 day" if d == 1 else ("%d days" % d if d < 300 else "1 year")
    if s % 3600 == 0:
        return "%d h" % (s // 3600)
    return "%d min" % (s // 60)


L = ["# Frame sets whose file names tell you the date (so no OCR and no guessing)", "",
     "> Generated by script from NASA SVS folder listings (no AI interpretation). Snapshot: %s." % SNAP,
     "> Every name in each folder was decoded, sorted by time, and checked for gaps.", "",
     "How to read it:",
     "- **one file =**: the usual spacing between consecutive files. This is what one frame means in real time.",
     "- **newest / age**: the newest date in the folder, and how old that was at the snapshot (%s UTC)." % now.strftime("%Y-%m-%d %H:%M"),
     "- **gaps**: files missing from an otherwise regular series (a daily product can skip days).",
     "- Dates in file names are data dates. NASA names by UTC date/time unless the name says otherwise.",
     "- EXR needs conversion before a browser or most image libraries can read it; PNG and JPEG do not.", ""]
cur = None
for x in sorted(rows, key=lambda x: (x["page"], x["set"])):
    if x["page"] != cur:
        cur = x["page"]
        L += ["", "## %d — %s" % (cur, x["title"]), "",
              "| frame set | pixels | files | format | one file = | first | newest | age at snapshot | gaps | name pattern | example newest file | folder |",
              "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    gaps = "none" if x["missing"] <= 0 else "%d missing (e.g. after %s)" % (x["missing"], x["gaps"][0][0][:16].replace("T", " ") if x["gaps"] else "?")
    age = x["age_h"]
    age_txt = ("%.0f h" % age) if age < 72 else ("%.0f days" % (age / 24))
    L.append("| %s | %sx%s | %d | %s | **%s** | %s | %s | %s | %s | %s | `%s` | %s |" % (
        x["set"], x["width"], x["height"], x["n"], ", ".join(x["ext"]).upper(), step_txt(x["usual_step_s"]),
        x["first"][:16].replace("T", " "), x["last"][:16].replace("T", " "), age_txt, gaps, x["pattern"], x["example_last"], x["url"]))
open(os.path.join(OUT, "dated-frame-sets.md"), "w", encoding="utf-8", newline="\n").write("\n".join(L) + "\n")
print("wrote dated-frame-sets.md with", len(rows), "sets")
