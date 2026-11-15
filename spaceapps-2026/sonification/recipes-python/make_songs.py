"""make_songs.py - two finished pieces from SVS 3912 (sea surface temperature):
  clip_song.wav          from the whole movie (needs timeline_3912.json made by real_demo.py)
  single_frame_song.wav  from ONE frame: chord bed + melody + reference tone + coast ticks, all in A

Usage:  python make_songs.py <folder with the raw data> <output folder>
Also writes clip_song.json and single_frame_song.json: every note with its time and the part of the picture it was read from.
"""
import json
import sys

import numpy as np

import musickit as mk
import p5_colormap as p5
import synth
import wavio

data, out = sys.argv[1], sys.argv[2]
SR = wavio.SR

# ---------------------------------------------------------------- 1) clip song: the whole movie
# Every layer carries one thing and keeps its own register, so it reads as a song AND as data:
#   melody  each bar scans the 8 grid columns of the frame on screen (west->east, next bar east->west);
#           each eighth note = the mean ocean temperature of one column. Fixed range for the whole clip.
#   bass    one root per bar = the average temperature of the whole view during that bar (the slow trend).
#   hi-hat  Euclidean pattern, more hits when the picture is changing faster in that bar.
#   kick and snare never change: they are the ruler (one bar = 2 s of the movie).
with open(f'{data}/timeline_3912.json') as fh:
    tl = json.load(fh)
frames = tl['frames']
GR, GC = tl['meta']['grid']
BEAT, BAR, EIGHTH = 0.5, 2.0, 0.25                      # 120 beats per minute, 4 beats per bar
clip_dur = frames[-1]['t'] + (frames[1]['t'] - frames[0]['t'])
n_bars = int(np.ceil(clip_dur / BAR))
times = np.array([f['t'] for f in frames])
grid = np.array([f['grid'] for f in frames]).reshape(len(frames), GR, GC)      # 0 = land, else 0..1 = 0..32 C
ocean = grid > 0
col_mean = np.where(ocean.any(axis=1), (grid * ocean).sum(axis=1) / np.maximum(ocean.sum(axis=1), 1), np.nan)   # (frames, GC)
mean = np.array([f['mean'] for f in frames])
motion = np.array([f['motion'] for f in frames])
frame_at = lambda t: min(len(frames) - 1, int(np.searchsorted(times, t, side='right')) - 1)
in_bar = lambda b: (times >= b * BAR) & (times < (b + 1) * BAR)
bar_mean = np.array([mean[in_bar(b)].mean() for b in range(n_bars)])
bar_motion = np.array([motion[in_bar(b)].mean() for b in range(n_bars)])
m_lo, m_hi = np.nanpercentile(col_mean, [5, 95])        # ignore the rarest 5 % at each end so the common values spread out
b_lo, b_hi = bar_mean.min(), bar_mean.max()
LEAD_ROOT, BASS_ROOT, LEAD_OCT = 57, 33, 3              # melody A3..A6 (16 notes): about 1 C per note step
REF = mk.quantize(0.5, LEAD_ROOT, octaves=LEAD_OCT)     # the middle of the melody range, sounded once per bar

