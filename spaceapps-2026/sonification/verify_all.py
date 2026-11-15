"""verify_all.py - one command that checks the whole sonification folder.

    python verify_all.py

Needs Python with numpy, and Node on the PATH. Writes nothing into the repo (works in a temp folder).
Exit code 0 = every check passed. Each line is PASS or FAIL with the reason.

What it checks
  1 every Python recipe's own self-test
  2 both song scripts re-render byte-for-byte what is committed (reproducible from recipes-python/data)
  3 odd frames do not break the pipeline: all land, one flat colour, a single ocean pixel, noise, a 1-frame clip
  4 every committed timeline / note list is well formed and every committed WAV is valid and not silent
  5 the Node tests, and a syntax check of every script inside every HTML page
  6 every local file an HTML page points to exists
"""
import contextlib
import filecmp
import glob
import io
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PY, WEB = os.path.join(HERE, 'recipes-python'), os.path.join(HERE, 'recipes-browser')
sys.path.insert(0, PY)
import numpy as np  # noqa: E402

np.seterr(all='ignore')
import warnings  # noqa: E402

warnings.simplefilter('ignore', RuntimeWarning)   # an all-land frame has no mean: expected, and checked below

import p5_colormap as p5  # noqa: E402
import p6_features as p6  # noqa: E402
import wavio  # noqa: E402

results = []


def check(name, fn):
    try:
        detail = fn()
        results.append((True, name, detail or ''))
    except Exception as e:  # noqa: BLE001 - report every failure, keep going
        results.append((False, name, f'{type(e).__name__}: {e}'))
    ok, n, d = results[-1]
    print(('PASS ' if ok else 'FAIL ') + n + (f'  ({d})' if d else ''), flush=True)


def run(cmd, cwd):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        raise RuntimeError((r.stdout + r.stderr).strip()[-400:])
    return r.stdout


def finite(obj, path='$'):
    """Every number anywhere in a JSON object must be finite (NaN or Infinity breaks JSON.parse in a browser)."""
    if isinstance(obj, float) and not math.isfinite(obj):
        raise ValueError(f'non-finite number at {path}')
    if isinstance(obj, dict):
        for k, v in obj.items():
            finite(v, f'{path}.{k}')
    if isinstance(obj, list):
        for i, v in enumerate(obj):
            finite(v, f'{path}[{i}]')


def quiet(fn, *a, **k):
    """Call fn but swallow what it prints (check_wav prints one line per file)."""
    with contextlib.redirect_stdout(io.StringIO()):
        fn(*a, **k)


