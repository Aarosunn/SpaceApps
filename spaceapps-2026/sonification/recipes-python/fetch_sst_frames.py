"""fetch_sst_frames.py - download and cache the flat global SVS 3912 frames the EarthFM timeline is built from.

    python fetch_sst_frames.py [cache folder] [how many frames, default 24]

Standard library only. Safe to re-run: a frame that is already in the cache with the right size is skipped,
so a second run downloads nothing. Polite: one request at a time with a pause, and a generic User-Agent.

Source (public domain, credit NASA's Scientific Visualization Studio): https://svs.gsfc.nasa.gov/3912/
Frames 23000..31000 in steps of 4 cover 2007-03-25 to 2008-03-03 (dates in flat_ecco2_dates.txt).
Each frame is a 2048 x 1024 TIFF of about 6 MB, so 24 frames are about 150 MB. The cache is not committed.
"""
import os
import sys
import time
import urllib.request

BASE = 'https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/'
FRAME = BASE + 'frames/2048x1024_1x1_30p/orig/flat_global_ecco2_2028x1024.%d.tif'
DATES = BASE + 'flat_ecco2_dates.txt'
FIRST, LAST, STEP = 23000, 31000, 4
UA = {'User-Agent': 'Mozilla/5.0 (student hackathon project; low request rate)'}
HERE = os.path.dirname(os.path.abspath(__file__))
cache = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'notes', 'feasibility', 'data', 'sst')
count = int(sys.argv[2]) if len(sys.argv) > 2 else 24
os.makedirs(cache, exist_ok=True)


def frame_numbers(n):
    """n frame numbers spread evenly from FIRST to LAST, each on the STEP grid."""
    return sorted({FIRST + round(i * (LAST - FIRST) / (n - 1) / STEP) * STEP for i in range(n)})


def get(url, path, tries=3):
    """Download url to path unless it is already cached complete. Returns 'cached' or 'downloaded'."""
    req = urllib.request.Request(url, headers=UA)
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                size = int(r.headers.get('Content-Length') or 0)
                if os.path.exists(path) and size and os.path.getsize(path) == size:
                    return 'cached'
                tmp = path + '.part'                       # never leave a half file under the real name
                with open(tmp, 'wb') as fh:
                    while chunk := r.read(1 << 16):
                        fh.write(chunk)
            if size and os.path.getsize(tmp) != size:
                raise IOError(f'got {os.path.getsize(tmp)} of {size} bytes')
            os.replace(tmp, path)
            return 'downloaded'
        except Exception as e:                             # noqa: BLE001 - retry any network hiccup
            if attempt == tries - 1:
                raise
            print(f'  retry after error: {e}', flush=True)
            time.sleep(2 * (attempt + 1))


if __name__ == '__main__':
    if not os.path.exists(os.path.join(cache, 'dates.txt')):
        print('dates.txt:', get(DATES, os.path.join(cache, 'dates.txt')), flush=True)
    done = {'cached': 0, 'downloaded': 0}
    for n in frame_numbers(count):
        result = get(FRAME % n, os.path.join(cache, f'f{n}.tif'))
        done[result] += 1
        print(f'f{n}.tif {result}', flush=True)
        if result == 'downloaded':
            time.sleep(0.5)
    print(f"{done['downloaded']} downloaded, {done['cached']} already cached, in {os.path.abspath(cache)}")
    assert frame_numbers(2) == [FIRST, LAST] and all((n - FIRST) % STEP == 0 for n in frame_numbers(24)) and len(frame_numbers(24)) == 24
