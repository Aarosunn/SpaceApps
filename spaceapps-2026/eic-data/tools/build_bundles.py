#!/usr/bin/env python3
"""Build one plain-markdown evidence sheet per SVS page from the raw crawl.

Usage:  python -I build_bundles.py <evidence_dir>
Reads   svs_api/*.json, pages.json, tree.json, downloads.json, framesets.json, probes.json
Writes  bundles/<id>.md   (everything a reader needs about that page; nothing interpreted)
        bundles/INDEX.md  (one line per page)
"""
import html as htmllib
import json
import os
import re
import sys

E = sys.argv[1]
sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def load(name, default=None):
    p = os.path.join(E, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


pages = load("pages.json")
edges = load("tree.json")
downloads = load("downloads.json")
framesets = load("framesets.json")
probes = load("probes.json", {})
os.makedirs(os.path.join(E, "bundles"), exist_ok=True)


def text(s):
    s = s or ""
    s = re.sub(r"<br\s*/?>|</p>|</li>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = htmllib.unescape(s)
    return re.sub(r"\n\s*\n+", "\n", s).strip()


def human(n):
    if not n:
        return "?"
    for u in ("B", "KB", "MB", "GB"):
        if n < 1000:
            return "%.1f %s" % (n, u)
        n /= 1000.0
    return "%.1f TB" % n


parents = {}
for e in edges:
    if e["child"]:
        par = pages.get(str(e["parent"]), {})
        parents.setdefault(e["child"], []).append("%s (%s) > %s" % (par.get("title"), e["parent"], e["section"]))

dl_by_page = {}
for d in downloads:
    dl_by_page.setdefault(d["page"], []).append(d)
fs_by_key = {}
for f in framesets:
    fs_by_key[(f["page"], f["group"], f["url"])] = f

OFFICIAL = {13786, 5313, 3912, 5669, 5533, 5425, 5196, 5011, 4960, 4950}
index = []


def fs_lines(f, indent="    "):
    out = []
    out.append("%s- listing HTTP %s | format: %s | files listed: %s | extensions: %s | est. total size: %s" % (
        indent, f.get("status"), f.get("listing_format"), f.get("n_files"), f.get("exts"), human(f.get("total_bytes_est"))))
    if f.get("status") != 200:
        out.append("%s- NOT LISTABLE (HTTP %s). Individual files may still download if the exact name is known." % (indent, f.get("status")))
    if f.get("n_files"):
        out.append("%s- first names: %s" % (indent, ", ".join(f.get("first") or [])))
        out.append("%s- last names: %s" % (indent, ", ".join(f.get("last") or [])))
        out.append("%s- 12 evenly spaced names: %s" % (indent, ", ".join(f.get("evenly_spaced_names") or [])))
        out.append("%s- numeric index: first=%s last=%s; most common step between consecutive files: %s" % (
            indent, f.get("index_first"), f.get("index_last"), f.get("index_steps")))
        if f.get("modified_first"):
            out.append("%s- file modified times: first file %s | last file %s | distinct days (up to 12): %s" % (
                indent, f.get("modified_first"), f.get("modified_last"), f.get("modified_distinct_days")))
        if f.get("mime"):
            out.append("%s- listing says: %s ; first file size %s" % (indent, f.get("mime"), f.get("size_first")))
        elif f.get("size_first"):
            out.append("%s- first file size %s" % (indent, f.get("size_first")))
    if f.get("subdirs"):
        out.append("%s- sub-folders: %s" % (indent, ", ".join(f["subdirs"])))
    for c in f.get("children") or []:
        out.append("%s- sub-folder %s" % (indent, c["url"]))
        out.extend(fs_lines(c, indent + "    "))
    return out


for pid_s, p in sorted(pages.items(), key=lambda kv: int(kv[0])):
    pid = int(pid_s)
    d = load("svs_api/%d.json" % pid)
    L = []
    L.append("# SVS %d: %s" % (pid, p["title"]))
    L.append("")
    L.append("- Page URL: https://svs.gsfc.nasa.gov/%d/  (API: https://svs.gsfc.nasa.gov/api/%d)" % (pid, pid))
    L.append("- Page type: %s | progress: %s" % (p["page_type"], p.get("progress")))
    L.append("- Released: %s | Page record last updated: %s" % (p["release_date"], p["update_date"]))
    L.append("- In EIC gallery tree under: %s" % ("; ".join(parents.get(pid, [])) or "(not linked from the EIC gallery tree; listed only as an official Jukebox resource)"))
    L.append("- Named in the official Jukebox challenge resource list: %s" % ("YES" if pid in OFFICIAL else "no"))
    L.append("- Keywords: %s" % ", ".join(p.get("keywords") or []))
    L.append("- Missions: %s" % ", ".join(str(m) for m in (p.get("missions") or [])))
    L.append("")
    L.append("## Page description (verbatim, HTML stripped)")
    L.append(text(d.get("description")))
    L.append("")
    L.append("## Datasets credited by NASA on this page")
    for x in d.get("datasets") or []:
        L.append("- %s | common name: %s | platform: %s | sensor: %s | type: %s | date_range: %s | url: %s" % (
            x.get("name"), x.get("common_name"), x.get("platform"), x.get("sensor"), x.get("type"), x.get("date_range"), x.get("url")))
        if x.get("description"):
            L.append("    - %s" % text(x.get("description"))[:400])
    if not d.get("datasets"):
        L.append("- (none listed)")
    L.append("")
    L.append("## Credits")
    for c in d.get("credits") or []:
        L.append("- %s: %s" % (c.get("role"), "; ".join("%s (%s)" % (q.get("name"), q.get("employer")) for q in c.get("people") or [])))
    L.append("")
    for key in ("newer_versions", "older_versions", "alternate_versions", "related", "series", "papers"):
        v = d.get(key) or []
        if v:
            L.append("## %s" % key)
            for x in v[:15]:
                if isinstance(x, dict):
                    L.append("- %s | %s | %s" % (x.get("id"), x.get("title") or x.get("name"), x.get("url")))
                else:
                    L.append("- %s" % x)
            L.append("")
    if p["page_type"] == "Gallery":
        L.append("## Gallery contents")
        for g in d.get("media_groups") or []:
            L.append("### Section: %s  (%s)" % (g.get("title"), g.get("widget")))
            if g.get("description"):
                L.append(text(g.get("description")))
            for it in g.get("items") or []:
                inst = it.get("instance") or {}
                L.append("- [%s] %s | %s | %s" % (it.get("type"), inst.get("id"), it.get("title") or inst.get("title"), inst.get("url")))
        L.append("")
    else:
        L.append("## Media groups (each is one visual on the page) with every downloadable file")
        dls = dl_by_page.get(pid, [])
        for g in d.get("media_groups") or []:
            gid = g.get("id")
            L.append("### Media group %s | widget: %s | title: %s" % (gid, g.get("widget"), g.get("title") or "(none)"))
            cap = text(g.get("caption"))
            desc = text(g.get("description"))
            if cap:
                L.append("Caption: " + cap)
            if desc and desc != cap:
                L.append("Description: " + desc)
            gd = [x for x in dls if x["group"] == gid]
            for x in gd:
                cat = x["category"]
                if cat.startswith("frame"):
                    f = fs_by_key.get((pid, gid, x["url"]))
                    L.append("- FRAME SET: %s | %sx%s | page says %s item(s) | %s" % (x["name"], x["width"], x["height"], x["items"], x["url"]))
                    if f:
                        L.extend(fs_lines(f))
                else:
                    h = x.get("head") or {}
                    line = "- %s: %s | %sx%s | page size label: %s | HTTP %s | bytes: %s (%s) | Last-Modified: %s" % (
                        cat.upper(), x["name"], x["width"], x["height"], x["size_text"], h.get("status"),
                        h.get("bytes"), human(h.get("bytes")), h.get("last_modified"))
                    pr = probes.get(x["url"])
                    if pr and pr.get("duration_s"):
                        line += " | ffmpeg probe: %.2f s, %s fps, ~%s frames, %sx%s, codec %s, audio=%s" % (
                            pr["duration_s"], pr.get("fps"), pr.get("frames_est"), pr.get("width"), pr.get("height"),
                            pr.get("codec"), pr.get("has_audio"))
                    line += " | " + x["url"]
                    L.append(line)
            if not gd and g.get("items"):
                L.append("- (%d items in API, none in a download menu)" % len(g.get("items")))
            L.append("")
    open(os.path.join(E, "bundles", "%d.md" % pid), "w", encoding="utf-8").write("\n".join(L) + "\n")
    index.append("- %d | %s | %s | released %s | updated %s | official=%s | %s" % (
        pid, p["page_type"], p["title"], (p["release_date"] or "")[:10], (p["update_date"] or "")[:10],
        "YES" if pid in OFFICIAL else "no", "; ".join(parents.get(pid, []))))

open(os.path.join(E, "bundles", "INDEX.md"), "w", encoding="utf-8").write(
    "# Evidence bundle index (one file per SVS page: bundles/<id>.md)\n\n" + "\n".join(index) + "\n")
print("bundles written:", len(index))
