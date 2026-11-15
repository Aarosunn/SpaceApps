"""p6_features.py (recipe P6) - frame sequence -> timeline JSON (the contract shared with the browser).
Needs: numpy + the Python standard library."""
import itertools
import json

import numpy as np


def block_reduce(a, rows, cols, how=np.mean):
    """(H, W) -> (rows, cols): cut the image into equal blocks and reduce each block with `how`
    (np.mean or np.max). Edge pixels that do not fill a whole block are dropped."""
    h, w = a.shape[0] // rows, a.shape[1] // cols
    return how(a[:h * rows, :w * cols].reshape(rows, h, cols, w), axis=(1, 3))


def analyse(frames, fps, frame_step=1, grid=(4, 8), source='unknown', value_range=(0.0, 1.0), notes='',
            mask=None, ev_grid=(18, 36), ev_floor=0.12, ev_k=6.0, refractory=0.3, max_events=4):
    """frames: iterable of 2-D float arrays with values 0..1 (brightness, or a data value from recipe
    P5 where NaN means "no data"), all the same shape, row 0 = top. Pass every `frame_step`-th frame
    of a `fps` source. mask: optional bool array (H, W), True = use this pixel (hide labels, clocks,
    colour bars). Returns the timeline dict. Per analysed frame:
      mean    mean over the usable pixels (inside the mask and not NaN)
      grid    rows x cols block means over the usable pixels, row-major, top-left first
      motion  mean absolute change against the previous analysed frame (0 for the first frame)
      events  sudden local brightenings ("flashes"): x, y in 0..1 from the top-left, strength 0..1
    Event rule: on a coarse ev_grid, take the largest brightening in each cell; an event is a cell
    whose brightening is (1) at least max(ev_floor, median + ev_k * robust spread of all cells),
    (2) not smaller than in the previous frame and larger than in the next frame (peak in time),
    (3) not smaller than in its 8 neighbour cells (peak in space), and (4) at least `refractory`
    seconds after the last event in that neighbourhood. At most max_events per frame, strongest first."""
    dt = frame_step / fps
    means, grids, motions, onsets = [], [], [], []
    prev = prev_ok = None
    for f in frames:
        f = np.asarray(f, dtype=np.float64)
        ok = np.isfinite(f) if mask is None else (mask & np.isfinite(f))      # usable pixels of this frame
        f = np.where(ok, f, 0.0)
        means.append(f[ok].mean() if ok.any() else 0.0)
        grids.append(block_reduce(f, *grid) / np.maximum(block_reduce(ok.astype(float), *grid), 1e-9))
        both = ok if prev is None else (ok & prev_ok)                          # usable now and before
        diff = np.zeros(f.shape) if prev is None else (f - prev) * both
        motions.append(np.abs(diff)[both].mean() if both.any() else 0.0)
        onsets.append(block_reduce(np.maximum(diff, 0.0), *ev_grid, how=np.max))   # brightening only
        prev, prev_ok = f, ok
    onsets = np.array(onsets)                                       # (T, ev_rows, ev_cols)
    T = len(onsets)

    typical = np.median(onsets[1:])
    spread = 1.4826 * np.median(np.abs(onsets[1:] - typical))       # robust standard deviation (MAD)
    threshold = max(ev_floor, typical + ev_k * spread)
    hold = max(1, int(round(refractory / dt)))                      # refractory period in analysed frames
    last = np.full(ev_grid, -hold)                                  # frame of the last event near each cell
    events = [[] for _ in range(T)]
    for i in range(1, T):
        s = onsets[i]
        nxt = onsets[i + 1] if i + 1 < T else np.zeros(ev_grid)
        pad = np.pad(s, 1, constant_values=-1.0)
        neighbours = np.max([pad[1 + dy:1 + dy + ev_grid[0], 1 + dx:1 + dx + ev_grid[1]]
                             for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy, dx) != (0, 0)], axis=0)
        ys, xs = np.nonzero((s >= threshold) & (s >= onsets[i - 1]) & (s > nxt) & (s >= neighbours))
        for j in np.argsort(-s[ys, xs]):                            # strongest first
            y, x = int(ys[j]), int(xs[j])
            if i - last[y, x] >= hold and len(events[i]) < max_events:
                events[i].append({'x': round((x + 0.5) / ev_grid[1], 4), 'y': round((y + 0.5) / ev_grid[0], 4),
                                  'strength': round(float(min(1.0, s[y, x])), 4)})
                last[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = i   # this cell and its neighbours go quiet

    r = lambda v: round(float(min(1.0, max(0.0, v))), 4)
    return {
        'meta': {'source': source, 'fps': fps, 'frame_step': frame_step, 'n_frames': T, 'grid': list(grid),
                 'value_range': list(value_range), 'notes': notes},
        'frames': [{'t': round(i * dt, 4), 'mean': r(means[i]), 'grid': [r(v) for v in grids[i].ravel()],
                    'motion': r(motions[i]), 'events': events[i]} for i in range(T)],
    }


def validate_timeline(tl):
    """Assert that `tl` follows the timeline JSON contract exactly (keys, lengths, ranges, order)."""
    assert set(tl) == {'meta', 'frames'}
    meta, frames = tl['meta'], tl['frames']
    assert set(meta) == {'source', 'fps', 'frame_step', 'n_frames', 'grid', 'value_range', 'notes'}
    rows, cols = meta['grid']
    assert meta['n_frames'] == len(frames) > 0 and len(meta['value_range']) == 2
    last_t = -1.0
    for f in frames:
        assert set(f) == {'t', 'mean', 'grid', 'motion', 'events'}
        assert f['t'] > last_t
        last_t = f['t']
        assert 0.0 <= f['mean'] <= 1.0 and 0.0 <= f['motion'] <= 1.0
        assert len(f['grid']) == rows * cols and all(0.0 <= v <= 1.0 for v in f['grid'])
        for e in f['events']:
            assert set(e) == {'x', 'y', 'strength'} and all(0.0 <= e[k] <= 1.0 for k in e)
    return True


# ---------------------------------------------------------------------------------------------------
# Synthetic "movie" with known content, used by the self-test below and by recipes P7 and P8.
SRC_FPS, SRC_FRAMES, H, W = 30, 360, 90, 180          # 12 seconds of 180 x 90 frames
FLASHES = [(24, 0.20, 0.30, 0.9), (61, 0.75, 0.60, 0.6), (100, 0.50, 0.15, 0.8), (139, 0.10, 0.80, 0.7),
           (175, 0.90, 0.25, 0.9), (212, 0.35, 0.70, 0.5), (262, 0.65, 0.45, 0.8), (311, 0.85, 0.85, 0.6)]
#           (first source frame, x, y, added brightness); each flash lasts 4 source frames
TREND = 0.20                                          # planted rise of the global mean over the clip


def synthetic_frames(seed=1):
    """Yield SRC_FRAMES frames: a slow global brightening (+TREND), a bright blob that sits still for
    the first half and drifts west -> east in the second half, 8 short flashes, and a little noise."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W]
    lat = np.radians(90.0 - (yy + 0.5) * 180.0 / H)
    base = 0.10 + 0.15 * np.cos(lat) ** 2
    for i in range(SRC_FRAMES):
        u = i / (SRC_FRAMES - 1)
        f = base + TREND * u
        bx = W * (0.17 + 0.66 * max(0.0, 2 * u - 1))                # blob centre: still, then moving
        f = f + 0.30 * np.exp(-((xx - bx) ** 2 + (yy - 0.3 * H) ** 2) / (2 * 9.0 ** 2))
        for start, fx, fy, amp in FLASHES:
            if start <= i < start + 4:
                f = f + amp * np.exp(-((xx - fx * W) ** 2 + (yy - fy * H) ** 2) / (2 * 2.0 ** 2))
        yield np.clip(f + rng.normal(0.0, 0.001, f.shape), 0.0, 1.0)


if __name__ == '__main__':
    STEP = 3                                                         # analyse every 3rd frame -> 10 per second
    frames = itertools.islice(synthetic_frames(), 0, None, STEP)
    tl = analyse(frames, fps=SRC_FPS, frame_step=STEP, grid=(4, 8), source='synthetic:p6_features.py',
                 notes='value = brightness 0..1; motion = raw mean absolute change per analysed frame; '
                       'event x: 0 = left (west), 1 = right; event y: 0 = top (north), 1 = bottom')
    validate_timeline(tl)
    with open('timeline.json', 'w') as fh:
        json.dump(tl, fh, separators=(',', ':'))
    with open('timeline.json') as fh:                                # everything below uses the file on disk
        tl = json.load(fh)
    validate_timeline(tl)
    fr = tl['frames']
    t = np.array([f['t'] for f in fr])
    mean = np.array([f['mean'] for f in fr])
    motion = np.array([f['motion'] for f in fr])
    print(f"timeline.json: {tl['meta']['n_frames']} frames, {t[1] - t[0]:.2f} s apart, last t = {t[-1]:.1f} s, "
          f"grid {tl['meta']['grid']}, {len(json.dumps(tl, separators=(',', ':')))} bytes")

    # planted trend: the global mean rises by TREND over the clip
    slope = np.polyfit(t, mean, 1)[0]
    planted = TREND / ((SRC_FRAMES - 1) / SRC_FPS)
    print(f'trend: mean {mean[0]:.3f} -> {mean[-1]:.3f}; fitted slope {slope:.5f}/s, planted {planted:.5f}/s')
    assert abs(slope - planted) < 0.05 * planted and abs((mean[-1] - mean[0]) - TREND) < 0.01

    # planted motion: the blob only moves in the second half
    half = len(fr) // 2
    print(f'motion: first half {motion[1:half].mean():.5f}, second half {motion[half + 1:].mean():.5f}')
    assert motion[0] == 0.0 and motion[half + 1:].mean() > 1.5 * motion[1:half].mean()

    # planted regional feature: the blob is in grid row 1; column 1 at the start, column 6 at the end
    g0 = np.array(fr[0]['grid']).reshape(4, 8)
    g1 = np.array(fr[-1]['grid']).reshape(4, 8)
    print('brightest cell of grid row 1: column', int(g0[1].argmax()), 'at the start, column', int(g1[1].argmax()), 'at the end')
    assert g0[1].argmax() == 1 and g1[1].argmax() == 6

    # planted flashes: every one is found once, at the right time and place, and nothing else is found
    found = [(f['t'], e['x'], e['y'], e['strength']) for f in fr for e in f['events']]
    assert len(found) == len(FLASHES), (len(found), found)
    worst_t = worst_xy = 0.0
    for (start, fx, fy, amp), (et, ex, ey, es) in zip(FLASHES, found):   # both lists are in time order
        worst_t = max(worst_t, abs(et - start / SRC_FPS))
        worst_xy = max(worst_xy, abs(ex - fx), abs(ey - fy))
    print(f'events: {len(found)}/{len(FLASHES)} flashes found, 0 false alarms; '
          f'worst timing error {worst_t:.3f} s, worst position error {worst_xy:.3f} (0..1 units)')
    assert worst_t <= STEP / SRC_FPS and worst_xy <= 0.03
    print('first event:', found[0])

    # no-data pixels (NaN, as recipe P5 produces) and masked pixels are ignored, not counted as zeros
    half_nan = np.full((H, W), 0.5)
    half_nan[:45] = np.nan
    mini = analyse([half_nan, half_nan], fps=1)['frames'][0]
    assert mini['mean'] == 0.5 and mini['grid'][0] == 0.0 and mini['grid'][-1] == 0.5 and mini['motion'] == 0.0
    keep = np.zeros((H, W), dtype=bool)
    keep[:, :90] = True                                              # use the left half only
    left_right = np.hstack([np.full((H, 90), 0.2), np.full((H, 90), 0.8)])
    assert analyse([left_right, left_right], fps=1, mask=keep)['frames'][0]['mean'] == 0.2
    print('P6 all checks passed')
