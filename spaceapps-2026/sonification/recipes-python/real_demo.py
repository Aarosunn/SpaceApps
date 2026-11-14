"""real_demo.py - the whole pipeline on a real EIC movie (SVS 3912, sea surface currents coloured by
temperature). Usage:  python -I real_demo.py <folder with the recipe files> <folder with the raw data>
Inputs (made by the ffmpeg commands in recipe S1):
  cbar_310x95_rgba.raw    the page's colour-bar image as raw RGBA bytes
  b1_160x90_rgb.raw       the movie at 5 frames per second, 160 x 90 pixels, raw RGB bytes"""
import json
import sys

sys.path.insert(0, sys.argv[1])
import numpy as np

import p5_colormap as p5
import p6_features as p6
import p7_render as p7
import score
import wavio

data = sys.argv[2]
W, H, SRC_FPS, STEP = 160, 90, 30, 6                               # 30 fps movie, every 6th frame = 5 per second

# 1) legend: crop the colour bar out of its picture (rows and columns found by looking at the image)
bar = np.fromfile(f'{data}/cbar_310x95_rgba.raw', dtype=np.uint8).reshape(95, 310, 4)
legend = p5.legend_from_strip(bar[30:67, 16:290, :3])
print(f'legend: {len(legend)} colours, from {legend[0]} (0 C) to {legend[-1]} (32 C)')

# 2) every frame: pixel colour -> value 0..1 (= 0..32 C), NaN where there is no clear colour
rgb = np.fromfile(f'{data}/b1_160x90_rgb.raw', dtype=np.uint8).reshape(-1, H, W, 3)
plain = p5.invert_colormap(rgb[len(rgb) // 2], legend)
values = np.array([p5.invert_colormap(f, legend, hue_only=True) for f in rgb])
ok = np.isfinite(values)
print(f'{len(rgb)} frames; middle frame: full-colour matching keeps {np.isfinite(plain).mean():.1%} of the pixels, '
      f'hue-only matching keeps {ok[len(rgb) // 2].mean():.1%}')
mid = values[len(rgb) // 2]
print('middle frame, mean temperature of the top / middle / bottom third: '
      + ' / '.join(f'{32 * np.nanmean(mid[a:b]):.1f} C' for a, b in ((0, 30), (30, 60), (60, 90))))

# 3) features -> timeline JSON
tl = p6.analyse(values, fps=SRC_FPS, frame_step=STEP, grid=(4, 8), value_range=(0.0, 32.0),
                source='SVS 3912 flat_global_ecco2_6840x3420_768p30-b1.webm',
                notes='value = sea surface temperature read from pixel hue via the page colour bar, '
                      '0..1 = 0..32 C; only coloured pixels count; motion = raw mean absolute change')
p6.validate_timeline(tl)
with open(f'{data}/timeline_3912.json', 'w') as fh:
    json.dump(tl, fh, separators=(',', ':'))
mean = np.array([f['mean'] for f in tl['frames']])
n_events = sum(len(f['events']) for f in tl['frames'])
print(f"timeline: {tl['meta']['n_frames']} frames, mean temperature in view {32 * mean.min():.1f} to {32 * mean.max():.1f} C "
      f"(first {32 * mean[0]:.1f}, last {32 * mean[-1]:.1f}); default event detector fired {n_events} times")

# 4) notes -> audio. Events are switched off: moving flow lines are not flashes.
for f in tl['frames']:
    f['events'] = []
notes, info = score.make_score(tl, legend=False)
mix, _ = p7.render(notes, info['total'])
wavio.write_wav(f'{data}/real_3912.wav', mix)
wavio.check_wav(f'{data}/real_3912.wav', channels=2, dur=info['total'] + 2.0)
lead = info['lead_notes']
print(f"lead: {len(lead)} notes, {len(set(lead))} different pitches, lowest value {32 * info['lo']:.1f} C, "
      f"highest {32 * info['hi']:.1f} C; pulse onsets per bar from {min(info['pulse_k'])} to {max(info['pulse_k'])}")
