#!/usr/bin/env python3
"""For every non-gallery SVS page already crawled, collect what is actually downloadable.

Usage:  python -I collect_media.py <out_dir>

Reads  <out_dir>/pages.json (from crawl_svs.py).
Writes <out_dir>/html/<id>.html      raw page HTML
       <out_dir>/downloads.json      every entry of every "Download" menu: label, WxH, size or
                                     frame count, URL, plus HTTP HEAD (status, bytes, Last-Modified)
       <out_dir>/framesets.json      every frame-set folder: HTTP status of the listing, file count,
                                     extensions, first/last names, modified-time range, total size

Only stdlib. 8 concurrent requests max.
"""
import concurrent.futures as cf
import html as htmllib
import json
import os
import re
import sys
import urllib.error
import urllib.request

OUT = sys.argv[1]
BASE = "https://svs.gsfc.nasa.gov"
UA = {"User-Agent": "Mozilla/5.0 (hackathon research; low request rate)"}
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
os.makedirs(os.path.join(OUT, "html"), exist_ok=True)

pages = json.load(open(os.path.join(OUT, "pages.json"), encoding="utf-8"))
detail_ids = sorted(int(k) for k, v in pages.items() if v["page_type"] != "Gallery")


def get(url, method="GET", timeout=120):
    req = urllib.request.Request(url, headers=UA, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read() if method == "GET" else b""
            return r.status, dict(r.headers.items()), body
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers.items()) if e.headers else {}, b""
    except Exception as e:  # noqa: BLE001
        return 0, {"error": repr(e)}, b""


def page_html(pid):
    path = os.path.join(OUT, "html", "%d.html" % pid)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return open(path, encoding="utf-8", errors="replace").read()
    st, _, body = get("%s/%d/" % (BASE, pid))
    if st != 200:
        print("HTML FAIL", pid, st)
        return ""
    open(path, "wb").write(body)
    return body.decode("utf-8", "replace")


ITEM_RE = re.compile(
    r'<a id="media_group_(\d+)_download_([^"]*?)_(\d+)" class="dropdown-item" href="([^"]+)"[^>]*>(.*?)</a>',
    re.S)
LABEL_RE = re.compile(r"^(.*?)(?:\s*\((\d+)x(\d+)\))?\s*(?:\[(.*?)\])?\s*$", re.S)


def parse_downloads(pid, text):
    out = []
    for gid, cat, idx, href, label in ITEM_RE.findall(text):
        label = htmllib.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", label))).strip()
        m = LABEL_RE.match(label)
        name, w, h, size = (m.group(1).strip(), m.group(2), m.group(3), m.group(4)) if m else (label, None, None, None)
        url = href if href.startswith("http") else BASE + href
        items = None
        if size and "Item" in size:
            items = int(re.sub(r"[^\d]", "", size) or 0)
        out.append({"page": pid, "group": int(gid), "category": cat, "name": name,
                    "width": int(w) if w else None, "height": int(h) if h else None,
                    "size_text": size, "items": items, "url": url})
    return out


ROW_RE = re.compile(r"<tr><td[^>]*><a href=([^ >]+)>\s*(.*?)\s*</a><td[^>]*>(.*?)<td[^>]*>(.*?)(?=<tr>|</table|</tbody|$)", re.S)
OLD_ROW_RE = re.compile(r"<tr><td>([^<]*)</td><td>([^<]*)</td><td><a href=\"([^\"]+)\">[^<]*</a></td></tr>", re.S)
NAME_ONLY_RE = re.compile(r"<tr><td><a href=\"([^\"]+)\">[^<]*</a></td></tr>", re.S)
UNITS = {"bytes": 1, "B": 1, "KB": 1e3, "MB": 1e6, "GB": 1e9, "TB": 1e12}


def size_bytes(txt):
    m = re.match(r"\s*([\d.]+)\s*([A-Za-z]+)", txt or "")
    if not m:
        return 0
    return float(m.group(1)) * UNITS.get(m.group(2), 0)