clip = np.zeros((int((n_bars * BAR + 2.0) * SR), 2))
rng = np.random.default_rng(0)                           # seeded: the same movie always gives the same song
tt = lambda dur: np.arange(int(dur * SR)) / SR
kick = np.sin(2 * np.pi * (45 * tt(0.25) + (120 - 45) * 0.03 * (1 - np.exp(-tt(0.25) / 0.03)))) * np.exp(-tt(0.25) / 0.09)
snare = (rng.uniform(-1, 1, int(0.18 * SR)) * 0.8 + 0.4 * np.sin(2 * np.pi * 190 * tt(0.18))) * np.exp(-tt(0.18) / 0.05)
hat = np.diff(rng.uniform(-1, 1, int(0.05 * SR) + 1)) * np.exp(-tt(0.05) / 0.012)       # differenced noise = bright
drum = lambda sig, t, gain, x=0.5: synth.mix_in(clip, synth.pan(sig, x), t, gain=gain)
c_lead, c_bars, c_motifs = [], [], []
for b in range(n_bars):
    t0 = b * BAR
    # bass + pad: the bar's average temperature
    warm = float((bar_mean[b] - b_lo) / (b_hi - b_lo))          # 0 = coolest bar of the clip, 1 = warmest
    bm = mk.quantize(warm, BASS_ROOT, octaves=2)                # 11 steps over two octaves: about 0.6 C per step
    for off, dur, g in ((0.0, 0.7, 0.55), (0.75, 0.2, 0.4), (1.0, 0.45, 0.5), (1.75, 0.2, 0.4)):
        synth.mix_in(clip, synth.pan(synth.voice(mk.midi_to_hz(bm), dur, harmonics=3, decay=0.2, sustain=0.5), 0.5), t0 + off, gain=g)
    for m in mk.chord(bm + 12, 'power'):
        # the held chord swells and brightens as the whole view warms, so the arc of the clip is audible
        synth.mix_in(clip, synth.pan(synth.voice(mk.midi_to_hz(m), BAR, harmonics=1 + int(round(6 * warm)), attack=0.3, release=0.5), 0.5),
                     t0, gain=0.03 + 0.09 * warm)
    # every 4 bars a two-note bell: THEN (the first bar's average) and NOW (this bar's average)
    then_now = b % 4 == 0 and b > 0
    if then_now:
        for off, w in ((0.0, float((bar_mean[0] - b_lo) / (b_hi - b_lo))), (0.5, warm)):
            f = mk.midi_to_hz(mk.quantize(w, 69, octaves=2))
            bell = (np.sin(2 * np.pi * f * tt(0.9)) + 0.5 * np.sin(2 * np.pi * 2 * f * tt(0.9)) + 0.25 * np.sin(2 * np.pi * 3.01 * f * tt(0.9))) * np.exp(-tt(0.9) / 0.22)
            synth.mix_in(clip, synth.pan(bell, 0.5), t0 + off, gain=0.33)
        c_motifs.append({'t': t0, 'then': mk.note_name(mk.quantize(float((bar_mean[0] - b_lo) / (b_hi - b_lo)), 69, octaves=2)),
                         'now': mk.note_name(mk.quantize(warm, 69, octaves=2)), 'then_C': round(32 * float(bar_mean[0]), 1),
                         'now_C': round(32 * float(bar_mean[b]), 1)})
    # drums: fixed kick and snare, data-driven hi-hat density
    if not then_now:
        synth.mix_in(clip, synth.pan(synth.voice(mk.midi_to_hz(REF), 0.12, harmonics=1), 0.5), t0, gain=0.22)   # reference tone
    for off in (0.0, 1.0):
        drum(kick, t0 + off, 0.9)
    for off in (0.5, 1.5):
        drum(snare, t0 + off, 0.3)
    k = 4 + int(round(8 * bar_motion[b] / bar_motion.max()))
    for s16, on in enumerate(mk.euclid(k, 16)):
        if on:
            drum(hat, t0 + s16 * BAR / 16, 0.22 if s16 % 4 else 0.3, 0.6)
    # melody: scan the columns, alternating direction so the line rises and falls
    order = list(range(GC)) if b % 2 == 0 else list(range(GC - 1, -1, -1))
    for i, c in enumerate(order):
        t = t0 + i * EIGHTH
        if t >= clip_dur:
            break
        v = col_mean[frame_at(t), c]
        if not np.isfinite(v):
            continue                                       # the whole column is land: a rest
        u = float(np.clip((v - m_lo) / (m_hi - m_lo), 0.0, 1.0))
        m = mk.quantize(u, LEAD_ROOT, octaves=LEAD_OCT)
        # the same value also sets tone colour and loudness: warm = bright and strong, cold = dull and soft
        synth.mix_in(clip, synth.pan(synth.voice(mk.midi_to_hz(m), EIGHTH * 1.5, harmonics=1 + int(round(9 * u))), 0.15 + 0.7 * c / (GC - 1)),
                     t, gain=(0.4 + 0.3 * u) * (0.45 if then_now and i < 4 else 1.0))   # make room for the bell
        c_lead.append({'t': round(t, 3), 'col': c, 'C': round(32 * float(v), 1), 'note': mk.note_name(m), 'midi': m})
    c_bars.append({'t': t0, 'bass': mk.note_name(bm), 'mean_C': round(32 * float(bar_mean[b]), 1), 'hats': k,
                   'since_start_C': round(32 * float(bar_mean[b] - bar_mean[0]), 1),
                   'dir': 'west to east' if b % 2 == 0 else 'east to west'})
wavio.write_wav(f'{out}/clip_song.wav', synth.reverb(clip, rt60=0.9, wet=0.12))
wavio.check_wav(f'{out}/clip_song.wav', channels=2)
with open(f'{out}/clip_song.json', 'w') as fh:
    json.dump({'meta': {'grid': [GR, GC], 'bar_s': BAR, 'eighth_s': EIGHTH, 'bpm': 120, 'key': 'A major pentatonic',
                        'melody_range_C': [round(32 * float(m_lo), 1), round(32 * float(m_hi), 1)],
                        'bass_range_C': [round(32 * float(b_lo), 1), round(32 * float(b_hi), 1)],
                        'scale': [{'midi': m, 'name': mk.note_name(m)} for m in mk.scale_notes(LEAD_ROOT, 'pentatonic_major', LEAD_OCT)],
                        'reference_note': mk.note_name(REF), 'reference_C': round(16 * float(m_lo + m_hi), 1)},
               'lead': c_lead, 'bars': c_bars, 'motifs': c_motifs,
               'frames': [{'t': f['t'], 'grid': [round(32 * g, 1) for g in f['grid']]} for f in frames]}, fh, separators=(',', ':'))
print(f"clip song: {len(clip) / SR:.1f} s, {n_bars} bars, {len(c_lead)} melody notes using {len(set(n['note'] for n in c_lead))} different pitches; "
      f"bass notes used {sorted(set(x['bass'] for x in c_bars))}; hi-hat hits per bar {min(x['hats'] for x in c_bars)}..{max(x['hats'] for x in c_bars)}")
