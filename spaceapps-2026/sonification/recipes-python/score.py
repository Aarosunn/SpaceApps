"""score.py (recipe P7, part 1) - timeline JSON -> a list of notes. This file IS the mapping.
Needs: the Python standard library + musickit.py (recipe P3). No numpy, so the MIDI recipe can use it.
A note is a dict: t (start, seconds), dur (seconds), midi (note number), vel (loudness 0..1),
pan (0 = left .. 1 = right) and track ('pad', 'lead', 'ref', 'event' or 'pulse')."""
import bisect

import musickit as mk


def interp(ts, vs, t):
    """Value of the series (ts, vs) at time t by linear interpolation (held flat beyond both ends)."""
    i = bisect.bisect_right(ts, t)
    if i == 0:
        return vs[0]
    if i == len(ts):
        return vs[-1]
    w = (t - ts[i - 1]) / (ts[i] - ts[i - 1])
    return vs[i - 1] + w * (vs[i] - vs[i - 1])


def make_score(tl, bpm=120, root=45, scale='pentatonic_major', lead='mean', lead_per_beat=2, lead_octaves=2,
               stretch=True, legend=True, time_scale=1.0, bar_beats=4, pulse_steps=16, pulse_max=8):
    """Turn a timeline (recipe P6) into notes. Returns (notes sorted by time, info dict).

    Layers and what drives them:
      lead   the key variable (`lead` = 'mean' or a grid cell index) sampled lead_per_beat times per
             beat and snapped to the scale: higher value = higher note. With stretch=True the lowest
             and highest value of this clip span the whole note range (best contrast); with
             stretch=False the fixed 0..1 range does (comparable between clips). Its stereo position
             is the brightest grid column (west = left).
      ref    a short soft reference tone on every bar: always the note the lead started on.
      pad    one sustained chord per bar (root, fifth, octave); louder and brighter when the
             2-bar average of the lead variable is higher (the slow trend).
      event  one percussive hit per flash: time = when, pan = x, pitch = y (north = high),
             loudness = strength.
      pulse  a quiet tick pattern per bar: Euclidean rhythm E(k, pulse_steps) where k grows with the
             bar's mean motion (2 = calm ... pulse_max = busiest bar of the clip).
    legend=True starts with a 2-bar audio legend: lowest note, highest note, then the reference note.
    time_scale stretches data time (2.0 = half speed)."""
    frames = tl['frames']
    cols = tl['meta']['grid'][1]
    dt = frames[1]['t'] - frames[0]['t'] if len(frames) > 1 else 1.0
    ts = [f['t'] * time_scale for f in frames]
    series = [f['mean'] if lead == 'mean' else f['grid'][lead] for f in frames]
    lo, hi = (min(series), max(series)) if stretch else (0.0, 1.0)
    norm = lambda v: (v - lo) / (hi - lo) if hi > lo else 0.5
    motion = [f['motion'] for f in frames]
    beat = 60.0 / bpm
    bar = bar_beats * beat
    data_dur = (frames[-1]['t'] + dt) * time_scale
    t0 = 2 * bar if legend else 0.0                                  # data starts after the legend
    lead_root = root + 12
    notes = []

    def brightest_col(t):                                            # 0..1 position of the brightest column
        f = frames[min(len(frames) - 1, bisect.bisect_right(ts, t))]
        sums = [sum(f['grid'][c::cols]) for c in range(cols)]
        return (sums.index(max(sums)) + 0.5) / cols

    # lead ------------------------------------------------------------------------------------------
    step = beat / lead_per_beat
    lead_notes = []
    for j in range(int(data_dur / step + 1e-9)):
        t = j * step
        m = mk.quantize(norm(interp(ts, series, t)), lead_root, scale, lead_octaves)
        lead_notes.append(m)
        notes.append({'t': t0 + t, 'dur': 0.9 * step, 'midi': m, 'vel': 0.8, 'pan': brightest_col(t), 'track': 'lead'})
    ref = lead_notes[0]

    # audio legend: lowest note, highest note, reference note ---------------------------------------
    top = lead_root + 12 * lead_octaves
    if legend:
        for k, m in enumerate((lead_root, top, ref)):
            notes.append({'t': k * 2 * beat, 'dur': 1.5 * beat, 'midi': m, 'vel': 0.8, 'pan': 0.5,
                          'track': 'lead' if k < 2 else 'ref'})

    # per bar: reference tone, pad chord, Euclidean pulse ---------------------------------------------
    n_bars = int(data_dur / bar + 0.999)
    bar_motion = []
    for b in range(n_bars):
        inside = [m for m, t in zip(motion, ts) if b * bar <= t < (b + 1) * bar]
        bar_motion.append(sum(inside) / len(inside) if inside else 0.0)
    busiest = max(bar_motion) or 1.0
    pulse_k = []
    for b in range(n_bars):
        tb = b * bar
        notes.append({'t': t0 + tb, 'dur': 0.5 * beat, 'midi': ref, 'vel': 0.45, 'pan': 0.5, 'track': 'ref'})
        window = [norm(interp(ts, series, tb + q * bar / 4)) for q in range(-4, 5)]    # 2-bar average
        level = min(1.0, max(0.0, sum(window) / len(window)))
        for m in mk.chord(root, 'power'):
            notes.append({'t': t0 + tb, 'dur': bar, 'midi': m, 'vel': 0.3 + 0.7 * level, 'pan': 0.5, 'track': 'pad'})
        k = 2 + round((pulse_max - 2) * bar_motion[b] / busiest)
        pulse_k.append(k)
        for s, on in enumerate(mk.euclid(k, pulse_steps)):
            if on and tb + s * bar / pulse_steps < data_dur:
                notes.append({'t': t0 + tb + s * bar / pulse_steps, 'dur': 0.05, 'midi': 76,
                              'vel': 0.7 if s == 0 else 0.4, 'pan': 0.5, 'track': 'pulse'})

    # events ----------------------------------------------------------------------------------------
    for f in frames:
        for e in f['events']:
            notes.append({'t': t0 + f['t'] * time_scale, 'dur': 0.25,
                          'midi': mk.quantize(1.0 - e['y'], root + 24, scale, 2),
                          'vel': 0.4 + 0.6 * e['strength'], 'pan': e['x'], 'track': 'event'})

    notes.sort(key=lambda n: (n['t'], n['track'], n['midi']))
    info = {'t0': t0, 'data_dur': data_dur, 'total': t0 + data_dur, 'beat': beat, 'bar': bar, 'lo': lo, 'hi': hi,
            'lead_notes': lead_notes, 'lead_low': lead_root, 'lead_high': top, 'ref': ref, 'pulse_k': pulse_k}
    return notes, info


