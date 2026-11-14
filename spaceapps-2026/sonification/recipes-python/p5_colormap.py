"""p5_colormap.py (recipe P5) - colour-bar inversion: pixel colour -> data value -> zonal chord.
Needs: numpy + wavio.py, synth.py, musickit.py (recipes P1 to P3)."""
import numpy as np

import musickit as mk
import synth
import wavio

SR = wavio.SR

# OKLab matrices, copied from Bjorn Ottosson, "A perceptual color space for image processing" (2020)
RGB_TO_LMS = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                       [0.2119034982, 0.6806995451, 0.1073969566],
                       [0.0883024619, 0.2817188376, 0.6299787005]])
LMS_TO_LAB = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                       [1.9779984951, -2.4285922050, 0.4505937099],
                       [0.0259040371, 0.7827717662, -0.8086757660]])
LAB_TO_LMS = np.array([[1.0, 0.3963377774, 0.2158037573],
                       [1.0, -0.1055613458, -0.0638541728],
                       [1.0, -0.0894841775, -1.2914855480]])
LMS_TO_RGB = np.array([[4.0767416621, -3.3077115913, 0.2309699292],
                       [-1.2684380046, 2.6097574011, -0.3413193965],
                       [-0.0041960863, -0.7034186147, 1.7076147010]])


def srgb_to_oklab(rgb):
    """sRGB colours, shape (..., 3), uint8 0..255 or float 0..1 -> OKLab (L, a, b), same shape.
    L is lightness 0..1; a is green-red, b is blue-yellow. Straight-line distance in OKLab is
    roughly "how different two colours look", which is not true of raw RGB numbers."""
    c = np.asarray(rgb)
    c = c / 255.0 if c.dtype == np.uint8 else c.astype(np.float64)
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)     # undo the sRGB gamma curve
    return np.cbrt(lin @ RGB_TO_LMS.T) @ LMS_TO_LAB.T


def oklab_to_srgb(lab):
    """OKLab -> sRGB floats 0..1 (values outside 0..1 mean the colour cannot be shown; clip them)."""
    lin = ((np.asarray(lab) @ LAB_TO_LMS.T) ** 3) @ LMS_TO_RGB.T
    return np.where(lin <= 0.0031308, 12.92 * lin, 1.055 * np.maximum(lin, 0.0) ** (1 / 2.4) - 0.055)


def legend_from_strip(strip):
    """Colour-bar picture cropped to the bar itself, shape (h, K, 3) with low values on the left ->
    legend (K, 3) uint8: the median colour of every column (ignores tick marks and noise).
    For a vertical bar with low values at the bottom, pass strip.transpose(1, 0, 2)[::-1]."""
    return np.median(strip, axis=0).round().astype(np.uint8)


def invert_colormap(rgb, legend, tol=None, hue_only=False, min_chroma=0.03, min_light=0.15, chunk=16384):
    """rgb: frame (H, W, 3) uint8. legend: (K, 3) uint8 colours of the colour bar, lowest value first.
    Returns value (H, W): 0..1 position along the legend of the closest colour, or NaN where no
    legend colour is within `tol` (land, coastlines, labels, background).
      hue_only=False  compare full colours; tol is an OKLab distance (default 0.04). Right for flat
                      maps drawn with exactly the legend colours, and for one-hue (light-to-dark) bars.
      hue_only=True   compare hue only (direction in the a-b plane) and ignore lightness; tol is the
                      distance between unit hue vectors (default 0.15, about 9 degrees). Right when the
                      picture dims or shades its colours (3-D lighting, fading trails, transparency)
                      and the bar is a rainbow. Pixels with chroma (colourfulness) below min_chroma
                      or OKLab lightness below min_light are no data: grey and near-black pixels
                      have no reliable hue."""
    tol = tol if tol is not None else (0.15 if hue_only else 0.04)
    leg = srgb_to_oklab(legend)                                    # (K, 3)
    pix = srgb_to_oklab(rgb).reshape(-1, 3)                        # (N, 3)
    grey = np.zeros(len(pix), dtype=bool)
    if hue_only:
        chroma = np.hypot(pix[:, 1], pix[:, 2])
        grey = (chroma < min_chroma) | (pix[:, 0] < min_light)
        pix = np.column_stack([np.zeros(len(pix)), pix[:, 1:] / np.maximum(chroma, 1e-9)[:, None]])
        leg = np.column_stack([np.zeros(len(leg)), leg[:, 1:] / np.hypot(leg[:, 1], leg[:, 2])[:, None]])
    leg_sq = (leg ** 2).sum(axis=1)
    value = np.empty(len(pix))
    for s in range(0, len(pix), chunk):                            # chunks keep the N x K table small
        p = pix[s:s + chunk]
        d2 = (p ** 2).sum(axis=1)[:, None] - 2.0 * (p @ leg.T) + leg_sq[None, :]   # squared distances
        best = d2.argmin(axis=1)
        value[s:s + chunk] = np.where(d2[np.arange(len(p)), best] <= tol ** 2, best / (len(leg) - 1.0), np.nan)
    value[grey] = np.nan
    return value.reshape(rgb.shape[:2])