print('first two bars:', [n['note'] for n in c_lead[:16]])

# ---------------------------------------------------------------- 2) single-frame song
W, H = 342, 192
rgb = np.fromfile(f'{data}/b1_t34_342x192_rgb.raw', dtype=np.uint8).reshape(H, W, 3)
bar = np.fromfile(f'{data}/cbar_310x95_rgba.raw', dtype=np.uint8).reshape(95, 310, 4)
value = p5.invert_colormap(rgb, p5.legend_from_strip(bar[30:67, 16:290, :3]), hue_only=True)   # 0..1 = 0..32 C, NaN = land


def strip_mean(block):
    return float(np.nanmean(block)) if np.isfinite(block).any() else float('nan')


ROOT = 45                                   # A2: every layer uses A major pentatonic, so nothing clashes
BEAT = 0.5                                  # 120 beats per minute
ROWS, COLS, STEP = 8, 40, BEAT / 2          # 8 strips north to south; 40 strips west to east, two per beat
rows = [strip_mean(value[r]) for r in np.array_split(np.arange(H), ROWS)]
cols = [strip_mean(value[:, c]) for c in np.array_split(np.arange(W), COLS)]
r_lo, r_hi = np.nanmin(rows), np.nanmax(rows)
c_lo, c_hi = np.nanmin(cols), np.nanmax(cols)
row_notes = [mk.quantize((v - r_lo) / (r_hi - r_lo), ROOT, octaves=2) for v in rows]          # bed: A2 .. A4
ref = mk.quantize((strip_mean(value) - c_lo) / (c_hi - c_lo), ROOT + 12, octaves=2)           # the frame's overall mean

T_INTRO = ROWS * BEAT                       # 4.0 s: the eight strips one by one, top to bottom
T_MEL = COLS * STEP                         # 10.0 s: the melody, with the chord held underneath
T_END = 3.0                                 # the chord alone, fading
buf = np.zeros((int((T_INTRO + T_MEL + T_END + 1.5) * SR), 2))
events = []                                 # what the visualizer draws


def add(track, t, dur, midi, x, gain, region, C, **voice):
    synth.mix_in(buf, synth.pan(synth.voice(mk.midi_to_hz(midi), dur, **voice), x), t, gain=gain)
    events.append({'track': track, 't': round(t, 3), 'dur': round(dur, 3), 'note': mk.note_name(midi), 'region': region,
                   'C': None if C is None else round(32 * C, 1)})


for i, m in enumerate(row_notes):           # intro, then the same notes held as a quiet bed
    add('intro', i * BEAT, BEAT * 0.95, m, 0.5, 0.8, {'row': i}, rows[i], harmonics=6)
    add('bed', T_INTRO, T_MEL + T_END, m, 0.5, 0.16, {'row': i}, rows[i], harmonics=3, attack=0.4, release=1.5)
was_land = False
for j, v in enumerate(cols):                # melody: one note per vertical strip, a rest over land
    t, x, land = T_INTRO + j * STEP, j / (COLS - 1), not np.isfinite(v)
    if j % 8 == 0:                          # reference tone at the start of every bar: the frame's mean temperature
        add('ref', t, 0.2, ref, 0.5, 0.25, {'all': True}, strip_mean(value), harmonics=1)
    if j and land != was_land:              # a tick each time the scan crosses a coastline
        add('coast', t, 0.06, 93, x, 0.3, {'col': j}, None, harmonics=1, attack=0.002, decay=0.03, sustain=0.0, release=0.02)
    was_land = land
    if not land:
        m = mk.quantize((v - c_lo) / (c_hi - c_lo), ROOT + 12, octaves=2)
        add('lead', t, STEP * 1.6, m, x, 0.7, {'col': j}, v, harmonics=5)
wavio.write_wav(f'{out}/single_frame_song.wav', synth.reverb(buf, rt60=1.4, wet=0.2))
wavio.check_wav(f'{out}/single_frame_song.wav', channels=2)

events.sort(key=lambda e: e['t'])
meta = {'rows': ROWS, 'cols': COLS, 'intro_s': T_INTRO, 'melody_s': T_MEL, 'end_s': T_END, 'key': 'A major pentatonic',
        'reference_note': mk.note_name(ref), 'frame_mean_C': round(32 * strip_mean(value), 1),
        'rows_C': [round(32 * v, 1) for v in rows], 'melody_range_C': [round(32 * c_lo, 1), round(32 * c_hi, 1)]}
with open(f'{out}/single_frame_song.json', 'w') as fh:
    json.dump({'meta': meta, 'events': events}, fh, separators=(',', ':'))
lead = [e for e in events if e['track'] == 'lead']
print(f"single-frame song: {len(buf) / SR:.1f} s; bed {[mk.note_name(m) for m in row_notes]}; {len(lead)} lead notes "
      f"{lead[0]['note']}..{lead[-1]['note']}; reference {meta['reference_note']} ({meta['frame_mean_C']} C); "
      f"{sum(e['track'] == 'coast' for e in events)} coast ticks")