tmp = tempfile.mkdtemp(prefix='sonify-verify-')
try:
    # ---- 1) recipe self-tests, run in a copy so their output files stay out of the repo
    work = os.path.join(tmp, 'py')
    shutil.copytree(PY, work, ignore=shutil.ignore_patterns('__pycache__'))
    for s in ('wavio', 'musickit', 'synth', 'p4_colscan', 'p5_colormap', 'p6_features', 'p7_render', 'p8_midi', 'score'):
        check(f'recipe self-test: {s}.py', lambda s=s: run([sys.executable, f'{s}.py'], work).strip().splitlines()[-1][:70])

    # ---- 2) the songs are reproducible from the committed inputs
    out = os.path.join(tmp, 'out')
    os.makedirs(out)
    check('make_songs.py runs from recipes-python/data', lambda: run([sys.executable, 'make_songs.py', 'data', out], work) and None)
    check('single_frame_demo.py runs from recipes-python/data', lambda: run([sys.executable, 'single_frame_demo.py', 'data', out], work) and None)
    for folder, names in (('songs', ['clip_song.wav', 'clip_song.json', 'single_frame_song.wav', 'single_frame_song.json']),
                          ('single-frame', ['1_column_scan.wav', '2_north_to_south_chord.wav', '3_west_to_east_melody.wav', 'summary.json'])):
        for n in names:
            def same(folder=folder, n=n):
                if not filecmp.cmp(os.path.join(out, n), os.path.join(WEB, folder, n), shallow=False):
                    raise AssertionError('re-rendered file differs from the committed one: re-run the script and commit')
            check(f'committed {folder}/{n} matches a fresh render', same)

    # ---- 3) odd frames
    H, W = 36, 64
    legend = p5.demo_legend()
    mid = legend[len(legend) // 2]
    rng = np.random.default_rng(0)
    one = np.full((H, W, 3), 40, np.uint8)
    one[10, 20] = mid
    odd = {
        'all land (dark grey)': np.full((H, W, 3), 40, np.uint8),
        'all black': np.zeros((H, W, 3), np.uint8),
        'all white': np.full((H, W, 3), 255, np.uint8),
        'one flat legend colour': np.broadcast_to(mid, (H, W, 3)).copy(),
        'a single ocean pixel': one,
        'random noise': rng.integers(0, 256, (H, W, 3), dtype=np.uint8),
    }
    for name, rgb in odd.items():
        def frame(rgb=rgb):
            for hue_only in (False, True):
                v = p5.invert_colormap(rgb, legend, hue_only=hue_only)
                assert v.shape == (H, W), v.shape
                ok = v[np.isfinite(v)]
                assert ((ok >= 0) & (ok <= 1)).all(), 'value outside 0..1'
                bands, overall = p5.zonal_means(v, bands=6)
                assert len(bands) == 6
            return f'{np.isfinite(v).mean():.0%} of pixels readable'
        check(f'odd frame: {name}', frame)

    def clip(values, label):
        tl = p6.analyse(values, fps=30, frame_step=6, grid=(4, 8))
        p6.validate_timeline(tl)
        finite(tl)
        json.loads(json.dumps(tl, allow_nan=False))
        return f'{len(tl["frames"])} frames'
    check('odd clip: every pixel has no data', lambda: clip(np.full((5, H, W), np.nan), 'nan'))
    check('odd clip: nothing changes', lambda: clip(np.full((5, H, W), 0.5), 'flat'))
    check('odd clip: a single frame', lambda: clip(rng.random((1, H, W)), 'one'))
    check('odd clip: half the picture has no data', lambda: clip(np.where(np.arange(W) < W // 2, np.nan, rng.random((4, H, W))), 'half'))

    # ---- 4) committed data files
    for path in sorted(glob.glob(os.path.join(HERE, '**', '*.json'), recursive=True)):
        rel = os.path.relpath(path, HERE).replace(os.sep, '/')

        def js(path=path):
            with open(path, encoding='utf-8') as fh:
                d = json.load(fh, parse_constant=lambda c: (_ for _ in ()).throw(ValueError(f'{c} is not valid JSON')))
            finite(d)
            if isinstance(d, dict) and 'meta' in d and d.get('frames') and 'mean' in d['frames'][0]:
                p6.validate_timeline(d)
                return 'timeline, ' + str(len(d['frames'])) + ' frames'
            if isinstance(d, dict) and 'lead' in d:
                ts = [n['t'] for n in d['lead']]
                assert ts == sorted(ts), 'notes out of time order'
                return str(len(ts)) + ' notes'
        check(f'data file: {rel}', js)
    for path in sorted(glob.glob(os.path.join(WEB, '**', '*.wav'), recursive=True)):
        rel = os.path.relpath(path, HERE).replace(os.sep, '/')
        check(f'audio file: {rel}', lambda path=path: quiet(wavio.check_wav, path, channels=2))

    # ---- 5) Node tests and script syntax
    web = os.path.join(tmp, 'web')                      # a copy: one test writes a WAV next to itself
    os.makedirs(web)
    for f in glob.glob(os.path.join(WEB, '*.js')):
        shutil.copy(f, web)
    for t in ('sonify-core.test.js', 'jukebox-engine.test.js'):
        check(f'node test: {t}', lambda t=t: run(['node', t], web).strip().splitlines()[-1][:60])
    pages = sorted(glob.glob(os.path.join(WEB, '**', '*.html'), recursive=True))
    for page in pages:
        rel = os.path.relpath(page, HERE).replace(os.sep, '/')
        html = open(page, encoding='utf-8').read()

        def syntax(html=html):
            blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)
            for i, code in enumerate(blocks):
                f = os.path.join(tmp, f'inline{i}.js')
                with open(f, 'w', encoding='utf-8') as fh:
                    fh.write(code)
                run(['node', '--check', f], tmp)
            return f'{len(blocks)} inline script(s)'
        check(f'page script syntax: {rel}', syntax)

        # ---- 6) local references
        def refs(html=html, page=page):
            missing = []
            for ref in re.findall(r'(?:src|href)="([^"#?]+)"', html):
                if re.match(r'^[a-z]+:', ref) or ref.startswith('//'):
                    continue
                if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(page), ref))):
                    missing.append(ref)
            if missing:
                raise FileNotFoundError('missing: ' + ', '.join(missing))
        check(f'page local files exist: {rel}', refs)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

failed = [r for r in results if not r[0]]
print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
sys.exit(1 if failed else 0)