def zonal_means(value, bands=6):
    """Mean of value (H, W; NaN = no data) in `bands` latitude bands of equal height, north to south,
    plus the global mean. Assumes an equirectangular map: row 0 = 90 N, last row = 90 S. Each row is
    weighted by cos(latitude) because rows near the poles cover less of the Earth's surface."""
    H = value.shape[0]
    lat = np.radians(90.0 - (np.arange(H) + 0.5) * 180.0 / H)
    w = np.cos(lat)[:, None] * np.isfinite(value)                  # weight 0 where there is no data
    v = np.nan_to_num(value)
    mean = lambda rows: float((v[rows] * w[rows]).sum() / w[rows].sum()) if w[rows].sum() > 0 else float('nan')
    edges = np.linspace(0, H, bands + 1).astype(int)
    return [mean(slice(a, b)) for a, b in zip(edges[:-1], edges[1:])], mean(slice(0, H))


def chord_audio(notes, step=0.35, hold=2.5):
    """MIDI notes -> stereo audio: the notes one after another (north band first), then all together."""
    buf = np.zeros((int((len(notes) * step + hold + 1.0) * SR), 2))
    for i, m in enumerate(notes):
        f = mk.midi_to_hz(m)
        synth.mix_in(buf, synth.pan(synth.voice(f, step * 0.95, harmonics=6), 0.5), i * step)
        synth.mix_in(buf, synth.pan(synth.voice(f, hold, harmonics=4, attack=0.05, release=0.6), 0.5),
                     len(notes) * step, gain=0.6)
    return synth.reverb(buf, rt60=1.2, wet=0.2)


def demo_legend(k=256):
    """Synthetic colour bar for the test: dark blue -> green -> yellow, lightness rising steadily."""
    u = np.linspace(0.0, 1.0, k)
    hue = np.radians(265.0 - 160.0 * u)
    lab = np.stack([0.25 + 0.65 * u, 0.12 * np.cos(hue), 0.12 * np.sin(hue)], axis=1)
    return np.round(np.clip(oklab_to_srgb(lab), 0.0, 1.0) * 255).astype(np.uint8)


