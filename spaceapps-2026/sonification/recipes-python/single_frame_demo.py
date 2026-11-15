"""single_frame_demo.py - three ways to hear ONE real frame (SVS 3912, sea surface temperature).

Usage:  python single_frame_demo.py [data folder] [output folder]     (defaults: ./data and ../recipes-browser/single-frame)
Inputs (cut with ffmpeg, see real_demo.py):
  b1_t34_342x192_rgb.raw   one movie frame, 342 x 192, raw RGB bytes
  cbar_310x95_rgba.raw     the page's colour bar, raw RGBA bytes
Writes frame.bmp, 1_column_scan.wav, 2_north_to_south_chord.wav, 3_west_to_east_melody.wav, summary.json.
"""
import json
import os
import struct
import sys

import numpy as np

import musickit as mk
import p4_colscan as p4
import p5_colormap as p5
import synth
import wavio

HERE = os.path.dirname(os.path.abspath(__file__))
# defaults: the small input files committed in data/, and the page folder that plays the result
data = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'data')
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'recipes-browser', 'single-frame')
W, H = 342, 192
rgb = np.fromfile(f'{data}/b1_t34_342x192_rgb.raw', dtype=np.uint8).reshape(H, W, 3)
bar = np.fromfile(f'{data}/cbar_310x95_rgba.raw', dtype=np.uint8).reshape(95, 310, 4)
legend = p5.legend_from_strip(bar[30:67, 16:290, :3])            # same crop as real_demo.py; 0 C .. 32 C

# the frame as a picture for the listen page (24-bit BMP: standard library only, rows bottom-up, BGR)
pad = (4 - W * 3 % 4) % 4
rows = b''.join(rgb[y, :, ::-1].tobytes() + b'\0' * pad for y in range(H - 1, -1, -1))
with open(f'{out}/frame.bmp', 'wb') as fh:
    fh.write(b'BM' + struct.pack('<IHHI', 54 + len(rows), 0, 0, 54)
             + struct.pack('<IiiHHIIiiII', 40, W, H, 1, 24, 0, len(rows), 2835, 2835, 0, 0) + rows)

# 1) naive baseline: brightness only, every row is an oscillator, scan left to right
luma = (rgb @ np.array([0.2126, 0.7152, 0.0722])) / 255.0
small = luma.reshape(48, 4, W).mean(axis=1)                      # 192 rows -> 48 oscillators
scan, _ = p4.colscan(small, dur=6.0)
wavio.write_wav(f'{out}/1_column_scan.wav', scan)

# colourmap inversion: pixel hue -> 0..1 along the colour bar (= 0..32 C); NaN on land and labels
value = p5.invert_colormap(rgb, legend, hue_only=True)
kept = float(np.isfinite(value).mean())

# The frame is a regional view (eastern North America and the Gulf Stream), not a global map, so the
# bands below are simply strips of the picture, not true latitude bands.
def strip_mean(block):
    return float(np.nanmean(block)) if np.isfinite(block).any() else float('nan')

# 2) eight horizontal strips, top (north) to bottom (south), one note each, then all together as a chord
bands = [strip_mean(value[r]) for r in np.array_split(np.arange(H), 8)]
global_mean = strip_mean(value)
lo, hi = np.nanmin(bands), np.nanmax(bands)
band_notes = [mk.quantize((b - lo) / (hi - lo), root=48, octaves=2) for b in bands if np.isfinite(b)]
wavio.write_wav(f'{out}/2_north_to_south_chord.wav', p5.chord_audio(band_notes, step=0.45, hold=3.0))

# 3) west to east across the ocean part of the view: one note per vertical strip (mean temperature of its
#    ocean pixels). Strips that are all land at the west edge are skipped; any later one is a rest.
STEPS, STEP_S = 40, 0.22
strip = np.array([strip_mean(value[:, c]) for c in np.array_split(np.arange(W), STEPS)])
first = int(np.argmax(np.isfinite(strip)))
strip = strip[first:]
s_lo, s_hi = np.nanmin(strip), np.nanmax(strip)
buf = np.zeros((int((len(strip) * STEP_S + 1.5) * wavio.SR), 2))
melody = []
for i, v in enumerate(strip):
    if not np.isfinite(v):
        melody.append(None)
        continue
    m = mk.quantize((v - s_lo) / (s_hi - s_lo), root=57, octaves=2)
    melody.append(mk.note_name(m))
    x = (first + i) / (STEPS - 1)                                # stereo position = position in the picture
    synth.mix_in(buf, synth.pan(synth.voice(mk.midi_to_hz(m), STEP_S * 1.6, harmonics=5), x), i * STEP_S)
wavio.write_wav(f'{out}/3_west_to_east_melody.wav', synth.reverb(buf, rt60=1.0, wet=0.18))

summary = {
    'pixels_with_a_readable_colour': round(kept, 3),
    'global_mean_C': round(32 * global_mean, 1),
    'strips_north_to_south_C': [None if not np.isfinite(b) else round(32 * b, 1) for b in bands],
    'band_notes': [mk.note_name(m) for m in band_notes],
    'strips_west_to_east_C': [None if not np.isfinite(v) else round(32 * float(v), 1) for v in strip],
    'land_strips_skipped_at_west_edge': first,
    'melody': melody,
}
with open(f'{out}/summary.json', 'w') as fh:
    json.dump(summary, fh, indent=1)
for name, dur in (('1_column_scan.wav', 6.0), ('2_north_to_south_chord.wav', None), ('3_west_to_east_melody.wav', None)):
    wavio.check_wav(f'{out}/{name}', channels=2, dur=dur)
print(json.dumps(summary, indent=1))
