# Frames to features: computer-vision algorithms that turn EIC frames into numbers

> Status: researched 2026-11-14 with live sources by its author. The independent fact-check pass did NOT complete (see README.md). Treat licence, citation and version claims as unconfirmed until you open the cited source.

## TL;DR

Tags: [M] measured today, [D] read in documentation today, [E] from the team's local EIC crawl (full legend in section 0).

- **Shrink first.** Compute every feature on a grid of about 96x54 cells (5,184 pixels) made by averaging blocks of the frame in linear light. That is 400 times fewer pixels than 1920x1080; the per-pixel work measured (luminance, differences, profiles, OKLab conversion, colourmap inversion) then costs 5 ms or less per frame in JavaScript [M].
- **Colourmap inversion keeps a frame-based project scientifically valid.** Sample the visualization's published colour bar, then map each pixel colour back to a data value (degrees C, ppbv). On a real frame of SVS 3912 it returned a sensible sea-surface-temperature profile: about 28 C in the tropics, 1 to 2 C near Antarctica [M].
- **SVS publishes the colour bar as its own image file** for 6 of the 9 named visuals and for 2 more on a sibling page; some pages also publish per-frame dates. URLs in sections 3.2 and 8.
- **Moving cameras wreck pixel features.** Four named visuals exist on their own page only as globe or 3-D fly-throughs (5425, 5196, 4960, 4950). Flat-map versions, where a pixel is a fixed latitude and longitude, exist for 3912, 5669 and 5011 on their own pages and for 5313, 5533 and 5425 on sibling pages. Use those.
- **Layers separate by hue.** On the GEOS Aerosols still, nearest-hue matching against the four legend swatches put dust at 21 N on the Sahara's longitudes and black carbon on the equator at 12 to 14 E [M]. Area percentages swing with thresholds (sulfate: 36% down to 3% of cells), so sonify position and relative strength, not percent coverage.
- **The browser cannot read SVS pixels.** SVS sends a fixed CORS header, so reading SVS media from a canvas throws. Precompute features in Python into a small JSON timeline; the browser plays the video and reads the JSON.
- **The conceptual reference is a radar sweep, not a left-to-right scan.** Caldwell 73 (SVS 13786) sweeps around the centre, maps radius to pitch and colour class to instrument [D]. The left-to-right scan is Chandra's Galactic Center piece and The vOICe.

## Decisions for the Jukebox build

Ranked: what I would do in the team's place, the reason, the cost. If only three visuals get built: 3912 (values), 5669 (layers), 5011 flat version (events).