if __name__ == '__main__':
    rng = np.random.default_rng(7)

    # colour conversion sanity: white, black, grey, and a round trip
    assert np.allclose(srgb_to_oklab(np.array([255, 255, 255], dtype=np.uint8)), [1, 0, 0], atol=1e-3)
    assert np.allclose(srgb_to_oklab(np.array([0, 0, 0], dtype=np.uint8)), [0, 0, 0], atol=1e-9)
    assert np.allclose(srgb_to_oklab(np.array([128, 128, 128], dtype=np.uint8))[1:], [0, 0], atol=1e-3)
    some = rng.uniform(0, 1, (1000, 3))
    assert np.allclose(oklab_to_srgb(srgb_to_oklab(some)), some, atol=1e-5)   # 1e-5 = 0.003 of one 8-bit step

    # the legend: 256 entries, lightness never falling; rebuild it from a noisy picture of the colour bar
    legend = demo_legend()
    distinct = len(np.unique(legend, axis=0))
    assert distinct >= 240 and np.all(np.diff(srgb_to_oklab(legend)[:, 0]) >= 0)
    print(f'legend: {distinct} distinct colours in 256 entries (8-bit rounding merges a few neighbours)')
    strip = np.repeat(legend[None, :, :], 12, axis=0).astype(int) + rng.integers(-2, 3, (12, 256, 3))
    strip[:, ::32] = 0                                             # black tick marks drawn over the bar ...
    strip[3:, ::32] = np.repeat(legend[None, ::32, :], 9, axis=0)  # ... covering its top 3 rows only
    legend_seen = legend_from_strip(np.clip(strip, 0, 255).astype(np.uint8))
    print('legend rebuilt from the strip: max channel error', int(np.abs(legend_seen.astype(int) - legend).max()), 'of 255')
    steps = np.linalg.norm(np.diff(srgb_to_oklab(legend), axis=0), axis=1)
    print(f'legend: OKLab distance between neighbouring colours {steps.min():.4f} to {steps.max():.4f}')

    # planted truth: a 90 x 180 "map" with a known value everywhere
    H, W = 90, 180
    lat = 90.0 - (np.arange(H) + 0.5) * 180.0 / H
    lon = (np.arange(W) + 0.5) * 360.0 / W
    truth = 0.15 + 0.7 * np.cos(np.radians(lat))[:, None] ** 2 + 0.05 * np.sin(np.radians(3 * lon))[None, :]
    truth = np.clip(truth, 0.0, 1.0)
    frame = legend[np.round(truth * 255).astype(int)].astype(int)
    nodata = np.zeros((H, W), dtype=bool)
    frame[20:50, 30:60] = 128; nodata[20:50, 30:60] = True         # grey "continent"
    frame[55:80, 100:125] = 128; nodata[55:80, 100:125] = True     # another one
    frame[2:8, 120:175] = 255; nodata[2:8, 120:175] = True         # white label box
    frame[86:, :] = 0; nodata[86:, :] = True                       # black bar along the bottom
    frame = np.clip(frame + rng.integers(-2, 3, frame.shape), 0, 255).astype(np.uint8)   # compression-like noise

    value = invert_colormap(frame, legend_seen, tol=0.04)
    masked = np.isnan(value)
    err = np.abs(value - truth)[~nodata & ~masked]
    print(f'non-data pixels masked: {masked[nodata].mean():.1%}   data pixels kept: {(~masked[~nodata]).mean():.1%}')
    print(f'value error on data pixels (0..1 scale): mean {err.mean():.4f}, max {err.max():.4f}')
    assert masked[nodata].mean() == 1.0 and (~masked[~nodata]).mean() > 0.999
    assert err.max() <= 0.03 and err.mean() <= 0.01               # stated tolerance: 3 % worst case, 1 % on average

    # the same map drawn with dimmed colours (every pixel 35..100 % as bright), as shaded pictures do
    shade = rng.uniform(0.35, 1.0, (H, W, 1))
    dim = np.clip(np.round(frame * shade) + rng.integers(-2, 3, frame.shape), 0, 255).astype(np.uint8)
    for hue_only in (False, True):
        v = invert_colormap(dim, legend_seen, hue_only=hue_only)
        kept = np.isfinite(v) & ~nodata
        e = np.abs(v - truth)[kept]
        print(f'dimmed colours, hue_only={hue_only}: data pixels kept {kept.sum() / (~nodata).sum():.1%}, '
              f'non-data masked {np.isnan(v)[nodata].mean():.1%}, value error mean {e.mean():.4f}, '
              f'95th percentile {np.percentile(e, 95):.4f}')
        if hue_only:
            assert kept.sum() / (~nodata).sum() > 0.9 and np.isnan(v)[nodata].mean() == 1.0
            assert e.mean() <= 0.02 and np.percentile(e, 95) <= 0.06
        else:
            assert kept.sum() / (~nodata).sum() < 0.5              # plain matching loses most of the map

    # zonal (latitude-band) means -> one scale note per band -> a chord
    bands, global_mean = zonal_means(value, bands=6)
    true_bands, true_global = zonal_means(np.where(nodata, np.nan, truth), bands=6)
    print('zonal means north -> south:', [round(b, 3) for b in bands], ' global:', round(global_mean, 3))
    print('largest zonal-mean error:', round(max(abs(a - b) for a, b in zip(bands, true_bands)), 4))
    assert max(abs(a - b) for a, b in zip(bands, true_bands)) < 0.005 and abs(global_mean - true_global) < 0.005
    notes = [mk.quantize(b, root=48, scale='pentatonic_major', octaves=2) for b in bands]
    assert notes == [mk.quantize(b, root=48, scale='pentatonic_major', octaves=2) for b in true_bands]
    print('chord:', notes, [mk.note_name(m) for m in notes])
    assert notes[2] > notes[0] and notes[3] > notes[5]             # warm tropics sound higher than the poles
    wavio.write_wav('p5_zonal_chord.wav', chord_audio(notes))
    wavio.check_wav('p5_zonal_chord.wav', channels=2, dur=len(notes) * 0.35 + 2.5 + 1.0)
    print('P5 all checks passed')