if __name__ == '__main__':
    import json
    with open('timeline.json') as fh:
        tl = json.load(fh)
    notes, info = make_score(tl)
    by_track = {}
    for n in notes:
        by_track.setdefault(n['track'], []).append(n)
    print('notes per track:', {k: len(v) for k, v in sorted(by_track.items())})
    print(f"data {info['data_dur']:.1f} s after a {info['t0']:.1f} s legend; lead range "
          f"{info['lo']:.3f}..{info['hi']:.3f} -> {mk.note_name(info['lead_low'])}..{mk.note_name(info['lead_high'])}")
    print('lead notes:', ' '.join(mk.note_name(m) for m in info['lead_notes']))
    print('pulse onsets per bar (from motion):', info['pulse_k'], ' e.g.', mk.pattern(mk.euclid(info['pulse_k'][-1], 16)))

    assert abs(interp([0, 1, 2], [0.0, 10.0, 0.0], 0.25) - 2.5) < 1e-12 and interp([0, 1], [3, 4], 9) == 4
    assert all(0.0 <= n['pan'] <= 1.0 and 0.0 < n['vel'] <= 1.0 and n['dur'] > 0 and n['t'] >= 0 for n in notes)
    assert all(n['t'] + 1e-9 >= info['t0'] for n in notes if n['track'] in ('pad', 'event', 'pulse'))
    assert max(n['t'] for n in notes) < info['total']
    in_scale = set(mk.scale_notes(57, 'pentatonic_major', 2))
    assert all(m in in_scale for m in info['lead_notes'])
    assert info['lead_notes'][0] == 57 and info['lead_notes'][-1] == 81           # rising data -> rising melody
    assert all(b >= a for a, b in zip(info['lead_notes'], info['lead_notes'][1:]))
    lead = [n for n in by_track['lead'] if n['t'] >= info['t0']]
    assert lead[0]['pan'] < 0.3 and lead[-1]['pan'] > 0.7                         # melody follows the blob west -> east
    assert len(by_track['event']) == sum(len(f['events']) for f in tl['frames']) == 8
    first = tl['frames'][8]['events'][0]                                          # the flash at t = 0.8 s
    hit = by_track['event'][0]
    assert abs(hit['t'] - (info['t0'] + 0.8)) < 1e-9 and hit['pan'] == first['x']
    assert info['pulse_k'][0] < info['pulse_k'][-1] == 8                          # more motion -> busier pulse
    pads = by_track['pad']
    assert pads[0]['vel'] < pads[-1]['vel']                                       # rising trend -> brighter pad
    # same timeline, fixed 0..1 range and half speed
    notes2, info2 = make_score(tl, stretch=False, time_scale=2.0, legend=False)
    assert info2['t0'] == 0.0 and abs(info2['data_dur'] - 2 * info['data_dur']) < 1e-9
    assert len(set(info2['lead_notes'])) < len(set(info['lead_notes']))           # less contrast without stretch
    print('fixed 0..1 range uses', len(set(info2['lead_notes'])), 'different lead notes; stretched range uses',
          len(set(info['lead_notes'])))
    print('P7 (score) all checks passed')
