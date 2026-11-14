"""s1_svs_fetch.py (recipe S1) - list the media of an SVS page through the public API and download
a few frames politely. Needs: the Python standard library only (and network access).

    python s1_svs_fetch.py 5584                 list movies and frame folders of SVS page 5584
    python s1_svs_fetch.py 5584 --frames 3      also download 3 evenly spaced frames into frames_5584/
"""
import argparse
import json
import re
import struct
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = 'https://svs.gsfc.nasa.gov/api/'
USER_AGENT = 'Mozilla/5.0 (compatible; student-sonification-script)'     # generic: no personal details
DELAY = 1.0                                                              # seconds to wait before every request


def fetch(url, method='GET'):
    """One polite HTTP request -> the open response."""
    time.sleep(DELAY)
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT}, method=method)
    return urllib.request.urlopen(request, timeout=120)


def https(url):
    """The API lists media as http:// URLs; ask for them over https."""
    return 'https://' + url.split('://', 1)[1]


def page_media(svs_id):
    """SVS page id -> (title, list of media dicts with keys group, type, url, name, width, height).
    type is 'Image', 'Movie' or 'Frames' (a folder of numbered frame files), among others."""
    with fetch(API + str(svs_id)) as response:
        page = json.load(response)
    media = []
    for group in page.get('media_groups') or []:
        for item in group.get('items') or []:
            inst = item.get('instance') or {}
            if item.get('type') == 'media' and inst.get('url'):
                media.append({'group': group['id'], 'type': inst.get('media_type'), 'url': https(inst['url']),
                              'name': inst.get('filename'), 'width': inst.get('width'), 'height': inst.get('height')})
    return page.get('title'), media


def frame_urls(listing_html, listing_url, extensions=('png', 'jpg', 'jpeg', 'tif', 'tiff', 'exr')):
    """HTML of a frames folder + its URL -> URLs of the frame files, in the order they are listed."""
    base = listing_url if listing_url.endswith('/') else listing_url + '/'
    pattern = r'href="?([^" >]+\.(?:' + '|'.join(extensions) + r'))"?'
    urls = (urllib.parse.urljoin(base, href) for href in re.findall(pattern, listing_html, re.I))
    return list(dict.fromkeys(u for u in urls if u.startswith(base)))    # keep this folder only, drop repeats


def remote_size(url):
    """Size of a remote file in bytes (HEAD request), or None if the server does not say."""
    with fetch(url, method='HEAD') as response:
        length = response.headers.get('Content-Length')
    return int(length) if length else None


def download(url, folder, max_mb=40.0):
    """Download url into folder (skipped if the file is already there). Returns the local path."""
    dest = Path(folder) / url.rsplit('/', 1)[1]
    if not dest.exists():
        with fetch(url) as response:
            size = int(response.headers.get('Content-Length') or 0)
            if size > max_mb * 1e6:
                raise ValueError(f'{url} is {size / 1e6:.0f} MB, above the {max_mb} MB limit')
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(response.read())
    return dest


def png_size(path):
    """(width, height) of a PNG, read from its header: a cheap check that a download is a real image."""
    with open(path, 'rb') as fh:
        head = fh.read(24)
    assert head[:8] == b'\x89PNG\r\n\x1a\n' and head[12:16] == b'IHDR', f'{path} is not a PNG'
    return struct.unpack('>II', head[16:24])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='List (and optionally download) media of an SVS page.')
    parser.add_argument('svs_id', type=int)
    parser.add_argument('--frames', type=int, default=0, help='how many evenly spaced frames to download')
    parser.add_argument('--ext', default='png', help='frame file extension wanted (png, jpg, tif, exr)')
    args = parser.parse_args()

    title, media = page_media(args.svs_id)
    print(f'SVS {args.svs_id}: {title}')
    kinds = {}
    for m in media:
        kinds[m['type']] = kinds.get(m['type'], 0) + 1
    print('media items by type:', kinds)

    movies = [m for m in media if m['type'] == 'Movie' and m['name'].lower().endswith(('.mp4', '.webm'))]
    movies.sort(key=lambda m: (m['width'] or 10 ** 9) * (m['height'] or 10 ** 9))
    for m in movies[:3]:                                             # fewest pixels first = smallest download
        print(f"  movie  {m['width']}x{m['height']}  {m['url']}")
    if movies:
        size = remote_size(movies[0]['url'])
        print(f"  smallest movie is {size / 1e6:.1f} MB" if size else '  size of the smallest movie unknown')

    folders = [m for m in media if m['type'] == 'Frames']
    for m in folders:
        print(f"  frames {m['width']}x{m['height']}  {m['url']}")

    if args.frames and folders:
        for folder in folders:                                       # first folder that has the wanted file type
            with fetch(folder['url']) as response:
                urls = frame_urls(response.read().decode('utf-8', 'replace'), folder['url'], (args.ext,))
            if urls:
                break
        print(f"  {len(urls)} .{args.ext} files in {folder['url']}")
        step = max(1, (len(urls) - 1) // max(1, args.frames - 1))
        for url in urls[::step][:args.frames]:
            path = download(url, f'frames_{args.svs_id}')
            note = f'{png_size(path)[0]}x{png_size(path)[1]} px' if path.suffix == '.png' else ''
            print(f'  saved {path.as_posix()}  {path.stat().st_size / 1e6:.2f} MB  {note}')