def list_dir(url, depth=0):
    """Return a summary of one frame-set folder (recursing one level into sub-folders)."""
    st, _, body = get(url)
    res = {"url": url, "status": st}
    if st != 200:
        return res
    text = body.decode("utf-8", "replace")
    rows = ROW_RE.findall(text)
    files, dirs = [], []
    for href, name, mod, size in rows:
        href = href.strip('"')
        mod = re.sub(r"<[^>]+>", "", mod).strip()
        size = re.sub(r"<[^>]+>", "", size).strip()
        if href.endswith("/"):
            if not href.startswith("..") and not href.startswith("/"):
                dirs.append(href)
        else:
            files.append((href, mod, size))
    mime = None
    if not files and not dirs:
        # older "framesIndexTable" layout: size | "TIFF Image: WxH" | <a href="/vis/.../name">name</a>, no dates
        for size, mt, href in OLD_ROW_RE.findall(text):
            files.append((href.rsplit("/", 1)[-1], "", size.strip()))
            mime = mime or re.sub(r"\s+", " ", mt).strip()
    fmt = "old-table(size+mime, no mtime)" if mime else "new-table(mtime+size)"
    if not files and not dirs:
        # third layout: filename only
        for href in NAME_ONLY_RE.findall(text):
            files.append((href.rsplit("/", 1)[-1], "", ""))
        fmt = "name-only"
    # generic fallback: any listing layout. Take every anchor that points inside this folder.
    folder_path = url.split("svs.gsfc.nasa.gov", 1)[-1]
    generic = [h for h in re.findall(r'<a href="?(/vis/[^" >]+)"?>', text) if h.startswith(folder_path) and h.rstrip("/") != folder_path.rstrip("/")]
    if len(generic) > len(files) + len(dirs):
        files, dirs = [], []
        for h in generic:
            name = h.rstrip("/").rsplit("/", 1)[-1]
            if "." in name:
                files.append((name, "", ""))
            else:
                dirs.append(name + "/")      # entries without an extension are sub-folders
        fmt = "name-only(generic)"
        mime = None
    res["listing_format"] = fmt
    res["mime"] = mime
    # frame numbering: last run of digits before the extension
    nums = []
    for f, _, _ in files:
        m = re.search(r"(\d+)(?:\.[A-Za-z0-9]+)$", f)
        if m:
            nums.append(int(m.group(1)))
    if nums:
        steps = {}
        for a, b in zip(nums, nums[1:]):
            steps[b - a] = steps.get(b - a, 0) + 1
        res["index_first"], res["index_last"] = nums[0], nums[-1]
        res["index_steps"] = dict(sorted(steps.items(), key=lambda kv: -kv[1])[:4])
    exts = {}
    for f, _, _ in files:
        e = f.rsplit(".", 1)[-1].lower() if "." in f else ""
        exts[e] = exts.get(e, 0) + 1
    res.update({
        "n_files": len(files), "exts": exts,
        "first": [f[0] for f in files[:4]], "last": [f[0] for f in files[-4:]],
        "evenly_spaced_names": [files[i][0] for i in sorted({int(k * (len(files) - 1) / 11) for k in range(12)})] if files else [],
        "modified_first": files[0][1] if files else None, "modified_last": files[-1][1] if files else None,
        "modified_distinct_days": sorted({" ".join(f[1].split()[:3]) for f in files})[:12],
        "size_first": files[0][2] if files else None,
        "total_bytes_est": int(sum(size_bytes(f[2]) for f in files)),
        "subdirs": dirs[:40],
    })
    if dirs and depth < 2:
        res["children"] = [list_dir(url + d, depth + 1) for d in dirs[:12]]
    return res


def head(entry):
    st, hdr, _ = get(entry["url"], method="HEAD", timeout=60)
    low = {k.lower(): v for k, v in hdr.items()}
    entry["head"] = {"status": st, "bytes": int(low["content-length"]) if low.get("content-length", "").isdigit() else None,
                     "last_modified": low.get("last-modified"), "content_type": low.get("content-type")}
    return entry


# 1) page HTML + download menus
all_dl = []
with cf.ThreadPoolExecutor(6) as ex:
    for pid, text in zip(detail_ids, ex.map(page_html, detail_ids)):
        dl = parse_downloads(pid, text)
        all_dl.extend(dl)
        print("%-6d downloads=%-4d %s" % (pid, len(dl), (pages[str(pid)]["title"] or "")[:60]), flush=True)

# 2) frame-set folders
frame_entries = [d for d in all_dl if d["category"].strip().lower().startswith("frame")]
others = [d for d in all_dl if d not in frame_entries]
print("frame sets:", len(frame_entries), "other downloads:", len(others), flush=True)
framesets = []
with cf.ThreadPoolExecutor(8) as ex:
    for d, res in zip(frame_entries, ex.map(lambda d: list_dir(d["url"]), frame_entries)):
        res.update({"page": d["page"], "group": d["group"], "name": d["name"], "width": d["width"],
                    "height": d["height"], "page_reported_items": d["items"]})
        framesets.append(res)
        print("  frames %-6d %s status=%s n=%s exts=%s" % (d["page"], d["name"][:50], res["status"],
                                                           res.get("n_files"), res.get("exts")), flush=True)

# 3) HEAD every other download (reuse earlier successful results)
cache = {}
prev = os.path.join(OUT, "downloads.json")
if os.path.exists(prev):
    for d in json.load(open(prev, encoding="utf-8")):
        if (d.get("head") or {}).get("status") == 200:
            cache[d["url"]] = d["head"]
def head_cached(entry):
    if entry["url"] in cache:
        entry["head"] = cache[entry["url"]]
        return entry
    return head(entry)
with cf.ThreadPoolExecutor(8) as ex:
    others = list(ex.map(head_cached, others))

json.dump(all_dl, open(os.path.join(OUT, "downloads.json"), "w", encoding="utf-8"), indent=1)
json.dump(framesets, open(os.path.join(OUT, "framesets.json"), "w", encoding="utf-8"), indent=1)
print("DONE downloads=%d framesets=%d" % (len(all_dl), len(framesets)))