1. **Precompute features offline in Python; the browser only plays video and reads a JSON timeline.** Reason: SVS answers with `access-control-allow-origin: https://tempo.multiverse.music` whatever origin asks (API, PNG and TIFF checked today [M]; video per the team's earlier check), so a page on your origin can show SVS media but reading its pixels throws `SecurityError` [D]. Offline you can also use lossless PNG/TIFF frames and test the numbers. Trade-off: only prepared visuals work.
2. **Analyse the flat-map (equirectangular) version of each visual, not the globe fly-through.** Reason: on a flat map one pixel is one place, so a change between frames is a change in the data, not in the camera. Trade-off: for 5313, 5533 and 5425 the flat version is on a sibling SVS page (section 10); say so and show the listed visual beside it. None found for 5196, 4960, 4950: view-independent features only, or leave them out.
3. **One small grid per frame (96x48 for 2:1 maps, 96x54 for 16:9), block-averaged in linear light; compute everything on it.** Reason: speed (section 1.5); averaging also removes compression noise, coastlines and thin labels. Trade-off: nothing smaller than one cell (3.75 degrees) survives, so count small things such as lightning dots before shrinking.
4. **Colourbar inversion where there is an opaque colour ramp on a flat map: 3912 (sea-surface temperature), the four pollutant layers of 5518, 5479 temperature.** Reason: the sound is driven by degrees C or ppbv, which you can show in the UI, test with listeners and defend under Validity. Trade-off: about two hours for bars, tick tables and masks. Skip it for 5196, 4960, 4950 (colour mixed with opacity or 3-D shading).
5. **GEOS Aerosols (5669): split the still into four hue classes, one instrument each.** Reason: the challenge text suggests one instrument per aerosol layer, and the split works [M]. Trade-off: the page has one still and no animation [E][M], so time must come from a spatial sweep or the user's cursor; sea salt needs its own rule (section 7).
6. **Lightning (5011): use the flat 4096x2048 movie on the same page; trigger percussion on newly appearing yellow cells.** Reason: no rotating globe, star field or date stamp. Trade-off: 334 MB download plus a transcode; dots stay on screen for a 10-day window, so trigger on appearance.
7. **Dates from published lists and ranges, not OCR** (section 8).
8. **Scan strategy: video time is musical time (one feature vector per frame). One west-to-east sweep only for stills; cursor/keyboard probing of the precomputed grid for blind and low-vision exploration.** Trade-off: no Hilbert or spiral scans; a listener cannot follow them.
9. **Skip this weekend:** optical flow on globe views, OCR, the EXR frame sets (0.4 to 0.7 TB for a main layer [E]), opencv.js in the page (11 to 16 MB script [M]), WebCodecs, WebGL shaders, k-means at full resolution, machine-learning models.

## 0. Scope and evidence tags

This file is the first half of the pipeline: frame (an image) -> features (a few numbers per frame). What the numbers do to sound is in 03-sonification-mapping-and-synthesis.md and 04-making-it-musical.md; complete programs are in 08-recipes-python.md and 09-recipes-browser.md.

- **[M]** measured today (2026-11-14) by running code on this laptop, on synthetic data or on files fetched live from svs.gsfc.nasa.gov.
- **[D]** read today on the documentation page listed under Sources.
- **[E]** from the team's local crawl of the EIC gallery (`spaceapps-eic-evidence`: 94 SVS pages, 1,729 media items, 187 frame sets).
- **(unverified)** not confirmed; treat as a lead.

## 1. Pixel basics

### 1.1 What a frame is

A frame is a grid of pixels; each pixel is three bytes R, G, B (red, green, blue), 0 to 255. In a browser there is a fourth byte A (opacity): `ImageData.data` is a flat `Uint8ClampedArray` holding R, G, B, A for each pixel in turn [D], so pixel (x, y) starts at index `4 * (y * width + x)`. Size: 1920x1080 = 2,073,600 pixels = 8.3 MB as RGBA; a 96x54 grid = 5,184 pixels = 20.7 kB.

### 1.2 Gamma: bytes are not amounts of light

Image bytes are sRGB values. sRGB is gamma-encoded: the byte is a curved function of the emitted light, chosen so equal byte steps look like equal brightness steps. Averaging and physics need linear light. Per channel, with c = byte / 255:

```
linear = c / 12.92                      if c <= 0.04045
linear = ((c + 0.055) / 1.055) ** 2.4   otherwise
```

[D: W3C page; it prints the threshold as 0.03928 and notes 0.04045 is correct, identical at 8 bits.] Example: byte 128 -> linear 0.216, so "half grey" emits about 22% of white's light. A block that is half white and half black emits 50% light, which is byte 188, not the byte average 127.5. Averaging bytes makes thin bright features (current streaks, city lights, lightning dots) too dark. Order of operations: bytes -> linear -> average -> everything else.

### 1.3 Luminance: brightness as one number

Relative luminance Y (0 black, 1 white) from linear channels [D: W3C]:

```
Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
```

Green dominates because the eye is most sensitive to it. Library grayscale shortcuts weight the gamma bytes directly: Pillow `convert("L")` uses 0.299, 0.587, 0.114 [D]; scikit-image `rgb2gray` uses 0.2125, 0.7154, 0.0721 [D]. Fine for display; measure with the linear version.

### 1.4 Colour spaces

| Space | Axes | Strength | Weakness | Use for |
|---|---|---|---|---|
| RGB (sRGB bytes) | red, green, blue | what the file contains | distances do not match what the eye sees | storage |
| HSV / HSL | hue angle (0 red, 120 green, 240 blue), saturation, value or lightness | one call (`colorsys` in Python's standard library) | hue is noise for near-grey pixels; equal hue steps are not equal visual steps | quick demos |
| CIELAB | L* lightness 0..100, a* green-red, b* blue-yellow | distance approximates perceived difference; `skimage.color.rgb2lab`, `deltaE_ciede2000` [D] | needs scikit-image or OpenCV | if scikit-image is already a dependency |
| OKLab | L 0..1, a, b (about -0.4..0.4) | same idea, better hue behaviour, 12 lines, identical in Python and JS, public domain or MIT [D] | not in scikit-image 0.26 [D] | **default for colour matching here** |

From (a, b): chroma `C = hypot(a, b)` (colourfulness; 0 = grey) and hue `h = atan2(b, a)` in degrees. A just noticeable difference (JND, the smallest colour change a person sees) is about 0.02 in OKLab distance and about 2 in CIEDE2000 [D: CSS Color 4].

numpy, with array shapes in comments (matrices from Ottosson's page [D]; snippet self-tested on synthetic data [M]):

```python
import numpy as np
c = np.arange(256) / 255
LIN = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)  # byte -> linear
M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
               [0.2119034982, 0.6806995451, 0.1073969566],
               [0.0883024619, 0.2817188376, 0.6299787005]], np.float32)
M2 = np.array([[0.2104542553,  0.7936177850, -0.0040720468],
               [1.9779984951, -2.4285922050,  0.4505937099],
               [0.0259040371,  0.7827717662, -0.8086757660]], np.float32)

def to_grid(rgb8, gw=96, gh=54):        # rgb8 (H, W, 3) uint8 -> (gh, gw, 3) linear float
    H, W, _ = rgb8.shape
    bh, bw = H // gh, W // gw           # block size, e.g. 20 x 20 for 1920x1080
    return LIN[rgb8[:gh * bh, :gw * bw]].reshape(gh, bh, gw, bw, 3).mean((1, 3))

def oklab(lin):                         # (..., 3) linear -> (..., 3) = L, a, b
    return np.cbrt(lin @ M1.T) @ M2.T

grid = to_grid(frame)                                        # frame (1080, 1920, 3) uint8 -> (54, 96, 3)
Y = grid @ np.array([0.2126, 0.7152, 0.0722], np.float32)    # (54, 96) luminance
lab = oklab(grid)                                            # (54, 96, 3)
```

### 1.5 Why downsample first: measured cost

Best-of-N time for one frame of random test data on this laptop [M]: numpy 2.5.3, and JavaScript in Node 24 (V8, Chrome's engine) looping over an RGBA buffer shaped like `ImageData.data`.

| Operation | numpy 1920x1080 | numpy 96x54 | JS 1920x1080 | JS 96x54 |
|---|---|---|---|---|
| Mean luminance (numpy figure includes std) | 34 ms | 0.13 ms | 5.9 ms | 0.02 ms |
| sRGB -> OKLab, all pixels | 182 ms | 0.37 ms | 100 ms | 0.23 ms |
| Colourmap inversion, nearest of 256 ramp colours, brute force | 20.6 s | 46 ms | 2.4 s | 5.0 ms |
| Histogram, 3 channels x 256 bins | 27 ms | 0.07 ms | n.m. | n.m. |
| Frame difference, mean of abs(a - b) | 29 ms | 0.10 ms | 9.7 ms | 0.03 ms |
| Row / column profile | 2.2 ms | 0.03 ms | 5.7 ms | 0.02 ms |
| Gradient magnitude (edge strength) | 17 ms | 0.05 ms | n.m. | n.m. |
| 2-D FFT power spectrum | 53 ms | 0.11 ms | n.m. | n.m. |
| k-means, k = 5, 10 iterations, naive | 6.4 s | 15 ms | n.m. | n.m. |
| Block-mean downsample to 96x54 | 60 ms | - | n.m. | - |

n.m. = not measured. A 30 fps video leaves 33 ms per frame: at full resolution OKLab alone misses that; on the grid the whole JavaScript column adds up to about 5 ms. numpy's brute-force inversion (46 ms on the grid) only runs offline, where it does not matter. Excluded: decoding the frame and, in a browser, the `drawImage` + `getImageData` read-back.

## 2. Global statistics

One number or a short vector per frame, computed on the grid. "Suits" names EIC visuals by SVS id; "drives" is the musical parameter the feature most naturally controls (mappings proper: file 03).

| Feature | Measures | How | Suits | Drives |
|---|---|---|---|---|
| Mean luminance | overall brightness | `Y.mean()` | 5313, 5011 | loudness |
| Std of luminance | contrast: flat field versus bright features on dark | `Y.std()` | 3912, 5425 | filter brightness, tension |
| Histogram | how many cells fall in each brightness or hue bin | `np.histogram(Y, bins=16, range=(0, 1))` | any | which scale degrees sound; chord density |
| Dominant colours, k-means | the k colours that best summarise the frame: pick k centres, assign each cell to the nearest, move each centre to the mean of its cells, repeat about 10 times | on OKLab cells; OpenCV documents k-means [D], or 10 lines of numpy | 5669, 5533 | instrument choice, chord quality |
| Dominant colours, median cut | same goal: repeatedly split the box of colours at the median of its longest axis | Pillow `img.quantize(colors=k)`; median cut is its default for RGB [D] | same | same |
| Colourfulness (Hasler and Suesstrunk 2003) | how vivid the frame is | `rg = R - G; yb = 0.5*(R + G) - B; M = sqrt(var(rg) + var(yb)) + 0.3 * sqrt(mean(rg)**2 + mean(yb)**2)` [D: OpenIMAJ's implementation] | 5669 versus 5313 | number of voices, reverb amount |
| Shannon entropy | how spread out the histogram is, in bits: `-sum(p * log2(p))` over non-empty bins | `skimage.measure.shannon_entropy`, Pillow `Image.entropy()` [D] | 5425, 3912 | note density, rhythmic complexity |

Entropy example: half black, half white -> p = (0.5, 0.5) -> 1 bit; 256 equally used grey levels -> 8 bits. Global statistics treat colour as paint: they cannot tell warm water from an orange legend. Hence section 3.

## 3. Colourmap inversion: from pixel colour back to the data value

### 3.1 The idea

SVS visuals are pseudocolour: a data value v was pushed through a colour table to get a colour, and the colour bar shown with the visual is that table. Sample the bar and run it backwards: pixel colour -> position t on the bar (0 = low end, 1 = high end) -> value v. The sound is then driven by "28 C", not "orange-ish", and its claims can be checked.

### 3.2 Where to get the colour bar

The SVS page API lists every media item: `https://svs.gsfc.nasa.gov/api/<id>/` -> `media_groups[i].items[j].instance.url` (plus `filename`, `width`, `height`); no key [D][M]. Colour bars sit in their own media group whose caption says so [M]. Filter filenames with `cbar|colou?r_?bar|legend` (case-insensitive): 25 of the 94 crawled pages have a match [E]. Fetch from Python or curl, never from browser JavaScript (CORS).

Files below answered HTTP 200 today unless noted. Prefix every path with `https://svs.gsfc.nasa.gov/vis/a000000/`.

| Visual | Colour bar file | Kind and range |
|---|---|---|
| 3912 sea-surface currents | `a003900/a003912/sst_ecco2_cbar.png` (310x95) | rainbow blue -> green -> yellow -> red; ticks 0, 10, 20, 32 C, linear [M]. The page says blue is 0 C, green 10 to 20 C, yellow about 25 C, red 32 C [E] |
| 5669 GEOS aerosols | `a005600/a005669/Aerosols_cbar.png` (1500x300) | four swatches: Black Carbon #d25e45, Dust #c19adc, Sea Salt #85aaa9, Sulfate #53dc34 [M] |
| 5425 Perpetual Ocean 2 | `a005400/a005425/perpetual_ocean2_CLOSE_101_cbar_temperature.png`, `..._CLOSE_100_salinity_cbar.png`, `..._CLOSE_101_cbar_beauty.png` (1920x1080) | temperature 0 to 25 C, dark blue -> purple -> orange -> yellow; salinity 33 to 36, cyan -> grey -> orange -> red; "beauty" -3 to 22 C for flows at 600 m and deeper, blue -> cyan -> white [E][M] |
| 5196 DYAMOND CO2 | `a005100/a005196/dyamondCbar_6-27-2024a.png` (1920x1080) | 380 to 460 ppm; colour and opacity together, low values transparent [E][M] |
| 4960 atmospheric river | `a004900/a004960/atmo_rivers_cbars01.png` (1683x1859) | five stacked legends: snow, liquid precipitation 0 to 0.001 kg/m^2/s, snow depth 0.25 to 1.5 m, soil moisture 0 to 1, ocean [M] |
| 4950 GEDI forest height | `a004900/a004950/GEDI_colorbar_0to50_01.tif` (3840x2160, 63 MB; also `0to75`, `0to40`) [E], not fetched today | brown -> green -> white, 0 to 50 m; `*_w_colorbar` movies carry the bar at bottom left |
| 5533 air quality | none on the page. Same ramps on SVS 5518: `a005500/a005518/PM2.5_colorbar.png`, `CarbonMonoxide_colorbar.png`, `NitrogenOxides_colorbar.png`, `Ozone_colorbar.png` (600x200); and on 5151 to 5154 (`a005100/a005151/PM2.5_colorbar_plain.png` etc.) | PM2.5 0.4 to 409.6 ug/m^3, each tick 4x the last (logarithmic); CO 40 to 500 ppbv, ticks unevenly spaced (100, 130, 200); NOx ticks 10^-3 to 10^1 ppbv (logarithmic); O3 5 to 60 ppbv (linear) [M, ticks read by eye] |
| 5313 night-lights change | none on the page; drawn in the frame centre (orange = less light, white = no change, purple = more). SVS 5276 has `a005200/a005276/nightlights_change_colorbar.png` (685 kB) [M] | diverging, no numbers |
| 5011 lightning | none needed: a yellow dot is an event | binary |

The 5518 bars and the 5151 to 5154 bars have identical end and mid colours (PM2.5: #fffef3 -> #cc4c02 -> #682606) [M]. That the striped 5533 frames use the same tables is likely but (unverified).

### 3.3 Algorithm

1. **Find the ramp in the bar image.** In each row find the longest run of opaque pixels whose colour changes smoothly (neighbour-to-neighbour OKLab distance under about 0.07). Rows that agree form the ramp band. Sample a row in the band's upper third (tick marks sit on its lower edge) and drop 2 pixels at each end (outline). The widest run was the true ramp in all 15 ramp-type bars tried today [M]. Typing in the row and x-range by hand is just as good for four visuals.
2. **Build a lookup table (LUT):** N samples along the ramp as OKLab; sample i has t = i / (N - 1).
3. **Calibrate t -> value from the tick labels**, typed in as (t, value) pairs: `v = np.interp(t, tick_t, tick_v)`. For a logarithmic bar interpolate log10(v), then raise 10 to it. One rule covers linear (3912, O3), logarithmic (PM2.5: v = 0.4 * 1024**t) and irregular (CO) bars.
4. **Invert.** For each unmasked grid cell find the nearest LUT entry; keep the distance as a quality score.
5. **Reject bad matches** (distance above about 0.05, or 2.5 JND): that colour is not on the bar.

```python
def invert(lab, ramp_lab, tick_t, tick_v, max_err=0.05):
    # lab (gh, gw, 3); ramp_lab (N, 3) sampled low -> high along the bar
    d = np.linalg.norm(lab[:, :, None, :] - ramp_lab[None, None], axis=-1)   # (gh, gw, N)
    t = d.argmin(-1) / (len(ramp_lab) - 1)                                   # (gh, gw) position on the bar
    return np.where(d.min(-1) <= max_err, np.interp(t, tick_t, tick_v), np.nan)
```

Self-test on a synthetic frame painted with the measured SST ramp: round-trip error 0.06 C; a grey frame is rejected as NaN [M].

### 3.4 Worked example on a real frame [M]

Input: SVS 3912 frame `flat_global_ecco2_2028x1024.25908.tif` (2048x1024, uncompressed RGB, 6.3 MB), dated 2007-07-28T13:03Z by the page's date list. Steps: block-mean to 128x64 in linear light; cells with chroma under 0.03 are land (flat grey) or empty; the rest matched **by hue only** against the 273-sample ramp of `sst_ecco2_cbar.png`, 0 to 32 C linear; zonal mean weighted by chroma.

| Latitude band | Inverted SST | Latitude band | Inverted SST |
|---|---|---|---|
| 60..70 N | 9.1 C | 10..0 S | 27.1 C |
| 40..50 N | 15.2 C | 30..20 S | 20.6 C |
| 30..40 N | 23.5 C | 50..40 S | 8.4 C |
| 10..20 N | 28.5 C | 60..50 S | 3.1 C |
| 0..10 N | 28.3 C | 70..60 S | 1.7 C |

Spot cells: western Pacific 5 N 150 E -> 29.6 C; Southern Ocean 58 S 150 W -> 1.9 C. Warm tropics, cold poles, northern summer warmer than southern winter: plausible, though not compared with a reference SST product.

Why hue only: in 3912 and 5425 colour encodes temperature but brightness encodes how much current streak is in the cell; full-colour matching would read dim streaks as another temperature. It works because this ramp's hue falls steadily from 266 degrees (blue) to 27 degrees (red) [M].

### 3.5 Which bars invert well [M]

Two checks per sampled ramp: is lightness monotonic (only rising or only falling), and how close do two positions at least 10% of the bar apart come? Close means ambiguous.

| Bar | Lightness monotonic | Closest pair 10% apart (OKLab distance) | Meaning |
|---|---|---|---|
| 3912 SST rainbow | no (rises to yellow, then falls) | 0.023 at t = 0.41 vs 0.51 | in the green band, colours 3.2 C apart (13.1 vs 16.3 C) differ by about one JND: resolution there is a few degrees |
| 5425 temperature | yes | 0.044 to 0.069 | well behaved |
| 5425 salinity | no | 0.004 to 0.006 at t = 0 vs 0.10 | the lowest tenth of the bar is one colour |
| PM2.5 | yes | 0.036 | fine; top end compressed |
| CO | yes | 0.035 | fine |
| NOx | yes | 0.053 | one hue: lightness alone works |
| O3 | yes | 0.0013 at t = 0 vs 0.10 | the lowest quarter is nearly white: report only "low" there |
| NDVI (5544) | nearly | 0.016 at t = 0.89 vs 0.99 | top end compressed; labels are only Low and High |
| 5196 CO2, opaque part | no | 0.010 | plus opacity: do not invert per pixel |

A rainbow map is not monotonic in lightness (matplotlib's colormap guide advises against jet for that reason [D]) but it is still invertible, because full-colour or hue matching does not rely on lightness. What breaks inversion is a ramp that repeats or nearly repeats a colour.

### 3.6 Failure cases

| Problem | Example | Fix |
|---|---|---|
| Brightness carries a second variable | 3912, 5425 streak density | match on hue; weight by chroma |
| Colour blended with a background (alpha) | 5196, 4960, 5669 | no per-pixel values. Use area above a chroma gate, centroid, change over time; call it "relative intensity" in the UI |
| Ticks not evenly spaced | PM2.5, NOx (log); CO (irregular) | interpolate between typed-in ticks (step 3) |
| Flat stretch in the ramp | O3 and salinity low ends | report a range ("below 20 ppbv"), not a number |
| Land, coastlines, borders, labels | 3912 grey land; 5533 outlines and pill labels | mask grey (chroma < 0.03); thin lines vanish in the block average; mask label boxes by hand (section 8) |
| Lossy video | 512 of 556 probed SVS movies are yuv420p, i.e. colour stored at half resolution in both directions [E] | calibrate on PNG/TIFF frames; on video trust the block average and loosen `max_err` |
| Transparent pixels in the bar PNG | bar edges and background have alpha < 255 [M] | ignore pixels with alpha under 250 |
| 3-D shading, height exaggeration | 4950 | treat results as classes (short, medium, tall), not metres |

For the write-up: Poco, Mayhua and Heer (IEEE TVCG 2018) automate the legend step, and the Python package `unmap` does colour -> data, but its last PyPI release is 0.1.2 from October 2022 [M]. The 20 lines above carry less risk than a stale dependency.

## 4. Spatial structure

### 4.1 Pixel <-> latitude/longitude

Most flat EIC frames are equirectangular: longitude maps linearly to x, latitude linearly to y. NOAA's Science On a Sphere (SOS) guidelines, for which the SVS files labelled SOS are made, name it Equatorial Cylindrical Equidistant: twice as wide as tall, 0 degrees longitude through the middle, +/-180 at the edges, 90 S to 90 N [D]. For a W x H image:

```
lon = (x + 0.5) / W * 360 - 180        x = (lon + 180) / 360 * W
lat = 90 - (y + 0.5) / H * 180         y = (90 - lat) / 180 * H
```

Check on real data [M]: in the 1920x1080 GEOS Aerosols still (16:9, so stretched, but still linear) the bright hurricane spiral has its centroid at pixel (568.9, 376.7) -> 27.1 N, 73.2 W. The US National Hurricane Center placed Hurricane Erin at 26.6 N, 72.7 W at 21:00 UTC on 19 Aug 2025 [D]; the still is for 20:00 UTC. Agreement within 0.5 degrees, about 3 pixels.

**Area weighting.** Equirectangular maps enlarge the poles: a cell at latitude lat covers `cos(lat)` times the ground of an equatorial cell (0.5 at 60 degrees). Weight every sum by `cos(radians(lat))` or polar rows dominate.

Projections in the EIC material [E, plus viewing sample frames]:

| Projection | Where | Pixel -> place |
|---|---|---|
| Equirectangular 2:1 | 3912 (2048x1024, 6840x3420); 5011 flat movie (4096x2048); siblings 5475, 5518, 5479, 5505 | formulas above |
| Equirectangular stretched to 16:9 | 5669 still | same formulas |
| Two world maps side by side, 32:9 | 5313 EIC version (7680x2160), by inspection | `x mod (W/2)`, then the formulas with W/2 |
| Flat map cut into stripes of different variables | 5533 "MapWithLabels" | geography as above; the variable depends on the stripe |
| Globe from outside, camera moving | 5533 sphere, 5011 sphere, 5425, 5196, 4950 | changes every frame (section 6.2) |
| 3-D perspective fly-through | 4960 | not recoverable from pixels |
| Robinson, Spilhaus | 5544, 5101 (Robinson) and 5111 (Spilhaus), per file names and titles | avoid; 5544 also has equirectangular sets |

For a centred globe without perspective (orthographic) with view centre (lat0, lon0) and radius R pixels: X = x - cx, Y = cy - y, rho = hypot(X, Y), c = asin(rho / R); then `lat = asin(cos(c)*sin(lat0) + Y*sin(c)*cos(lat0)/rho)` and `lon = lon0 + atan2(X*sin(c), rho*cos(c)*cos(lat0) - Y*sin(c)*sin(lat0))` [D: Wikipedia]. It needs lat0 and lon0 for every frame; not worth it this weekend.

### 4.2 Features on the grid

`v` = grid of inverted values or luminance; `w` = area weight times mask (0 where masked). Cost is numpy at 1080p / on the grid.

| Feature | Measures | How | Cost | Suits | Drives |
|---|---|---|---|---|---|
| Zonal means (latitude bands) | value against latitude: tropics versus poles | `(v*w).sum(1) / w.sum(1)`, pooled into 6 to 12 bands | 2.2 / 0.03 ms [M] | 3912, 5479, 5518 | a chord or row of drones: one voice per band, value -> pitch or level |
| Meridional profile | value against longitude | same along axis 0 | same | stills (5669) | the melody of a west-to-east sweep |
| Region means | value inside named lat/lon boxes (ocean basins, continents) | one boolean mask per region | < 0.1 ms on the grid | flat maps | one instrument per region; question-style listening tests |
| Land / ocean mask | which cells may carry data | from the frame (3912 land is flat grey [M]); from SVS's own layer (5425 LAND_MASK movie, 46 MB at 1080p30 [E]); or rasterise Natural Earth (public domain [D]) | once | all | gating only |
| Centre of mass | where the signal sits | latitude `sum(w*v*lat)/sum(w*v)`; longitude wraps, so average on the circle: `atan2(sum(w*v*sin(lon)), sum(w*v*cos(lon)))` | < 0.1 ms | 5669 plumes, 5011 | stereo pan (longitude), register (latitude) |
| Spread, coverage | how wide the feature is | weighted std of distance from the centroid; or fraction of unmasked area above a threshold | < 0.1 ms | 5196, 4960, 5669 | reverb size, chord width |
| Edge strength | sharpness of fronts | gradient magnitude `hypot(dv/dx, dv/dy)`; `cv.Canny(image, t1, t2)` for thin edge maps [D] | 17 / 0.05 ms [M] | 3912, 5425 | noisiness or brightness of timbre |
| Isolines | where the field crosses a level, e.g. the 28 C line | `skimage.measure.find_contours(v, level)`; `cv.findContours` on a thresholded image [D] | n.m. | inverted SST | pitch follows the isoline's mean latitude |
| Connected components (blobs) | separate objects: count, size, position | threshold -> `skimage.measure.label` -> `regionprops` (area, centroid, eccentricity, orientation, solidity, intensity_mean) [D], or `cv.connectedComponentsWithStats` [D] | n.m. | 5011 dots, 5313 cities, 5669 plumes | one note per blob: size -> loudness, latitude -> pitch |
| Texture (spatial frequency) | fine swirls versus smooth fields | `P = abs(np.fft.rfft2(Y))**2`; spectral centroid = sum(f*P)/sum(P) over radial frequency f | 53 / 0.11 ms [M] | 3912, 5425 eddies against 5518 CO | filter cutoff, tremolo rate |
| Shape descriptors | elongated or round, compact or ragged | `regionprops` eccentricity, orientation, solidity; `skimage.measure.moments_hu` [D] | n.m. | 4960 moisture band, 5669 plumes | articulation: long -> legato, compact -> staccato |

n.m. = not measured: OpenCV and scikit-image are not installed on this machine.

## 5. Scan strategies: turning two dimensions into time

A sonification must decide what "now" means. For animations the honest choice is that video time is musical time; spatial scans are for stills and for exploration.

| Strategy | Rule | Keeps | Loses | Suits | Precedent |
|---|---|---|---|---|---|
| Time-as-time | each frame -> one feature vector -> one musical step | how the data evolves | detail inside the frame | every animation | **default** |
| Column scan, left to right | time = x; within the column y -> pitch, brightness -> loudness | west-to-east order | simultaneity | stills on flat maps (5669) | Chandra's Galactic Center piece: starts at the left edge and moves right; higher in the image is higher pitch; light intensity sets volume [D]. The vOICe: 64x64 image, 16 grey levels, vertical position -> frequency, brightness -> amplitude, horizontal -> time [D] |
| Row scan, top to bottom | time = latitude, north to south | zonal structure | east-west detail | fields that vary mainly with latitude | - |
| Radar sweep | time = angle around a centre; radius -> pitch | radial structure | - | a globe centred in the frame; storms | Caldwell 73: a radar line scans around and "the radius of the stars is mapped to pitch" (NASA SVS 13786); the whole image feeds a choir, orange and red stars a marimba, blue stars a glockenspiel [D]. `cv.warpPolar` turns it into a column scan [D] |
| Spiral | radius grows with angle | locality around a centre | geography | hurricanes, eddies | - |
| Hilbert curve | a path through every cell of a 2^n x 2^n grid whose consecutive cells are neighbours | near in time = near in space | any sense of direction | comparing textures | PyPI `hilbertcurve` 2.0.5, MIT [M]. Skip |
| Raster | row by row, like reading | completeness | a jump at each line end | grids up to about 12x6 | - |
| Object by object | detect blobs, sort (longitude, size or time), one note each | events | the background field | 5011, 5313 | - |
| User-driven probe | cursor, finger or arrow keys pick a cell; the sound is the value there | exact place-to-value link, agency | overview | blind and low-vision exploration | reads the precomputed grid; see file 07 |

Left-to-right with brightness -> volume and height -> pitch is the mapping the team's notes call naive. It becomes defensible when the scanned quantity is an inverted data value or a per-class intensity instead of raw brightness.

## 6. Temporal features

### 6.1 Features across frames

| Feature | Measures | How | Cost | Suits | Drives |
|---|---|---|---|---|---|
| Frame difference | how much changed | `np.abs(Y_t - Y_prev).mean()` on grids k frames apart | 29 ms at 1080p, 0.10 ms on the grid [M] | flat maps | energy: tempo, note density |
| Per-region change | where it changed | same per region mask; keep the sign for more versus less | < 0.1 ms | 5313 by continent, 5518 | which instrument is active |
| Onset / flash detection | sudden new events | `new = mask_t & ~mask_prev; n = new.sum()`. Fire when n exceeds median + 3 x MAD of the last 2 s (MAD = median absolute deviation) and at least 80 ms after the last trigger (starting values, untested) | < 0.1 ms | 5011 | percussion hits; n -> loudness; centroid of `new` -> pan and pitch |
| Dense optical flow (Farneback) | a motion vector (dx, dy) per pixel between two frames | `flow = cv.calcOpticalFlowFarneback(prev, next, None, 0.5, 3, 15, 3, 5, 1.2, 0)` on grey images, result (H, W, 2) [D: signature in the 5.x docs, parameter values from the OpenCV tutorial] | n.m.; run at 384x192 or smaller | ocean flow on flat maps (3912, 5479) | mean speed -> tempo; mean direction -> pan or melodic direction |
| Sparse optical flow (Lucas-Kanade) | motion of chosen points | `cv.goodFeaturesToTrack`, then `cv.calcOpticalFlowPyrLK` [D] | n.m. | tracking a few blobs | glide of one voice |
| Global shift (phase correlation) | one (dx, dy) for the whole frame | `cv.phaseCorrelate(a, b)` -> shift, response [D]; `skimage.registration.phase_cross_correlation` -> shift, error, phasediff [D] | about two FFTs (estimate) | camera-move detection | a guard, not a sound |
| Trend | slow drift of a feature | `slope, intercept = np.polyfit(time, feature, 1)` | negligible | 5313 (12 annual steps) | key or register shifting over the piece |
| Seasonality | the repeating yearly cycle | mean of the feature per calendar month; anomaly = feature minus that mean | negligible | 3912 (one model year), 5011 (2017 to 2023), 5425 (2021 to 2023) | cyclic modulation; the anomaly drives dissonance |

scikit-image also offers `optical_flow_tvl1` and `optical_flow_ilk`, each returning an array of shape (2, M, N) [D]. Caveat for 3912 and 5425: the streaks are particles the renderer moves along the currents, so optical flow gives the current's direction, but its speed is pixels per frame, not metres per second.

### 6.2 Camera moves: detecting them and coping

Many SVS animations rotate, zoom or fly. A fixed pixel is then a different place in every frame; frame difference, zonal means and optical flow all measure the camera, and brightness sums follow how much globe is in view.

Detection:
- **Silhouette test** (globe on black): `globe = Y > 0.02`; track its area fraction and centroid. Zooms change the area, pans move the centroid. A globe rotating in place passes unnoticed.
- **Global motion test:** phase correlation or mean optical flow on the central part of the globe; a persistent coherent shift is rotation.
- **Metadata test** for SVS EXR frames [M]: all 7 EXR headers sampled (5425, 5196, 4960, 4950) carry a `worldToCamera` 4x4 matrix. In the 5425 temperature set its camera-distance entry is 449.6 at frames 0, 2000 and 19000, 444.2 at 5000 and 195.9 at 10363 (zoomed in), and the rotation part differs between all five. An HTTP Range request for the first 4 kB of a frame is enough, so static-camera segments can be found without decoding anything.

Coping, best first: (1) use the flat-map sibling (section 10); (2) use only segments where the camera holds still; (3) use view-independent features: hue-class fractions divided by visible globe area, blob counts, ramp-position histograms; (4) un-project each frame with the orthographic formulas, which needs the view centre per frame. Skip (4).

## 7. Layer separation: one instrument per colour class

Goal: split a frame into layers, each a grid of "how much of class k is here".

**Method A, nearest hue.** Per cell compute OKLab L, chroma C, hue h. Background if C is under a chroma gate (and optionally L under a lightness gate). Otherwise assign the swatch with the nearest hue (circular difference), rejecting cells more than 40 degrees from every swatch. Layer intensity = L or C times the area weight.

Measured on the 5669 still, 96x54 grid [M]:

| Class | Legend hue | Hue on the map (one cell) | Centroid across gates | Share of cells |
|---|---|---|---|---|
| Dust | 310.9 | 312.7 (Sahara) | 20.8 to 21.5 N, 2 W to 9 E | 1.9 to 3.2% |
| Black carbon | 33.7 | 38.9 (central Africa) | 2 S to 7 N, 12 to 14 E | 0.4 to 1.2% |
| Sulfate | 140.5 | 142.8 (north Pacific) | moves with the gate | 35.8% (chroma >= 0.035), 22.8% (chroma >= 0.05), 8.2% (plus L >= 0.40), 3.0% (plus L >= 0.50) |
| Sea salt | 194.2 | 247.5, chroma 0.039 (Southern Ocean) | - | needs its own rule |

Lessons:
- Dust and black carbon land on the Saharan plume and the central-African smoke visible in the still, and their centroids barely move when thresholds change. Sonify centroids and relative strength.
- The dark ocean has a faint green cast (chroma about 0.03), so without a lightness gate "sulfate" swallows a third of the frame. Publish the gates you use.
- Sea salt is drawn as pale blue-white swirls over dark blue water. Blending shifts its hue 53 degrees from the legend swatch, and the empty ocean background (hue 202) sits closer to the swatch than the swirls do. Starting rule, not validated: bright (L >= 0.40), nearly colourless (C < 0.06), bluish (hue 170 to 290), over ocean. It needs a land mask because bare land is the same grey (chroma 0.007 to 0.016).

**Method B, unmixing (upgrade, not tested).** Model each cell's linear RGB as a non-negative mix of the swatch colours and solve for the weights (non-negative least squares; with four swatches and three channels allow at most two classes per cell). Gives overlapping layers instead of hard classes.

**Method C, use layers SVS already separated.** SVS 5518 has one flat 2048x1024 movie per pollutant (PM2.5, CO, NOx about 112.5 MB each; frame sets and a colour bar for all four) [M]. SVS 5425 publishes temperature, salinity, sea ice, land, land mask, dates and equator as separate layers [E]. Prefer these to cutting up 5533's stripes, whose boundaries and labels move.

Caldwell 73 does the same by colour class: orange and red stars are one instrument, blue stars another [D].

## 8. Burned-in text, labels, date stamps, logos

**The date of a frame, best source first:**
1. **A published list.** 3912: `https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/flat_ecco2_dates.txt`, 2,001 lines of frame index and UTC time (first `23000  2007-03-25T12:00Z`, last `31000  2008-03-03T12:00Z`, about 4 h 07 min per frame) [M]. 5544 (NDVI, in the EIC gallery): `https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005544/dates_list.txt`, 900 lines such as `Dec 27, 2023` [M].
2. **A stated range plus linear interpolation.** 5425: 15 Jan 2021 to 25 Dec 2023 over 19,001 frames at 60 fps [E], about 1.36 hours per frame if linear (unverified). 5196: January to March 2020. 5533: 1 July to 14 September 2024 [E].
3. **A dates-only layer.** 5425 `perpetual_ocean2_CLOSE_093_datesOnly_1080p30.mp4` (2.5 MB; white text bottom left on black, e.g. `15 Jan 2021`) and 4960 `atmos_river_DATE_ONLY_HD.mp4` (6.6 MB) [E]: clean OCR input, and the exact pixels to mask in the main movie.
4. **OCR of the stamp**, last resort: Tesseract on a cropped, thresholded stamp for every 30th frame; interpolate between readings.

Trap: the 5011 globe movie is not linear in time. At 25% of its running time the stamp reads `Mar 01 2017 12:42`; at 50% a year dial still shows 2017; it ends in 2023 [M, sample frames]. The flat movie on the same page is safer; its linearity is (unverified).

**Masking overlays.** Simplest robust method: per visual, a hand-made list of rectangles in fractions of the frame, excluded before the block average. Approximate values from sample frames: 5011 globe stamp bottom right (x > 0.84, y > 0.78); 4950 colour bar bottom left (x < 0.27, y > 0.86); 5313 year label and legend in the centre (x 0.48 to 0.58, y 0.48 to 0.62) plus four pop-out zoom boxes in the second half; 5533 pill labels along the bottom of each stripe. Automatic alternative: text is small, near-white, low-chroma connected components; label them and drop blobs under a size limit. Thin lines (borders, graticule, the equator line in the 5011 flat movie) mostly vanish in the block average; a 3x3 median first removes the rest.

**Logos.** No NASA insignia appeared in about 60 sample frames of the nine visuals [E]. Check every still you publish: NASA's insignia and logotype are not in the public domain [D] and the contest rules forbid them.

## 9. Tools, licences, install commands

Versions and licences read today from PyPI's JSON API [M] unless marked. All have Windows wheels usable on Python 3.14.

| Tool | Version (date) | Licence | Use here |
|---|---|---|---|
| numpy | 2.5.4 (2026-10-10) | BSD-3-Clause plus small permissive parts | everything |
| Pillow | 13.0.0 (2026-10-16) | MIT-CMU | read PNG, JPEG, TIFF; `quantize`; resize |
| opencv-python-headless | 5.0.0.93 (2026-07-02) | Apache 2.0 (OpenCV 4.5.0 and later [D]) | optical flow, connected components, Canny, `warpPolar`, video reading. One `abi3` wheel covers Python 3.7+; headless = no GUI windows |
| scikit-image | 0.26.0 (2025-12-20) | BSD | `label`, `regionprops`, `find_contours`, `phase_cross_correlation`, Lab colour |
| scipy | 1.18.1 (2026-08-21) | BSD | non-negative least squares, filters (optional) |
| imageio, imageio-ffmpeg | 2.38.1, 0.8.1 | BSD-2-Clause | `for frame in iio.imiter(path, plugin="pyav")` after `pip install av`; ffmpeg route: `pip install imageio[ffmpeg]` [D] |
| av (PyAV) | 19.0.2 | BSD-3-Clause | FFmpeg bindings behind imageio's pyav plugin |
| FFmpeg (program) | winget `Gyan.FFmpeg` 9.0.2 [M: `winget show`] | LGPL 2.1+, GPL when built with GPL parts [D]; this build is listed as GPL-3.0 | extract and shrink frames. Runs as a separate program and is not shipped in the repo; list it in the references |
| OpenEXR (Python) | 3.5.4 (2026-11-12) | BSD-3-Clause [M: LICENSE.md] | `OpenEXR.File(p).channels()["RGBA"].pixels` -> float16 (H, W, 4) [D] |
| Tesseract, pytesseract | winget `UB-Mannheim.TesseractOCR` 5.4.0 [M]; 0.3.13 | Apache-2.0 | OCR of date stamps, only if needed |
| Canvas 2D `getImageData` | browser built-in | - | pixels of same-origin images or video only; `getContext('2d', { willReadFrequently: true })` when reading every frame [D] |
| `requestVideoFrameCallback` | Baseline since October 2024 [D] | - | callback per presented video frame with `metadata.mediaTime`: syncs JSON features to the video |
| WebCodecs | browser built-in | - | frame-exact decoding, but no MP4/WebM container reading: MDN says a demuxing library is needed [D]. Skip |
| WebGL shaders | browser built-in | - | per-pixel work on the GPU; cross-origin textures need CORS approval too [D]. Skip |
| opencv.js | 5.x build 16.2 MB, 4.x build 11.0 MB [M] | Apache 2.0 | all of OpenCV in the page; too heavy for a 96x54 grid. Skip |

Install on the build machine:

```
python -m pip install numpy pillow opencv-python-headless scikit-image imageio imageio-ffmpeg av
python -m pip install OpenEXR pytesseract          # only for EXR frames or OCR
winget install --id Gyan.FFmpeg -e
winget install --id UB-Mannheim.TesseractOCR -e    # only for OCR
```

Extract and shrink in one step (the `area` scaler averages source pixels [D]; it averages gamma bytes, acceptable for a first pass):

```
ffmpeg -i in.mp4 -vf "fps=6,scale=384:192:flags=area" frames/%05d.png
```

SVS EXR frames [M, 7 headers]: single-part scanline files, channels R, G, B, A as 16-bit half floats, ZIPS compression, six of the seven written by Pixar RenderMan 23.5 or 26.2. Main-layer frames are 10 to 57 MB each [E] and need tone mapping before display. Pixel data was not decoded today; that it is linear light is (unverified). Prefer the MP4s or the PNG/TIFF sets. In OpenCV, EXR reading is switched by the environment variable `OPENCV_IO_ENABLE_OPENEXR` [D].

Browser read-back, same-origin media only:

```js
const ctx = canvas.getContext('2d', { willReadFrequently: true });   // canvas is 96 x 54
ctx.imageSmoothingQuality = 'high';               // default is 'low' [D]; the filter is browser-defined
ctx.drawImage(video, 0, 0, 96, 54);               // the browser shrinks (on gamma bytes)
const px = ctx.getImageData(0, 0, 96, 54).data;   // Uint8ClampedArray, 96*54*4 values, RGBA
```

## 10. The named EIC visuals

Sizes, frame counts and formats from the local crawl [E]; appearance from its sample frames; sibling pages checked live today [M].

| SVS id, title | What the frames look like | Formats and frame sets | What carries the science | Pitfalls | Suggested features |
|---|---|---|---|---|---|
| **5313** Night lights change 2012 to 2023 (EIC version) | dark flat map shown twice side by side (32:9); yellow-white city lights; year label in the centre; then an orange / white / purple change map with a small legend; second half adds four pop-out zoom boxes (Western Europe, Eastern Mediterranean, Ukraine, India) | one HEVC MP4 7680x2160 (32.7 MB, 43.3 s, 30 fps, about 1,300 frames); ProRes MOV 4.0 GB; frames directory answers HTTP 403 [M]. Flat siblings: 5276 (3840x2160 MP4 34.3 MB, frames, colour bar), 5475 (2048x1024 MP4 23.3 MB, frames) [M] | lit area and brightness per region per year; sign of change | HEVC plays only on some browser and hardware combinations [D]; doubled map; inset boxes add zoomed light; cross-fades look like change | per region (about 12 lat/lon boxes): summed luminance above a threshold and count of lit cells per year; in the change map, purple versus orange fractions |
| **3912** Sea surface currents and temperature | flat 2:1 map; bright streaks on black coloured by temperature (rainbow); land flat grey | TIFF frames 2048x1024 (2,001 frames, 6.3 MB each, uncompressed [M]); a set with colour bar; 6840x3420 (66 GB); MP4 2048x1024 (244 MB, 66.7 s, 30 fps); WebM (14.9 MB, VP8); M4V 640x320 (12.1 MB); per-frame date list | temperature by latitude and basin; eddy activity; current direction | brightness is streak density, not temperature; green band of the rainbow is coarse; the with-colour-bar set has a legend to mask | zonal mean SST in 6 to 12 bands (hue inversion); tropics-minus-poles contrast; texture energy; date from the list. **Best first target** |
| **5669** GEOS Aerosols | one flat 16:9 still for 2025-08-19 20:00 UTC; four hue classes glowing over a dark map; small city-light dots | PNG at 1920x1080 (2.6 MB), 3840x2160, 5760x3240, 7680x4320; a 14:11 print version; `Aerosols_cbar.png`. No movie, no frame set | which aerosol type is where; relative strength | a single frame; blending; threshold sensitivity; sea-salt hue (section 7) | per-class intensity along a west-to-east sweep (four tracks); per-class centroid; cursor probe |
| **5533** Air Quality Model Runs | flat map cut into vertical stripes, one pollutant each in its own ramp (NOx green, O3 purple, CO yellow to red, PM2.5 cream to brown), country outlines, pill labels; other versions wrap the stripes on a rotating globe | PNG frames 5760x3240 (1,800 to 3,031 per set, 14 to 20 GB per set) and 7680x2160 (4,502 frames, 37 GB); MP4 5760x3240 (286 MB, 60 s); 3840x1080 preview (179 MB). Data 1 July to 14 September 2024 | concentration of each pollutant by region over time | one frame mixes four variables; labels; rotating globe; huge frames | use sibling **5518**: per-pollutant flat layers 2048x1024 with colour bars. Per layer: regional mean of inverted value, plume centroid, area above a level |
| **5425** Perpetual Ocean 2 | globe with natural-colour land; streaks white or coloured by temperature or salinity; camera rotates, then zooms to the Kuroshio, Agulhas and Gulf Stream | EXR 3840x2160, 19,001 frames per layer (main layers about 0.5 TB each); MP4 1080p30 (0.9 to 1.2 GB, 316.8 s); separate layers (temperature, salinity, sea ice, land, land mask, dates, equator); three colour bars | strength and meanders of boundary currents; temperature of the flow | camera moves throughout; EXR; size | use flat siblings **5479** (2048x1024: temperature 140 MB, salinity 215 MB, beauty 256 MB) or **5505** (`fast_global_small.mp4`, 78.8 MB) [M]; then as 3912. That 5479 uses the 5425 temperature bar is (unverified) |
| **5196** DYAMOND CO2 | globe; semi-transparent tan to orange to red CO2 over natural-colour Earth and white cloud; variants orbit, zoom east, zoom west, tilt, fly-through | EXR 5760x3240 (1,176 frames per variant, 23 to 57 MB each); one PNG set 9600x3240; MP4 1080p30 (6.9 to 43.5 MB, 39.2 s; the orbit file is HEVC). January to March 2020 | where CO2 concentrates; plume transport | colour and opacity over a textured background plus a moving camera: no ppm per pixel; no flat sibling found | view-independent only: fraction of globe pixels in the red-orange hue class divided by globe area; frame-difference energy inside the globe mask. Label it relative |
| **5011** Lightning from the ISS | globe version: rotating grey Earth, clouds, yellow dots, star field, date stamp then a year dial; flat version: dark map, yellow dots, equator and tropic lines | MP4 only: globe 1920x1080 (127 MB, 216.7 s, 30 fps), 4K, 7680x2160 HEVC; flat 4096x2048 at 60 fps (334 MB, 100 s, 6,002 frames) | number and place of events over time; seasonal north-south migration | globe: rotation, stars read as events, non-linear time; flat: heavy to decode, transcode to about 1024x512; dots persist for a 10-day window | yellow mask before shrinking -> count per cell; new-cell onsets -> percussion; mean latitude of activity -> pitch; count by latitude band |
| **4960** Atmospheric river | 3-D view from a flying camera; coloured surface layers (precipitation purple to yellow, snow depth, soil moisture), white wind streaks, annotation glyphs such as a large "H" | EXR 3840x2160 (17,485 frames, 428 GB); PNG 7680x2160 (1,798 frames, 32 GB); MP4 and WebM 1080p (WebM 69.5 MB, 291.7 s, 59.94 fps); dates-only layer; five-part colour bar | the moisture corridor and where it makes landfall | perspective plus camera: no geolocation; stacked translucent colour tables; the narrated version has audio you must not reuse | fraction of the frame in the precipitation ramp and its mean ramp position; streak-motion energy; date from the dates layer. Low priority |
| **4950** GEDI forest height | rotating globe or regional fly-overs; land brown to green to white by canopy height, extruded in 3-D; blue ocean; colour bar bottom left in the with-colour-bar versions; in regional clips data is drawn on pass by pass | TIFF 3840x2160 (31.7 or 63.3 MB each, 1,346 to 2,999 per set) and EXR sets; MP4 1080p60 (global 17.7 MB, 51.5 s; WebM 6.0 MB); colour bar TIFFs | distribution of canopy height | rotation; 3-D lighting and height exaggeration distort colour; bar inside the frame; no flat version on the page | histogram of ramp positions among land pixels inside the globe mask (share of tall canopy); in regional clips, growth of covered area. Low priority |
| **13786** Caldwell 73 (reference) | square 1920x1920 star-cluster video with a rotating sweep line | MP4 73.9 MB, WebM 5.6 MB, 34 s; carries SYSTEM Sounds audio | - | do not reuse the audio | borrow the ideas: radar sweep, radius -> pitch, colour class -> instrument |

3912, 5669 and the flat 5011 movie between them exercise the three feature families (field, classes, events) and give three different musical textures.

## 11. A minimal feature pipeline for a 30-hour build

### 11.1 Offline precompute versus live in-browser analysis

| Criterion | Offline precompute (Python -> JSON) | Live analysis in the browser |
|---|---|---|
| CORS | unaffected: Python fetches SVS files directly | impossible on SVS-hosted media [M][D]; only on copies you host or files the user picks |
| Input quality | lossless PNG/TIFF frames, any resolution | whatever compressed video the browser decodes |
| Run-time cost on a phone | none | fine on the grid: about 5 ms per frame for the measured features on a laptop [M], plus read-back |
| Testability | features are a file: plot, unit-test, cite | varies with browser, codec and seek accuracy |
| Flexibility | fixed set of visuals | any frame the user scrubs to; user-supplied images |
| Build risk | low | medium: read-back, frame sync, autoplay rules |
| Hosting | JSON of tens of kB | self-hosted video counts against GitHub Pages limits (site 1 GB, soft 100 GB per month [D]) |

**Recommendation: offline precompute is the product; live analysis is an optional extra.** NASA material is generally not copyrighted and may be used for educational and informational purposes with NASA credited, and SVS content is public domain unless a page says otherwise [D], so hosting small copies is allowed; the JSON route just does not need it.

### 11.2 Steps

1. **Fetch** per visual: the smallest flat movie (or 200 to 400 evenly spaced PNG/TIFF frames), the colour bar PNG, the date list if any. Log every URL for the references.
2. **Extract frames** at 4 to 8 per second of video (ffmpeg or imageio).
3. **Per frame:** bytes -> linear -> ignore rectangles -> block-mean grid -> OKLab -> masks -> inversion or hue classes -> features (sections 4 and 6).
4. **Sanity-check once per visual:** plot zonal means against latitude, print the class map as ASCII, compare one number with the colour bar by eye.
5. **Write one JSON per visual** and commit it.
6. **In the browser:** fetch the JSON (same origin), play the video, and in each `requestVideoFrameCallback` take `i = round(metadata.mediaTime * json.fps)` and hand `frames[i]` to the synth. For cursor probing read a stored grid from the JSON; no canvas read needed.

JSON shape (3912 example; 400 steps x 12 bands is about 25 kB):

```json
{
  "svs_id": 3912,
  "source": "https://svs.gsfc.nasa.gov/3912/",
  "credit": "<credit line copied from the SVS page>",
  "fps": 6, "grid": {"w": 96, "h": 48, "projection": "equirectangular"},
  "quantity": {"name": "sea surface temperature", "unit": "degC", "min": 0, "max": 32,
               "colourbar": "sst_ecco2_cbar.png", "method": "hue match in OKLab"},
  "bands": [[-90, -75], [-75, -60], "..."],
  "frames": [
    {"t": 0.0, "date": "2007-03-25T12:00Z", "zonal": [1.2, 2.9, "..."], "tex": 0.41, "diff": 0.012}
  ]
}
```

The `quantity` block is the documented mapping: what the number is, its unit, where the calibration came from, how it was read. The numbers inside `frames` are placeholders.

### 11.3 Time budget

| Step | Hours |
|---|---|
| Shared helpers (linearise, grid, OKLab, lat/lon, JSON writer) | 2 |
| 3912: bar, mask, inversion, zonal means, dates | 2 |
| 5669: four hue layers, sweep profile, probe grid | 2 |
| 5011 flat: transcode, yellow mask, onsets | 2 to 3 |
| 5518 layers (optional fourth piece) | 2 to 3 |
| Checks and plots for the write-up | 1 |

## Open questions / unverified

- Whether the striped 5533 frames use exactly the colour tables of the 5518 and 5151 to 5154 bars (not compared pixel by pixel).
- Whether 5479's temperature movie uses the 5425 temperature bar (0 to 25 C); the 5479 page lists no bar.
- Tick positions on the CO and NOx bars were read by eye from a 600-pixel image; re-measure before publishing values.
- Linearity of frame -> date for 5425 (range only) and for the flat 5011 movie. The 5011 globe movie is known not to be linear.
- Optical flow, connected components, Canny and contour functions were confirmed in documentation only; none was run or timed (OpenCV, scikit-image and ffmpeg are not installed here).
- The hue of the lightning dots in 5011 was not measured (sample frames are JPEG and no decoder was available). Measure it from one extracted frame.
- Canvas read-back time and each browser's 20x downscale filter were not measured. Compare one browser grid with the Python grid before trusting live analysis.
- EXR pixel data was not decoded; linear-light encoding is assumed.
- The inverted SST profile was judged plausible by eye, not checked against a reference dataset.
- The 5313 two-maps layout, the ignore rectangles in section 8 and the no-logos observation come from about 60 low-resolution sample frames, not full movies.
- Meijer 1992, Poco et al. 2018 and the `unmap` repository were seen in search results; the papers and the repository page were not opened.
- `global-land-mask` (PyPI 1.0.0, MIT classifier, last release 2020) may give a land test by latitude and longitude; its API, and `hilbertcurve`'s, were not checked.
- Whether hot-linked SVS video plays from another origin in every browser was not tested in a browser; only response headers were read.

## Sources

SVS pages, API and files (fetched 2026-11-14):
- Data Sonification: Caldwell 73 - https://svs.gsfc.nasa.gov/13786/ - radar sweep, radius -> pitch, instruments by colour, credit SYSTEM Sounds.
- SVS page API example - https://svs.gsfc.nasa.gov/api/5669 - JSON structure, colour bar group, fixed CORS header.
- SVS help - https://svs.gsfc.nasa.gov/help/ - API URL patterns, frames directories, public-domain statement.
- SVS API, sibling pages - https://svs.gsfc.nasa.gov/api/5518 , https://svs.gsfc.nasa.gov/api/5479 , https://svs.gsfc.nasa.gov/api/5505 , https://svs.gsfc.nasa.gov/api/5475 , https://svs.gsfc.nasa.gov/api/5276 - flat versions, per-pollutant layers, file names.
- 3912 colour bar - https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/sst_ecco2_cbar.png - sampled ramp, ticks.
- 3912 frame - https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/frames/2048x1024_1x1_30p/orig/flat_global_ecco2_2028x1024.25908.tif - inversion worked example.
- 3912 date list - https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/flat_ecco2_dates.txt - frame index -> UTC time.
- 5544 date list and bar - https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005544/dates_list.txt , https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005544/NDVI_colorbar.png - per-frame dates; Low/High bar.
- 5669 colour bar - https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005669/Aerosols_cbar.png - swatch colours.
- 5425 colour bars - https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005425/perpetual_ocean2_CLOSE_101_cbar_temperature.png , https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005425/perpetual_ocean2_CLOSE_100_salinity_cbar.png , https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005425/perpetual_ocean2_CLOSE_101_cbar_beauty.png - ramp analysis.
- 5425 EXR frame, header only - https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005425/frames/3840x2160_16x9_60p/temperature/perpetual_ocean2_CLOSE_096_temperature.10363.exr (also frames 00000, 02000, 05000, 19000) - channels, compression, camera matrices.
- 5196 colour bar - https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005196/dyamondCbar_6-27-2024a.png - colour plus opacity.
- 4960 colour bars - https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004960/atmo_rivers_cbars01.png - five legends.
- 5518 colour bars - https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005518/PM2.5_colorbar.png , https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005518/CarbonMonoxide_colorbar.png , https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005518/NitrogenOxides_colorbar.png , https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005518/Ozone_colorbar.png - ramps, tick scales.
- 5151 to 5154 colour bars - https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005151/PM2.5_colorbar.png , https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005151/PM2.5_colorbar_plain.png , https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005152/O3_colorbar.png , https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005153/CO_colorbar.png , https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005154/NOx_colorbar.png - same ramps as 5518.
- 5276 colour bar (HEAD only) - https://svs.gsfc.nasa.gov/vis/a000000/a005200/a005276/nightlights_change_colorbar.png - exists.
- Flat movies (HEAD for size) - https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005475/nightlights_2012-2024_KSC_04_plus2_2048x1024_30p_sos.mp4 , https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005518/AirQuality_PM2.5_Layer_2048x1024.mp4 , https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005505/fast_global_small.mp4 , https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005479/perpetual_ocean2_EQUIREC_072_FINAL15_SOS_temperature_1024p30.mp4 , https://svs.gsfc.nasa.gov/vis/a000000/a005200/a005276/nightlights_2012-2023_change_flat_2160p30.mp4 - sizes in section 10.

Sonification precedents:
- Chandra sonification overview - https://chandra.si.edu/sound/ - methods differ per object; credits.
- Chandra Galactic Center - https://chandra.si.edu/sound/gcenter.html - left-to-right scan, vertical position -> pitch, intensity -> volume.
- The vOICe image-to-sound mapping - https://www.seeingwithsound.com/im2sound.htm - 64x64, 16 grey tones, vertical -> frequency, brightness -> amplitude.

Colour and maths:
- Ottosson, A perceptual color space for image processing - https://bottosson.github.io/posts/oklab/ - OKLab matrices; public domain / MIT.
- W3C, Relative luminance - https://www.w3.org/WAI/GL/wiki/Relative_luminance - luminance weights, sRGB linearisation, threshold note.
- CSS Color Module Level 4 - https://www.w3.org/TR/css-color-4/ - JND 0.02 in OKLab, 2 in deltaE2000.
- Matplotlib, Choosing Colormaps - https://matplotlib.org/stable/users/explain/colors/colormaps.html - colormap classes, monotonic lightness, jet.
- OpenIMAJ Colorfulness source - https://openimaj.org/apidocs/src-html/org/openimaj/image/feature/global/Colorfulness.html - Hasler and Suesstrunk formula.
- Orthographic map projection - https://en.wikipedia.org/wiki/Orthographic_map_projection - forward and inverse formulas.
- NOAA Science On a Sphere content guidelines - http://sos.noaa.gov/support/sos/manuals/content-creation-guidelines/all/ , https://sos.noaa.gov/support/sos/manuals/content-creation-guidelines/dataset-format/ - equirectangular 2:1, 0 degrees at centre, recommended sizes.
- NHC, Hurricane Erin forecast advisory 34 - https://www.nhc.noaa.gov/archive/2025/al05/al052025.fstadv.034.shtml - 26.6N 72.7W at 19/2100Z; check of pixel -> lat/lon.

Libraries and platform documentation:
- OpenCV 5.x main page - https://docs.opencv.org/5.x/index.html - version 5.0, modules.
- OpenCV video tracking - https://docs.opencv.org/5.x/main_modules/video_track.html - `calcOpticalFlowFarneback`, `calcOpticalFlowPyrLK`.
- OpenCV optical flow tutorial - https://docs.opencv.org/4.x/d4/dee/tutorial_optical_flow.html - Farneback 2003 reference, example parameters, `goodFeaturesToTrack`.
- OpenCV imgproc and core pages - https://docs.opencv.org/5.x/main_modules/imgproc_shape.html , https://docs.opencv.org/5.x/main_modules/imgproc_motion.html , https://docs.opencv.org/5.x/main_modules/imgproc_feature.html , https://docs.opencv.org/5.x/main_modules/imgproc_transform.html , https://docs.opencv.org/5.x/main_modules/core_cluster.html - `connectedComponentsWithStats`, `findContours`, `phaseCorrelate`, `Canny`, `warpPolar`, k-means.
- OpenCV environment variables - https://docs.opencv.org/4.x/d6/dea/tutorial_env_reference.html - `OPENCV_IO_ENABLE_OPENEXR`.
- OpenCV licence - https://opencv.org/license/ - Apache 2 from 4.5.0.
- OpenCV.js - https://docs.opencv.org/5.x/js_tutorials/js_setup/js_usage/js_usage.html , https://docs.opencv.org/5.x/opencv.js , https://docs.opencv.org/4.x/opencv.js - how to load; file sizes.
- scikit-image API - https://scikit-image.org/docs/stable/api/skimage.measure.html , https://scikit-image.org/docs/stable/api/skimage.registration.html , https://scikit-image.org/docs/stable/api/skimage.color.html - `label`, `regionprops`, `find_contours`, `shannon_entropy`, `moments_hu`, phase correlation, optical flow, Lab functions, `rgb2gray` weights.
- Pillow Image module - https://pillow.readthedocs.io/en/stable/reference/Image.html - `quantize`, `convert("L")` formula, `entropy`.
- imageio examples - https://imageio.readthedocs.io/en/stable/examples.html - reading video frames with the pyav plugin.
- OpenEXR Python - https://openexr.com/en/latest/python.html , https://raw.githubusercontent.com/AcademySoftwareFoundation/openexr/main/LICENSE.md - read API; licence text.
- FFmpeg - https://ffmpeg.org/legal.html , https://ffmpeg.org/ffmpeg-scaler.html - LGPL/GPL; `area` flag.
- FFmpeg Windows builds - https://www.gyan.dev/ffmpeg/builds/ - homepage named by `winget show Gyan.FFmpeg` (page not opened).
- Tesseract Windows builds - https://github.com/UB-Mannheim/tesseract/wiki - homepage named by `winget show UB-Mannheim.TesseractOCR` (page not opened).
- PyPI JSON API - https://pypi.org/pypi/numpy/json , https://pypi.org/pypi/pillow/json , https://pypi.org/pypi/opencv-python-headless/json , https://pypi.org/pypi/scikit-image/json , https://pypi.org/pypi/scipy/json , https://pypi.org/pypi/imageio/json , https://pypi.org/pypi/imageio-ffmpeg/json , https://pypi.org/pypi/av/json , https://pypi.org/pypi/OpenEXR/json , https://pypi.org/pypi/pytesseract/json , https://pypi.org/pypi/unmap/json , https://pypi.org/pypi/hilbertcurve/json , https://pypi.org/pypi/global-land-mask/json - versions, dates, licences, wheel tags.
- MDN, cross-origin images and canvas - https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image - tainted canvas, SecurityError.
- MDN, getImageData - https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData - syntax, SecurityError.
- MDN, ImageData.data - https://developer.mozilla.org/en-US/docs/Web/API/ImageData/data - RGBA order, four values per pixel.
- MDN, getContext - https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext - `willReadFrequently`.
- MDN, imageSmoothingQuality - https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingQuality - values, default.
- MDN, requestVideoFrameCallback - https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback - `mediaTime`, Baseline 2024.
- MDN, WebCodecs API - https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API - no demuxing built in.
- MDN, textures in WebGL - https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL - cross-domain textures need CORS.
- MDN, web video codec guide - https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs - HEVC support conditions; H.264, VP8, VP9 in all major browsers.

Rules and hosting:
- NASA images and media guidelines - https://www.nasa.gov/nasa-brand-center/images-and-media/ - copyright status, educational use, credit, insignia.
- Natural Earth terms of use - https://www.naturalearthdata.com/about/terms-of-use/ - public domain.
- GitHub Pages limits - https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits - 1 GB site, 100 GB per month soft bandwidth.

Seen in search results only, not opened:
- Poco, Mayhua, Heer 2018 - https://idl.uw.edu/papers/extracting-color-mappings - colour-mapping extraction from chart images.
- unmap repository - https://github.com/scienxlab/unmap - colour -> data package.
- Meijer 1992, IEEE Trans. Biomedical Engineering 39(2):112-121 - https://www.seeingwithsound.com/abstract.htm - original vOICe paper.
- Hasler and Suesstrunk 2003 - https://infoscience.epfl.ch/record/33994?ln=en - colourfulness paper.
