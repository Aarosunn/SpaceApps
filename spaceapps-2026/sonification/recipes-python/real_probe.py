# scratch: inspect the real colour bar and one real frame (run with an isolated interpreter: python -I)
import sys

sys.path.insert(0, sys.argv[1])          # folder with the recipe modules (my own code)
import numpy as np

import p5_colormap as p5

data = sys.argv[2]
bar = np.fromfile(data + '/cbar_310x95_rgba.raw', dtype=np.uint8).reshape(95, 310, 4)
rgb, alpha = bar[..., :3].astype(int), bar[..., 3]
colourful = (rgb.max(axis=2) - rgb.min(axis=2) > 80) & (alpha > 200)
rows = np.nonzero(colourful.mean(axis=1) > 0.5)[0]
cols = np.nonzero(colourful[rows.min():rows.max() + 1].mean(axis=0) > 0.5)[0]
print('alpha values:', np.unique(alpha)[:6], '... colourful rows', rows.min(), rows.max(), 'cols', cols.min(), cols.max())
strip = bar[rows.min() + 2:rows.max() - 1, cols.min() + 2:cols.max() - 1, :3]
legend = p5.legend_from_strip(strip)
print('legend entries', len(legend), 'first', legend[0], 'mid', legend[len(legend) // 2], 'last', legend[-1])
lab = p5.srgb_to_oklab(legend)
steps = np.linalg.norm(np.diff(lab, axis=0), axis=1)
print('neighbour distance min/median/max', steps.min().round(4), np.median(steps).round(4), steps.max().round(4),
      'distinct', len(np.unique(legend, axis=0)), 'L range', lab[:, 0].min().round(3), lab[:, 0].max().round(3))

frame = np.fromfile(data + '/b1_t34_342x192_rgb.raw', dtype=np.uint8).reshape(192, 342, 3)
print('frame mean rgb', frame.reshape(-1, 3).mean(axis=0).round(1), 'max', frame.max())
for tol in (0.03, 0.05, 0.08, 0.12):
    v = p5.invert_colormap(frame, legend, tol=tol)
    ok = np.isfinite(v)
    print(f'tol {tol}: matched {ok.mean():.1%} of pixels; value mean {np.nanmean(v):.3f} = {32 * np.nanmean(v):.1f} C;',
          'top-third mean %.1f C, bottom-third mean %.1f C' % (32 * np.nanmean(v[:64]), 32 * np.nanmean(v[128:])))
# how do unmatched pixels look? brightness of matched vs unmatched
v = p5.invert_colormap(frame, legend, tol=0.08)
lum = frame.astype(float).mean(axis=2)
print('mean brightness matched %.1f unmatched %.1f' % (lum[np.isfinite(v)].mean(), lum[~np.isfinite(v)].mean()))
bright = lum > 60
print('of bright pixels (>60): matched %.1f%%' % (100 * np.isfinite(v)[bright].mean()), ' bright share %.1f%%' % (100 * bright.mean()))
