# Features to sound: sonification mapping and synthesis algorithms

> Status: researched 2026-11-14 with live sources by its author. The independent fact-check pass did NOT complete (see README.md). Treat licence, citation and version claims as unconfirmed until you open the cited source.

Scope: the "numbers to sound" half. Input = per-frame features (see 02-frame-analysis-algorithms.md). Output = sound parameters. Musical polish is in 04-making-it-musical.md, libraries in 05-tools-and-libraries.md, full programs in 08-recipes-python.md and 09-recipes-browser.md. Tags: "(unverified)" = not confirmed on a live page today; "(rule of thumb)" = our engineering judgment, not a cited result; "measured" = run on this machine today (numpy script `C:\Users\alexl\AppData\Local\Temp\claude\150df90ecfbb827e\85163732-6cf8-4eea-a295-061a9bb04d9c\scratchpad\work\mapping-synthesis\checks.py`).

## TL;DR

- Use **parameter-mapping sonification** (data value -> sound parameter) for continuous fields, **event triggers** for flashes and fires, and **probing** (pointer position -> sound) for blind and low-vision (BVI) exploration. Audification and model-based sonification do not fit single image frames.
- **Pitch is the one precise channel.** Map the key variable linearly to MIDI note number, `f = 440 * 2^((m-69)/12)`, range MIDI 48-84, and play it against a **reference drone** at a meaningful baseline. Loudness is a weak channel: use it for emphasis or as a redundant cue only.
- **Invert the colour bar before you sonify.** Colour in an EIC frame is a code for a data value or a category. Value -> pitch or brightness; category -> instrument. Raw RGB or raw brightness sonifies the palette, not the data.
- The **left-to-right inverse-spectrogram scan** (row = oscillator, brightness = amplitude) is what The vOICe and ARSS/Photosounder do. It sounds like noise because every row sounds at once. Fixes: sparsity (top-K rows), a musical scale, interpolated amplitudes, random phases. Keep it as one "texture view", not the product.
- NASA's own exemplar (Caldwell 73, SVS 13786) is **not** a naive scan: a rotating radar sweep triggers a note per star, radius -> pitch, star colour -> instrument (marimba or glockenspiel), whole image -> choir bed. Copy that architecture: events + layers + bed.
- **Smooth every control signal** (one-pole filter, tau 30-100 ms, `setTargetAtTime`) and **schedule ahead** (25 ms timer, 100 ms window), or you get zipper noise, clicks and drifting sync.
- Seven mapping designs with exact rule tables are in section 10; the chooser table in section 11 says which fits which EIC visual.
- Everything here is synthesised from oscillators and noise: no samples or soundfonts, so nothing to license except the library (Tone.js 15.1.22 is MIT).

## Decisions for the Jukebox build

Ranked; what we would do in your place.

1. **One shared pipeline: feature JSON -> declarative mapping table -> synth.** Reason: the SVS CORS header blocks pixel reads in the browser, so features come from an offline pass anyway; and a table (input, range, scaling, output, range, polarity) per visual is the "documented mapping" judges can check, and makes the sound systematic and reproducible (Hermann's criteria, section 1). Trade-off: no arbitrary new image at runtime unless frames are served from your own origin.
2. **Three visuals, three designs, not eleven.** Value-against-drone (Design A) on one animated global field; flash -> percussion (Design E) on Lightning 5011; one-instrument-per-layer (D) or flow -> density (F) on a third. Reason: three different technique families, each explainable in one sentence. Skip the rest.
3. **Add probe mode (Design G) on one static map.** Reason: it is the only design where a BVI user controls what they hear, it has evaluation evidence with blind users (iSonic), and it is your listening-test task ("find the hottest region by ear"). Trade-off: needs a small value grid (for example 180 x 90 numbers as JSON) shipped with the page.
4. **Pitch for the key variable, timbre for identity, pan for left-right, time for time.** Never put two different variables on the pitch and the loudness of one voice (they interact perceptually). At most 3 concurrent streams (rule of thumb, section 2.8).
5. **Always ship context:** an audio legend (lowest and highest reference tones, spoken), a baseline drone, a tick per time unit. Reason: without context listeners hear only trends; a max-value reference tone gave "dramatic improvements" in value estimation.
6. **Synthesize, do not sample.** Tone.js `FMSynth`, `MembraneSynth`, `Noise` + `Filter` cover all seven designs. Trade-off: less "real instrument" polish; licensed soundfonts are covered in 04/05 if you want them.
7. **Render the 30-second demo audio offline** (numpy -> WAV, same mapping table) and keep live Web Audio for the site. Reason: the video must not depend on live sync.
8. **Skip:** HRTF as the primary spatial cue (front/back confusion, poor elevation with generic HRTFs); IFFT/Griffin-Lim resynthesis; audification; ML music generation as the mapping (not reproducible, weak fidelity); more than 3 octaves; pure sine tones for anything long.

## 1. Taxonomy: which technique family fits image frames

Sonification is "the use of nonspeech audio to convey information", more precisely "the transformation of data relations into perceived relations in an acoustic signal for the purposes of facilitating communication or interpretation" (Kramer et al., Sonification Report, 1999). Hermann (2008) adds four tests: the sound (A) reflects properties or relations in the input data, (B) comes from a completely systematic transformation, (C) is reproducible, (D) works when you swap in different data. Quote these in your write-up: they are your "validity" argument.

| Technique | Definition (Sonification Handbook) | Fits EIC frames? | Use it for |
|---|---|---|---|
| Audification | "direct translation of a data waveform into sound"; needs wave-like 1-D data with "at least a few thousands of samples" (ch. 12) | No for a frame; marginal for long per-region time series (section 7) | Skip |
| Parameter-mapping sonification (PMSon) | "represents changes in some data dimension with changes in an acoustic dimension" (ch. 2, ch. 15) | Yes, the default | All continuous variables |
| Model-based sonification | designer "builds a virtual model whose sonic responses to user input are derived from data" (ch. 2, ch. 16); silent until excited | Possible ("tap the map and it rings") but costly to design | Skip; borrow the interaction idea for the probe |
| Auditory icons | brief everyday-like sounds with an analogous relation to what they stand for (ch. 2; detail in ch. 13) | Yes for events and categories (crack for lightning, crackle for fire) | Event layers |
| Earcons | short abstract musical motifs used as symbols; must be learned (ch. 2; detail in ch. 14) | Yes for interface and context | Scan start/end, border crossed, year tick, legend |

Two more distinctions that matter for images:

- A still image has no time axis, so you must construct one. Yeo and Berger (ICAD 2005) name the two ways: **scanning** (data is sonified in a fixed, pre-scheduled order, for example the column sweep) and **probing** (the user moves a pointer freely). They call the inverse spectrogram "by far the most popular method for sonifying images".
- In the Enge et al. (2024) survey of 57 papers on combined visualization + sonification designs, 53 used parameter mapping; pitch was the most used magnitude channel (47 times) and timbre the most used identity channel (21 times). Dubus and Bresin (2013; 179 publications, 60 projects, 495 mappings) found pitch in 23.8% of mappings, loudness 15.2%, duration 10.1%, spatialization 9.5%, tempo 5.9%, brightness 5.1%, timbre 3.6%; only 30 of the 495 mappings (6.1%) had been evaluated at all. Evaluating yours is a differentiator.

## 2. Parameter mapping in depth

### 2.1 The transfer function

Every mapping is the same four steps (Grond and Berger, ch. 15):

```
v = clip((x - lo) / (hi - lo), 0, 1)     # normalise the data value x
v = shape(v)                             # linear, log, power, sigmoid, step
v = 1 - v if polarity is negative
y = out_lo + v * (out_hi - out_lo)       # y in PERCEPTUAL units: MIDI, dB, log-Hz
```

Then convert y to signal units (Hz, gain). Document each rule in the Handbook's notation, for example `sst_anomaly[-3, +3] -> pitch[48 midinote, 84 midinote]`. Keep the same rule as data, one object per rule, so the published table and the code cannot drift apart (field names are our suggestion):

```json
{"feature":"sst_anomaly","in":[-3,3],"shape":"linear","polarity":"+","out":"pitch_midi","range":[48,84],"snap":"none","tau_s":0.08}
```

| Scaling | Formula on v in 0..1 | Use when |
|---|---|---|
| Linear | v | Data roughly uniform (temperature anomaly, percent cover) |
| Logarithmic | log(1 + k*v) / log(1 + k), k = 10 to 1000 | Data spans orders of magnitude (emissions, night-light radiance, aerosol amount, precipitation) |
| Exponential | out = out_lo * (out_hi / out_lo)^v | The output is a physical unit that is heard logarithmically and you are not going through MIDI or dB: Hz, filter cut-off, event rate |
| Power | v^g; g < 1 expands low values, g > 1 expands high | Tuning by ear |
| Sigmoid | 1 / (1 + exp(-s*(v - 0.5))) | Soft clipping of extremes |
| Step / quantise | round(v * (n-1)) / (n-1) | Classes, scale notes |

Choosing `lo` and `hi`: best is the printed minimum and maximum of the visual's colour bar (sound then matches picture and legend). Otherwise use the 2nd and 98th percentiles over **all frames**: the Handbook recommends quantiles "to make a sonification robust against outliers". Measured: with one outlier of 25 among 1000 standard-normal values, min/max scaling squeezes 98% of the data into 16% of the output range. Never normalise per frame: it destroys comparison between frames.

### 2.2 Data -> pitch

- Frequency (Hz) is physical; pitch is what is heard, and hearing is logarithmic. An **octave** is a factor of 2. A **semitone** is a factor of 2^(1/12) = 1.0595 (+5.95%). A **cent** is 1/100 of a semitone.
- **MIDI note number** m is a linear pitch scale: `f = 440 * 2^((m - 69) / 12)` and `m = 69 + 12 * log2(f / 440)`. A4 = 69 = 440 Hz; C3 = 48 = 130.81 Hz; C4 (middle C) = 60 = 261.63 Hz; C5 = 72 = 523.25 Hz; C6 = 84 = 1046.50 Hz.
- **Map linearly in MIDI, not in Hz.** Worked example, v in 0..1 onto 110-880 Hz (3 octaves, 36 semitones). Linear in Hz: v = 0.25 gives 302.5 Hz, already 17.5 semitones up; the last quarter (0.75 -> 1.0) gets only 4.3 semitones. Linear in MIDI (`f = 110 * 8^v`): every quarter gets 9 semitones. Equal data steps must sound like equal steps.
- Recommended: `m = 48 + 36 * v` (131-1047 Hz). Outer limits MIDI 35-100 (Brown et al. 2003, the usable range on General MIDI piano and trumpet). Melody perception fails above about 5 kHz and octave matching is accurate only below about 2.5 kHz (ch. 3). The Handbook also mentions 1000-5000 Hz as the most sensitive band; it is also the most piercing, so we choose the musical register.
- Resolution: the frequency difference limen is 2-3 Hz at 1 kHz (ch. 3), which is 3.5-5 cents, so pitch resolution is not the limit; memory for absolute pitch is. Listeners judge intervals against a reference, hence the drone (section 9).
- Continuous or snapped? Snapping to a scale ("rounding") is more musical but coarser: C major pentatonic over MIDI 48-84 has 16 notes. Enough for a 5-9 class colour bar, too coarse for subtle trends. Offer both modes; glide the data voice, snap the accompaniment (04).
- Web Audio shortcut: an oscillator's actual frequency is `frequency * 2^(detune / 1200)` (Web Audio specification). Fix `frequency` at the lowest note (130.81 Hz) and drive `detune` with `3600 * v` cents: linear-in-pitch with no conversion code.

Polarity (which direction means "more"). Walker's magnitude-estimation studies asked listeners what data value a sound represents; Walker and Mauney (2010) repeated them with 45 blind listeners. Listeners per mapping choosing positive / none / negative polarity:

| Sound -> data | Blind (n) | Sighted (n) | Design consequence |
|---|---|---|---|
| Frequency -> temperature | 10 / 1 / 0 | 11 / 2 / 6 | Hotter = higher. Safe. |
| Frequency -> velocity | 7 / 1 / 2 | 18 / 1 / 0 | Faster = higher. Safe. |
| Tempo -> velocity | 9 / 0 / 1 | 17 / 1 / 1 | Faster = more notes per second. Safest of all. |
| Frequency -> pressure | 5 / 1 / 2 | 13 / 3 / 3 | Majority positive |
| Frequency -> size | 4 / 0 / 4 | 9 / 0 / 10 | Split. Do not put area or extent (sea ice, burned area) on pitch without a spoken legend. |
| Frequency -> "number of dollars" | 3 / 1 / 4 | 9 / 2 / 8 | Split for abstract amounts. For concentrations (CO2, aerosols) assume nothing: announce it and test. |

Polarity choices of blind and sighted groups correlated r = 0.818, slopes r = 0.963, so one design can serve both. The fitted exponents were mostly below 1 (0.64-0.65 for frequency -> temperature): doubling the frequency is heard as about 2^0.65 = 1.57 times the temperature, not double. Do not promise ratio judgments; give anchors. Walker's summary of his dissertation adds that the unanimity of a mapping's polarity is itself a measure of how effective the mapping is, so prefer the near-unanimous rows. "Intuitive" is not a guarantee either: in Walker and Kramer's 1996 monitoring task, the mappings the designers had labelled bad or random gave better accuracy and reaction times than the intuitive ones (reported in ch. 15). Test with listeners.

### 2.3 Data -> loudness

- **Amplitude** is the linear gain g you multiply samples by (0..1). **Decibels**: `dB = 20 * log10(g)`, `g = 10^(dB / 20)`. Half amplitude = -6 dB; g = 0.1 = -20 dB. About +10 dB sounds "twice as loud"; the just-noticeable difference (JND) is about 1 dB.
- Map v to dB, not to gain: `dB = -30 + 30 * v`. Mapping v straight to gain wastes the range (v = 0.5 is only -6 dB).
- Why it is weak: perceived loudness depends on frequency (equal-loudness contours: at the 20-phon level a 100 Hz tone needs nearly 50 dB SPL against 20 dB at 1 kHz), on the listener's device and volume knob, on masking, and it interacts with pitch (Neuhoff, Kramer and Wayand 2002: when pitch and loudness move in the same direction listeners hear a bigger change than when they move in opposite directions). The Handbook's verdict: "virtually impossible to systematically map data to loudness for anything but relatively crude associations". Flowers' review (via ch. 15): loudness failed as carrier of an important continuous variable but worked for flagging events and context.
- Use it for: accents, gating (silent below a threshold), foreground versus background, and as a redundant cue congruent with pitch. Expect 3-5 reliable levels (rule of thumb).

### 2.4 Data -> timbre and brightness

- **Timbre** is what distinguishes two instruments playing the same note: the number, level and arrangement of the spectral components. **Brightness** is the amount of high-frequency energy.
- Three controls: (1) low-pass filter cut-off, mapped exponentially, `fc = 300 * 20^v` Hz (300-6000 Hz); (2) number or level of harmonics in an additive sound; (3) the **FM index** I (frequency modulation: one oscillator wobbles another's frequency; about I + 2 audible sidebands on each side of the carrier, Carson's rule, ch. 9). Walker's studies used FM index 1-10 as their "brightness" dimension.
- Brightness is a good redundant cue for intensity; expect 3-5 levels. There is no perceptual metric for timbre (ch. 15), so never use it for exact values.
- Instrument identity is the best channel for "which layer is this".
- FM pitfall: non-integer carrier-to-modulator ratios sound bell-like or clangorous, and "a small-seeming change can result in large categorical perceptual shifts" (Cook, ch. 9). Fix the ratio (Tone.js `harmonicity` = 1, 2 or 3) and move only the index.

### 2.5 Data -> duration, tempo, note density

- Duration JND: 4 ms at 10 ms, 15 ms at 100 ms, 60 ms at 1 s (ch. 3). Use duration steps of 20% or more.
- Tempo or density: `rate = r_lo * (r_hi / r_lo)^v`, 0.5 to 16 events per second, exponential because each doubling is one perceptual step. Faster than roughly 16-20 per second, notes fuse into a texture (unverified threshold): hand over to granular synthesis (section 6).
- Meanings that work: speed, flow, activity, counts. Velocity -> tempo is the mapping Dubus and Bresin found assessed as good, and its polarity is near unanimous (table above). Tempo is poor for temperature (Walker 2002, via ch. 2).
- In overviews keep 50-70 ms between successive tones (Brown et al. 2003).

### 2.6 Data -> stereo position: equal-power panning

Pan p runs from -1 (left) to +1 (right). The Web Audio `StereoPannerNode` algorithm for a mono source:

```
x = (p + 1) / 2;   gainL = cos(x * PI / 2);   gainR = sin(x * PI / 2)
```

gainL^2 + gainR^2 = 1 for every p, so total power is constant; at centre both gains are 0.707 (-3 dB). A naive linear pan (gainL = 1 - x, gainR = x) puts each side at -6 dB in the centre and the sound seems to recede. Map image x with `p = 0.8 * (2 * x / W - 1)` (do not go hard into one ear on headphones, rule of thumb). Pan is support, not a main carrier: in the iSonic study only 1 of 7 blind participants consciously used the panning cue.

### 2.7 Data -> reverb or distance

Distance is heard as an integrated cue: lower level + duller spectrum + more reverberation (ch. 15). Map depth, altitude, age or uncertainty to wet/dry mix (0-50% wet) plus a low-pass. Example: Perpetual Ocean 2 (SVS 5425) draws flows above 600 m in white and deeper flows in blue-cyan: deeper = wetter and duller. Web Audio's `PannerNode` default "inverse" distance model: `gain = dref / (dref + f * (max(d, dref) - dref))`, defaults refDistance 1, rolloffFactor 1, maxDistance 10000.

### 2.8 How many dimensions at once

- Evidence: two concurrent series work when hard-panned left and right, three when spatialised around the listener (Brown et al. 2003, blind and sighted users). What failed in Flowers' review: "too many simultaneous continuous variables" on pitch, and simultaneous variables with similar timbres (they fuse into one stream). Streams separate by timbre and spatial position; pitch is unreliable for separation because the data moves it (ch. 2).
- Our rule (rule of thumb): at most 3 concurrent streams; per stream one primary continuous mapping (pitch or rate), one redundant cue, one position. One-to-many (one variable on two cues) is safe. Two variables on one percept is not.

## 3. Image-specific methods

### 3.1 Column scan as an inverse spectrogram

A spectrogram is a picture of sound: x = time, y = frequency, brightness = energy. Read an image as a spectrogram and play it. This is The vOICe (Meijer 1992: 64 x 64 pixels, 16 grey levels, one image per 1.05 s or 2.10 s, each row a sine oscillator whose amplitude is the pixel brightness; its documentation spaces the row frequencies exponentially, `f_i = f_lo * (f_hi / f_lo)^((i - 1) / (N - 1))`, requires each column to last more than 10 periods of the lowest frequency, and publishes its demo code under CC BY 4.0), ARSS (GPLv2; "now superseded by Photosounder", which is commercial, 59 USD), and the Chandra Galactic Center sonification ("begins on the left side of the image and moves to the right"; higher in the image = higher pitch; brightness "controls the volume").

Steps:

1. Downsample to R rows (32-64) by C columns; convert to the data value or to grey, 0..1.
2. Amplitude: a = v^2 (or map to -40..0 dB) and gate: a = 0 below a threshold. Otherwise every dim pixel adds hiss.
3. Frequencies, lowest row at the bottom: `f[r] = f_lo * (f_hi / f_lo)^(r / (R - 1))`. With R = 64 over 200-3200 Hz that is 16 rows per octave (76 cents apart).
4. Each row is an oscillator with a **random start phase**; its amplitude envelope is that row of pixels, **linearly interpolated** along the scan.
5. Sum, divide by the peak, fade 10 ms in and out.

```python
f = f_lo * (f_hi / f_lo) ** (np.arange(R) / (R - 1))
t = np.arange(N) / sr; xi = np.linspace(0, C - 1, N)       # scan position per sample
out = np.zeros(N)
for r in range(R):                                          # img[r, c] in 0..1, row 0 = bottom
    env = np.interp(xi, np.arange(C), img[r])               # interpolate, never step
    out += env * np.sin(2 * np.pi * f[r] * t + phase0[r])   # phase0 = rng.uniform(0, 2*pi, R)
out /= np.abs(out).max() + 1e-9
```

Measured: 64 rows x 10 s at 22050 Hz renders in 0.5 s in numpy on this laptop. Speed is not a constraint.

| Choice | Options | Recommendation |
|---|---|---|
| Synthesis | Oscillator bank: any frequencies, continuous phase, cost R x N. Inverse FFT with overlap-add: faster (0.08 s measured) but bins are linearly spaced (sr / NFFT = 21.5 Hz at 22050 / 1024) and you must invent phases; Griffin-Lim estimates them iteratively (librosa default 32 iterations) | Oscillator bank |
| Frequency scale | Linear (most rows land in the harsh top octaves); logarithmic (matches hearing); rows snapped to a scale (rows sharing a note are summed) | Log, or snapped for music |
| Phase | Aligned phases make an impulsive buzz. Measured peak-to-RMS ratio for 64 equal partials: 11.3 aligned, 3.9 random, so about 9 dB quieter after peak normalisation | Random, fixed seed (reproducible) |
| Amplitude updates | Stepped per column or interpolated. Measured for one 440 Hz partial changing every 39 ms: energy above 2 kHz is -34 dB stepped, -87 dB interpolated | Interpolate |

Why it sounds like noise, and the standard fixes:

| Cause | Fix |
|---|---|
| Natural images have energy in every row at once: a dense inharmonic cluster is noise by definition | Keep only the K = 3-6 brightest rows per column; threshold; blur first |
| Frequencies unrelated to any scale | Snap rows to a pentatonic scale over 3-4 octaves |
| Abrupt column changes click | Interpolate envelopes, or turn columns into notes with attack and release |
| Aligned phases, linear frequency axis | Random phases, log axis, 100-3000 Hz |
| No rhythm or repetition | Quantise columns to 16th notes ("piano roll"); add a pulse |
| Scan too fast for low rows to form a pitch | The vOICe's rule: more than 10 periods of the lowest frequency per column (77 ms at 130 Hz, so 128 columns need about 10 s); use fewer columns or a longer scan |
| Colour-coded data read as brightness | Invert the colour bar first (02) |

Even fixed, this is the mapping a past nominee used. Use it as a secondary "texture view".

### 3.2 Scanline and wavetable synthesis

Take a row of pixels (or a radial or zonal-mean profile) as **one period of a waveform**, loop it at a chosen pitch. The profile's shape becomes timbre: smooth profile = mellow, busy profile = bright and buzzy; pitch stays free for another variable. Steps: subtract the mean (removes DC, a constant offset that wastes headroom), make the ends meet (mirror: profile followed by its reverse), keep the first 16-32 harmonics (limits harshness and aliasing), normalise, crossfade when the profile changes. Web Audio: FFT the profile and pass coefficients to `createPeriodicWave(real, imag)` (index 0 is ignored, index 1 is the fundamental), or loop an `AudioBufferSourceNode`. Yeo and Berger's raster scanning (ICMC 2006) reads whole images this way, line by line, and reports "compelling results" for sonifying image texture. Pitfall (our inference, not from their page): when neighbouring lines are similar, a raw raster scan repeats every row, so its pitch is sample rate / row width (44100 / 1920 = 23 Hz), a property of the image size, not the data. Qualitative only.

### 3.3 Region- or object-based note events

Segment first (blobs, regions, latitude bands, countries; see 02), then play one note per object: centroid x -> onset time or pan, centroid y -> pitch, area or intensity -> loudness and duration, class -> instrument. This is what the cited NASA exemplars do: Caldwell 73 (per-star notes, radius -> pitch, "orange and red stars are represented by a marimba, and the blue stars ... by a glockenspiel", whole image -> choir) and the Galactic Center (compact sources = individual notes, extended clouds = evolving drone). iSonic sweeps map regions west to east, row by row: 51 US regions in 9 s (about 176 ms each). Sparse, musical, and each note is explainable.

### 3.4 Colour -> timbre or instrument

Two different cases:

- **Colour encodes a magnitude** (sequential or diverging colour bar): invert it to the data value, then pitch or brightness. Do not map hue to anything directly.
- **Colour encodes a category** (aerosol type, pollutant, land cover, data layer): colour class -> instrument.

Precedents: EyeMusic (column scan; height -> pitch; five colours as five instruments, for example white = choir, red = synthesised organ; black = silence); See ColOr (hue -> instrument timbre, saturation -> one of four notes, luminance -> bass or voice; details from search summaries only); NASA Goddard "Sounds of the Sea" (2022: red, green, blue ocean reflectance along a transect -> flute, harp, upright bass). Algorithm: RGB -> HSV, classify each pixel to the nearest legend colour, then per class compute coverage, centroid, mean intensity (02) and feed section 10 Design D.

### 3.5 Probe-based interactive sonification

Pointer, touch or arrow keys select a location; sound reports the local value now. iSonic's elements, tested with 7 blind users over 42 hours: values binned into 5 ranges on five violin pitches; other instruments when the pointer leaves the map or crosses a border; stereo pan for azimuth; an auditory legend on key L; a 3 x 3 numeric-keypad grid for recursive zoom; four detail levels (name only, sound only, name + sound, name + sound + spoken value). Users switched to pitch-only for fast trend scanning and to speech for exact values. Rule table: Design G.

### 3.6 Spatial audio

- Image x -> stereo pan (section 2.6). Robust, works on speakers.
- Image y or latitude -> **pitch**, not elevation. With generic head-related transfer functions (HRTF: filters that imitate how head and ears colour sound from each direction) azimuth resolution is good but elevation "is not satisfactory" (Zhao et al. 2008), and even real broadband sources give 3-6% front/back confusions (ch. 3). iSonic's extra elevation cue "did not improve performance".
- Longitude on a global map -> azimuth on a circle with Web Audio `PannerNode`, `panningModel = "HRTF"` ("convolution with measured impulse responses from human subjects"; default is "equalpower"). Set position with `panner.positionX.value` etc. (right-hand Cartesian coordinates). The listener faces -Z by default (`forwardZ` defaults to -1 in the specification), so a source at azimuth a (positive = to the right) at distance 1 is `positionX = sin(a)`, `positionZ = -cos(a)`; +60 degrees gives (0.866, 0, -0.5). In HRTF mode the node's parameters update once per audio block (k-rate). Headphones-only optional mode.
- Tones localise poorly (minimum audible angle is 1-2 degrees for broadband sound straight ahead, much larger for tones, ch. 3): give anything that must be located a noisy or harmonically rich timbre.

## 4. Time

### 4.1 Animation time -> musical time

`BPM = 60 * fps / frames_per_beat`. In the local crawl, 124 of 187 EIC frame directories are 30 fps, 42 are 60, 9 are 15, 7 are 12 (frame-rate token in the directory name).

| fps | frames per beat | BPM | 16th note |
|---|---|---|---|
| 30 | 15 | 120 | 3.75 frames |
| 30 | 16 | 112.5 | exactly 4 frames |
| 60 | 30 | 120 | 7.5 frames |
| 12 | 6 | 120 | 1.5 frames |

Prefer 16 frames per beat at 30 fps: every 16th note lands on a frame boundary. Make one bar a natural data period (a year, a day) so rhythm carries the calendar. If the animation is too fast for the ear (annual maps at 30 fps = 30 years per second), slow or step the video and say so in the legend. Still images: 5-15 s per scan (rule of thumb).

### 4.2 Keeping sound in sync with a playing video

There are two clocks: the video's (`video.currentTime`) and the audio hardware's (`AudioContext.currentTime`). JavaScript timers are a third, bad one: callbacks "can easily be skewed by tens of milliseconds or more" (Wilson, "A tale of two clocks"). Make the video the master.

- Continuous parameters: on every presented frame (`video.requestVideoFrameCallback`, whose metadata gives `mediaTime` and `presentedFrames`; Baseline since October 2024; fall back to `requestAnimationFrame` + `video.currentTime`), compute `i = floor(mediaTime * fps)`, read feature row i, call `param.setTargetAtTime(target, ctx.currentTime, tau)`.
- Note events: lookahead scheduling. A timer every 25 ms schedules, on the audio clock, every event in the next 100 ms (Wilson's starting values). Pattern below; its logic was tested in Node with mocked clocks (every event scheduled exactly once at the exact audio time, with the timer up to 90 ms late and playback rates 0.5, 1 and 2), but it was not run in a browser. Full version in 09-recipes-browser.md:

```js
setInterval(() => {
  const horizon = video.currentTime + 0.1 * video.playbackRate;
  while (next < events.length && events[next].t < horizon) {
    const when = ctx.currentTime + (events[next].t - video.currentTime) / video.playbackRate;
    trigger(events[next], Math.max(when, ctx.currentTime));   // osc.start(when), ramps at when
    next++;
  }
}, 25);
```

- On pause, seek or rate change: cancel scheduled values (`cancelScheduledValues`, `cancelAndHoldAtTime`), ramp master gain to 0 in 30 ms, recompute `next`.
- Output devices add delay (wireless headphones most of all): read `ctx.outputLatency` and give the user a manual audio/video offset slider (rule of thumb).
- Drive on-screen highlights from the audio clock (queue scheduled events, draw them when `ctx.currentTime` passes them); Tone.js offers `Tone.getDraw()` for this.
- Offline: an event at frame k starts at sample `round(k / fps * sr)`; sync is exact by construction.

### 4.3 Smoothing feature streams

**Zipper noise** is the audible staircase when a parameter jumps in coarse steps (features arrive only 30 times a second). A **click** is any discontinuity in the waveform or its amplitude.

- One-pole low-pass, also called exponential moving average: `y += a * (x - y)`, `a = 1 - exp(-dt / tau)`. With dt = 1/30 s and tau = 0.1 s, a = 0.283; the output covers 63% of a step after tau and 95% after 3 tau (measured: frames 3 and 9). In the browser `AudioParam.setTargetAtTime(target, t0, tau)` is this filter at audio rate: `v(t) = V1 + (V0 - V1) * exp(-(t - t0) / tau)`; the spec recommends it for smooth transitions. Tone.js: `param.rampTo(value, rampTime)`.
- Slew limiter: `y += clip(x - y, -max_step, +max_step)`; caps how fast pitch may move, so one bad frame cannot make a siren.
- Median of 3-5 frames before either: removes single-frame outliers (cuts, flashes, captions).
- Starting values for tau (rule of thumb): gain 20-50 ms; pitch and filter 50-200 ms; background-bed parameters 0.5-2 s. Too long hides real change: state tau in the documentation.
- Notes: ramp gain up over 5-20 ms and down over 20 ms or more; never set `gain.value` abruptly. `exponentialRampToValueAtTime` cannot start from or reach 0: use `setTargetAtTime(0, t, 0.02)`.
- numpy pitfall: for a changing frequency accumulate phase, `np.sin(2 * np.pi * np.cumsum(f_hz) / sr)`. `np.sin(2 * np.pi * f_hz * t)` with a varying f_hz gives wrong pitches.

## 5. Event-based sonification

For flashes (Lightning 5011), fires, new city lights. Pipeline:

1. Novelty signal per frame or per region: positive frame difference only, `max(0, cur - prev)`, summed or blob-detected (02).
2. Threshold with hysteresis: on above T_hi, off below T_lo < T_hi, so flicker near the threshold does not retrigger.
3. Peak picking: sample n is an event if it is the maximum of a small window, exceeds the local mean by delta, and is more than `wait` frames after the previous event (the three conditions of `librosa.util.peak_pick`, after Boeck et al. 2012).
4. Debounce or refractory period: `wait` = 3-5 frames at 30 fps (100-170 ms).
5. Rate limit: at most N hits per 16th-note slot (for example 8); above that, switch to a texture whose density follows the count (the Geiger-counter principle).
6. Velocity from peak height, in dB; pan from x; pitch from y band.

```python
def pick_events(x, delta=0.15, pre=3, post=3, avg=10, wait=5):
    out, last = [], -10**9
    for n in range(len(x)):
        a, b = max(0, n - pre), min(len(x), n + post + 1)
        m0, m1 = max(0, n - avg), min(len(x), n + avg + 1)
        if x[n] == x[a:b].max() and x[n] >= x[m0:m1].mean() + delta and n - last > wait:
            out.append(n); last = n
    return out
```

Measured: flashes at frames 20, 22, 60, 61, 62, 130 give events at 22, 60, 130 (near-simultaneous flashes merge into the strongest). The function looks `post` frames ahead, which is fine because the videos are pre-recorded and events are computed offline; for a live source set `post = 0` and shorten `avg`. Quantising events to a 16th-note grid is more musical but moves each by up to half a 16th (67 ms at 112.5 BPM): offer "exact" and "musical" modes and say which one the demo uses.

## 6. Texture-based methods

- **Granular synthesis**: many short windowed sound grains, 10-100 ms each (ch. 9). Controls: grains per second, grain length, grain pitch, pan scatter, level. Rate x length above 2 gives a continuous texture; below 1, separate ticks. Grains can be synthesised (a Hann-windowed sine burst), so no sample is needed. Map flow speed -> grain rate, temperature -> grain pitch, coverage -> level. Cook: granular models "lend themselves well to continuous interactive auditory displays".
- **Filtered noise**: white noise through a band-pass filter (centre frequency, Q = sharpness). Speed -> centre frequency 200-3000 Hz (exponential); turbulence (variance of flow) -> depth of a slow wobble. Wind and surf need no samples. Without scipy: zero unwanted bins of `np.fft.rfft(noise)` and inverse-transform, block by block.
- **Additive or spectral resynthesis**: K harmonics of one fundamental whose amplitudes follow a K-bin profile (zonal means, hue histogram, radial profile). Harmonic partials fuse into a single vowel-like timbre, so the listener hears the profile's shape as a colour; fine for "shape", poor for exact values.

## 7. Audification: why not, and the one exception

Audification plays the data itself as the waveform. A frame is not a waveform: a 1920-pixel row lasts 44 ms at 44.1 kHz and pixel rows are not wave-like, so you hear a buzz whose pitch is set by the image width (section 3.2). The Handbook's preconditions are a wave-like 1-D series with thousands of samples. The one place it can apply: a long per-pixel or per-region time series across a whole frame set. The largest crawled frame set has 19,001 frames (median 1,176): 19,001 samples last 0.43 s at 44.1 kHz or 2.4 s at 8 kHz, and a cycle that repeats every P frames is heard at `playback_rate / P` Hz (a 365-frame annual cycle at 8 kHz = 22 Hz, a rumble). Verdict: skip. If you want the flavour, use the mean cycle as a wavetable (section 3.2).

## 8. Synthesis building blocks

| Block | What it is | Web Audio | Tone.js (15.1.22) | numpy |
|---|---|---|---|---|
| Oscillator | Repeating waveform at a frequency. Sine = one frequency; sawtooth and square add harmonics (brighter) | `OscillatorNode` (type sine, square, sawtooth, triangle, custom; `frequency`, `detune` in cents) | `Tone.Oscillator`, `Tone.OmniOscillator` | `np.sin(2*np.pi*np.cumsum(f)/sr)` |
| Envelope (ADSR) | Loudness shape of a note: attack time, decay time, sustain level, release time | `GainNode` + `gain.linearRampToValueAtTime`, `setTargetAtTime` | `Tone.AmplitudeEnvelope` (built into `Tone.Synth`) | `np.interp` over breakpoints, multiply |
| Filter | Removes part of the spectrum; low-pass cut-off is the brightness knob | `BiquadFilterNode` (lowpass, bandpass, ...; `frequency`, `Q`) | `Tone.Filter` (rolloff -12, -24, -48), `Tone.OnePoleFilter` | one-pole loop, or FFT masking; `scipy.signal.butter` + `sosfilt` if scipy is available (not installed here) |
| LFO | Slow oscillator (below about 20 Hz) that moves a parameter: tremolo (gain), vibrato (pitch), sweep (cut-off) | `OscillatorNode` -> `GainNode` (depth) -> any `AudioParam` | `Tone.LFO`, `Tone.Tremolo`, `Tone.Vibrato`, `Tone.AutoFilter` | add or multiply a slow sine |
| FM | Modulator oscillator added to the carrier's frequency; index sets brightness | modulator -> `GainNode` (gain = I * fm, in Hz) -> `carrier.frequency` | `Tone.FMSynth` (`harmonicity`, `modulationIndex`) | `np.sin(2*np.pi*fc*t + I*np.sin(2*np.pi*fm*t))` |
| Additive | Sum of sine partials with separate levels | several oscillators, or `createPeriodicWave(real, imag)` | `oscillator.partials = [...]` | vectorised sum, or `np.fft.irfft` |
| Noise | Random samples; white = flat spectrum, pink and brown = darker | looped `AudioBufferSourceNode` filled with random numbers | `Tone.Noise` ("white", "pink", "brown"), `Tone.NoiseSynth` | `np.random.default_rng(0).standard_normal(n)` |
| Delay | Repeats the signal later; feedback gives echoes | `DelayNode` (`delayTime`) + feedback `GainNode` | `Tone.FeedbackDelay`, `Tone.PingPongDelay` | `y[d:] += g * x[:-d]` |
| Reverb | Dense echoes of a room; wet/dry mix reads as distance | `ConvolverNode` with an impulse response (can be generated decaying noise, no file) | `Tone.Reverb` (generated decaying noise; wait for `ready`), `Tone.Freeverb` | convolve with `noise * exp(-6.9 * t / T)` via FFT |
| Panner | Places sound left-right or in 3-D | `StereoPannerNode` (`pan`), `PannerNode` (HRTF) | `Tone.Panner`, `Tone.Panner3D` | cos/sin gains into a 2-column array |
| Granular | Section 6 | `AudioBufferSourceNode.start(when, offset, duration)` repeatedly | `Tone.GrainPlayer` (`grainSize`, `overlap`, `detune`, `playbackRate`) | overlap-add windowed slices |
| Percussion | Pitch-swept sine (kick, tom), filtered noise burst (hat, snare) | oscillator + fast pitch and gain ramps | `Tone.MembraneSynth`, `Tone.MetalSynth`, `Tone.NoiseSynth` | exponential chirp x decay |
| Limiter | Prevents clipping when streams add up | `DynamicsCompressorNode` | `Tone.Limiter` | divide by peak, or `np.tanh` |

Helpers confirmed in the Tone.js 15.1.22 docs: `Tone.mtof(midi)`, `Tone.dbToGain(db)`, `Tone.getTransport()`, `Tone.getDraw()`, `Tone.now()`, `Tone.start()`, `param.rampTo(value, rampTime = 0.1)`. Note `Tone.Scale` rescales a signal; it is not a musical scale.

```js
const midiToHz = m => 440 * 2 ** ((m - 69) / 12);
const dbToGain = db => 10 ** (db / 20);
const norm = (x, lo, hi) => Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
osc.frequency.setTargetAtTime(midiToHz(48 + 36 * norm(value, lo, hi)), ctx.currentTime, 0.08);
```

## 9. Perceptual and accessibility design rules

| Rule | Number | Basis |
|---|---|---|
| Keep the data voice in a comfortable register | MIDI 48-84; never outside 35-100 | Brown et al. 2003; ch. 3 |
| Discrete levels need a margin over the JND | 1 semitone or more in pitch; 3 dB or more in level; 20% or more in duration | JNDs in ch. 3 and UNSW; margins are rule of thumb |
| Give the ear an axis | Legend tones for lowest and highest value before playback; ticks at twice the data rate act as minor ticks | Smith and Walker 2005 via ch. 2: a reference tone for the maximum gave "dramatic improvements", one for the starting value did not |
| Baseline drone | Sustained, -18 dB, dull timbre, at the baseline's pitch | Our extension of the reference-tone result (test it) |
| Separate streams by timbre and position, not pitch alone | 3 streams at most; pan them apart | ch. 2 (auditory streaming), Brown et al. |
| Redundancy | Key variable on pitch + brightness, moving the same way | One-to-many mapping (ch. 15); Neuhoff et al. 2002 |
| Musical timbres over sine waves | Harmonic-rich tone; lets small speakers convey low notes via the missing fundamental | Brown et al. ("easier to perceive, and more pleasant"); ch. 3 |
| Masking: a loud sound hides quieter ones near it in frequency | Bed 12-18 dB below the lead and in another register | ch. 3 concept; numbers rule of thumb |
| Avoid fatigue | No sustained energy around 2-5 kHz (hearing is most sensitive near 4 kHz); silence between phrases; pieces of 30-90 s; user volume and speed controls | ch. 3; durations rule of thumb |
| Offer exact and musical modes | Glide (exact) or scale-snapped | ch. 2 (rounding versus exact scaling) |
| Speech and sound levels | Name only; sound only; name + sound; name + sound + value | iSonic |
| Announce polarity, then test it | "Higher note = warmer" in the legend; ask listeners which way they expected | Walker and Mauney 2010: split polarities need training or another mapping |

Listening-test tasks that fall out of these mappings (protocol in 07-accessibility-and-listening-tests.md): which of two clips is the warmer decade (pitch against drone); count the flashes; which side had more events (pan); find the maximum region with the probe.

## 10. Beyond the naive scan: seven mapping designs

Features named here come from 02. "Legend range" = the colour bar's printed minimum and maximum, else p2..p98 over all frames.

### Design A: value against a reference drone (animated global fields, for example SST anomaly 5176, temperature anomalies 5207, CO2 5115)

| Input feature | Input range | Scaling | Output parameter | Output range | Why a listener can decode it |
|---|---|---|---|---|---|
| Area-weighted mean value of a region (colour bar inverted) | Legend range | Linear | Lead pitch, glide tau 80 ms | MIDI 48-84 | Hotter = higher chosen by 10 of 11 blind listeners; 36 semitones is far above the JND |
| Baseline (zero anomaly, or legend midpoint) | Constant | none | Drone pitch, sustained, -18 dB, low-pass 800 Hz | The note the baseline maps to | Lead above or below the drone = sign; size of the interval = magnitude |
| Same value (redundant) | Same | Exponential | Lead low-pass cut-off | 500-5000 Hz | Brighter = more; congruent with pitch |
| Time step (month, year) | Integer | none | Tick at -24 dB, accented every 10th | none | Audio x-axis ticks |

Example: legend -3 to +3 degrees C -> baseline 0 = MIDI 66; +1.5 degrees C = MIDI 75, nine semitones above the drone.

### Design B: zonal arpeggio and chord (Zonal Climate Anomalies 5209, whose 8 latitude bands run 90N-64N down to 64S-90S, baseline 1951-1980; or any global map averaged in latitude bands)

| Input feature | Input range | Scaling | Output parameter | Output range | Why a listener can decode it |
|---|---|---|---|---|---|
| Band index, south to north | 1..8 | Step | Position in an 8-note run, 60 ms apart | 480 ms per run | Order = latitude; sequential comparison works better than 8 simultaneous voices |
| Band anomaly | Legend range, symmetric about 0 | Linear | Note pitch, same scale for all bands | MIDI 54-78, drone at 66 | The run's contour is the latitude profile: rising = warmer toward the north |
| Year | Data years | Step | One run per year (or per 5 years), then a rest | Bar length | One bar = one time step |
| Decade boundary | none | none | Earcon, optional spoken decade | none | Time anchor |

Chord variant for a gist: hold the 8 notes together. In the baseline period they sit near unison; as bands diverge the chord widens, and its width is the spread between latitudes.

### Design C: anomaly-driven dissonance (overlay on A or B; diverging colour maps such as Night Lights change 5313, purple = more light, orange = less)

| Input feature | Input range | Scaling | Output parameter | Output range | Why a listener can decode it |
|---|---|---|---|---|---|
| Mean absolute anomaly over the region | 0..p98 | Linear | Detune of a second oscillator against the lead | 0-35 cents (beats at 0-4.5 Hz for a 220 Hz note, 0-9 Hz for 440 Hz) | Two close tones beat at their frequency difference (measured: 220 + 223 Hz beats at 3 Hz); still tone = normal, faster tremor = more abnormal |
| Sign of the anomaly | - / + | Step | Carried by Design A's pitch relative to the drone | none | Direction and magnitude on separate cues |

Variant: choose the accompaniment chord by anomaly class (4 ordered levels). It is an artistic ruleset that needs training; label it as such.

### Design D: one instrument per data layer (categorical multi-layer visuals: GEOS Aerosols 5669, Air Quality Model Runs 5533 with PM2.5, O3, CO, NOx; tagged CO2 5110)

| Input feature | Input range | Scaling | Output parameter | Output range | Why a listener can decode it |
|---|---|---|---|---|---|
| Layer id (colour class from the legend, 4 at most) | Categorical | Step | Instrument | For example FM bell, filtered-noise breath, plucked tone, low pad | Timbre is the identity channel; unlike timbres stay separate streams |
| Layer amount (pixel fraction x mean intensity) | 0..p98, silent under 1% | Exponential | Note rate | 0.5-8 notes per second | Density reads as "how much" without relying on loudness |
| Layer centroid x | 0..W | Linear | Pan | -0.8..+0.8 | Where it is, left to right |
| Layer centroid y | 0..H, top = high | Linear | Pitch around the layer's home note | plus or minus 7 semitones | Up = higher, the usual image convention |
| Keys 1-4 | none | none | Solo or mute a layer | none | Lets users change the salience of each series (Brown et al.) |

### Design E: flash -> percussion (Lightning 5011; fires; new lights)

| Input feature | Input range | Scaling | Output parameter | Output range | Why a listener can decode it |
|---|---|---|---|---|---|
| New bright blob (section 5) | Jump above local mean + delta; refractory 3-5 frames | Threshold + peak pick | One percussive hit | none | One event, one sound |
| Blob x | 0..W | Linear | Pan | -0.9..+0.9 | East-west position |
| Blob latitude | 5 bands | Step | Drum pitch | 5 pentatonic notes, north = high | Coarse north-south position |
| Blob area or peak brightness | p2..p98 | Linear in dB | Velocity and decay | -18..-3 dB; 60-250 ms | Bigger = louder and longer (congruent pair) |
| Events in one slot above cap (8) | Count | Exponential | Grain rate of a rattle texture | 8-40 per second | Geiger-counter principle; avoids overload |

Fidelity note: the 5011 animation accumulates events over a 10-day roving window, so one visible flash is a window of detections. Say so in the legend.

### Design F: flow speed -> rhythmic density and texture (Sea Surface Currents 3912, Perpetual Ocean 2 5425, Atmospheric River 4960, wind 5148)

| Input feature | Input range | Scaling | Output parameter | Output range | Why a listener can decode it |
|---|---|---|---|---|---|
| Mean flow speed in a region (optical-flow magnitude) | 0..p98 | Exponential | Arpeggio or grain rate | 1-16 per second | Faster flow = faster rhythm: near-unanimous polarity, assessed good in the literature |
| Same (redundant) | Same | Exponential | Band-pass centre of a noise bed | 200-3000 Hz | A higher whoosh, like wind |
| Colour of the flow = temperature (3912 colours flows by sea surface temperature) | Legend range | Linear | Pitch of the arpeggio notes | MIDI 48-84 | As Design A |
| East-west component of mean direction | -1..+1 | Linear | Direction and speed of a pan sweep | Left-to-right for eastward | Motion heard as motion |
| Depth class (5425: white = above 600 m, blue-cyan = deeper) | 2 classes | Step | Reverb mix and low-pass | 10% and 6 kHz; 45% and 1.5 kHz | Deeper = more distant and duller |

### Design G: probe for BVI exploration (any static map: GEDI Forest Height 4950, aerosols still, change maps)

| Input feature | Input range | Scaling | Output parameter | Output range | Why a listener can decode it |
|---|---|---|---|---|---|
| Value under the pointer (value grid) | Legend range | Linear | Continuous tone pitch | MIDI 48-84 (same legend as A) | One legend for the whole product |
| Pointer x | 0..W | Linear | Pan | -0.8..+0.8 | Matches hand position |
| Border or coast crossed; pointer off the data | Event | none | Two distinct earcons; soft noise when off-map | none | iSonic's border and outside-map sounds |
| Local gradient magnitude | 0..p98 | Linear | Vibrato depth | 0-30 cents | Fronts and edges feel "rough" |
| Key L; keys 1-9; key 0 | none | none | Audio legend; 3 x 3 recursive zoom; sweep of the current region (west to east, row by row) | Sweep of about 9 s | iSonic interaction set, tested with blind users |

## 11. Algorithm chooser

| Visualization type | EIC examples (SVS id) | Recommended technique | Avoid |
|---|---|---|---|
| Static map | 4950, 5669, 5121 | Probe (G) + region sweep; sparse musical scan as a preview | Dense inverse-spectrogram scan as the main view |
| Animated global field | 5176, 5207, 5115 | Regional or zonal means -> A or B, with C as overlay | Per-frame normalisation |
| Flows and currents | 3912, 5425, 5148 | F: speed -> rate + filtered noise or grains | One pitch per pixel |
| Discrete events | 5011, 5113 | E: peak picking -> percussion, density fallback | Continuous tones |
| Multi-layer categorical | 5669, 5533, 5110 | D: instrument per layer, rate = amount | More than 4 layers at once |
| 3-D fly-through | 5196 (orbiting globe), 4960, 4685 | Frame-wide statistics (coverage, mean intensity) -> A or D; screen x -> pan | Claiming a geographic mapping: the camera moves, so pixels are not fixed places |
| Line charts and plots | 5191, 5126, 5072 | Classic auditory graph: y -> pitch, ticks, reference tones | Anything fancier |

## 12. Key literature

- The Sonification Handbook (Hermann, Hunt, Neuhoff, eds., Logos, Berlin, 2011, 586 pages, free PDFs). Read ch. 15 (parameter mapping), ch. 2 (theory, polarity, context) and ch. 9 (synthesis) first.
- Kramer et al. (1999), Sonification Report: definition and research agenda.
- Hermann (2008): the four-condition definition.
- Dubus and Bresin (2013), PLoS ONE: which mappings 60 projects used, and how rarely they were tested.
- Walker (2002); Walker and Mauney (2010): polarity and scaling, sighted and blind.
- Brown et al. (2003): guidelines for audio graphs and tables for BVI users.
- Zhao et al. (2008), iSonic: interactive sonification of georeferenced data with blind users.
- Yeo and Berger (2005): scanning versus probing framework for images.
- Meijer (1992), The vOICe: the canonical image-to-sound scan.
- Enge et al. (2024): state-of-the-art report on combining sonification and visualization (CC BY 4.0).
- Zanella et al. (2022), Nature Astronomy: survey of nearly 100 astronomy sonification projects.
- Arcand et al. (2024), Frontiers in Communication: 3,184 sighted and BVI participants responded positively to NASA sonifications.

## Open questions / unverified

- Walker (2002), Smith and Walker (2005), Flowers (2005) and Neuhoff et al. (2002) were not opened; their findings are taken from Handbook ch. 2 and ch. 15, Walker and Mauney (2010), Walker's dissertation summary page, and (for the Neuhoff pitch-loudness interaction) a search summary of an APA press release whose URL returned HTTP 404 today.
- Dubus and Bresin table figures and Enge et al. counts were extracted by an automated reader from long pages; re-check before quoting in the submission.
- The Handbook's exact licence (a search summary says CC BY-NC-ND) was not seen on the page.
- See ColOr's hue-to-instrument table and EyeMusic's musical scale were not confirmed (papers not opened or silent on it).
- The vOICe's default frequency range was not confirmed; its documentation says the lowest and highest frequency are user parameters.
- Not verified today: fusion threshold of 16-20 events per second; laptop-speaker low-frequency limit; the 3-5 level estimates for loudness and brightness; all "rule of thumb" numbers; the Plomp-Levelt roughness peak (only Sethares' qualitative description was read).
- Whether `requestVideoFrameCallback` fires for cross-origin SVS video without CORS (it exposes only timing metadata, so it should): test in the browser.
- The HRTF placement formula in section 3.6 follows from the specification's default listener orientation; it was checked numerically but not listened to in a browser.
- No evidence was found for the polarity of pitch -> gas or aerosol concentration. Ask your listeners.
- The drone-at-baseline idea extends a result about maximum-value reference tones; it is untested.
- Actual colour-bar ranges and aerosol legend colours of the EIC visuals were not read here (see 02); Design A's -3..+3 is an example.
- The JavaScript scheduler snippet was tested only with mocked clocks in Node (`sched_test.js` next to `checks.py`), not in a browser; the numpy snippets and all "measured" numbers were run today.
- Length: this file is about twice the 2,000-4,000 word guideline because the brief required rule tables, a building-block table and a chooser; sections 6, 7 and 12 are the first candidates to cut.

## Sources

- The Sonification Handbook, home - https://sonification.de/handbook/ - citation, open access
- Handbook chapter index - https://sonification.de/handbook/chapters/ - chapter titles, authors, PDF links
- Handbook ch. 2, Theory of Sonification (Walker, Nees) - https://sonification.de/handbook/download/TheSonificationHandbook-chapter2.pdf - technique definitions, polarity, scaling, MIDI 35-100, context cues, streaming
- Handbook ch. 3, Psychoacoustics (Carlile) - https://sonification.de/handbook/download/TheSonificationHandbook-chapter3.pdf - frequency and duration JNDs, 4 kHz sensitivity, equal loudness, melody limit, localisation errors
- Handbook ch. 9, Sound Synthesis for Auditory Display (Cook) - https://sonification.de/handbook/download/TheSonificationHandbook-chapter9.pdf - ADSR, FM and Carson's rule, granular grain length
- Handbook ch. 12, Audification (Dombois, Eckel) - https://sonification.de/handbook/download/TheSonificationHandbook-chapter12.pdf - definition and preconditions
- Handbook ch. 13 and 14, Auditory Icons; Earcons - https://sonification.de/handbook/download/TheSonificationHandbook-chapter13.pdf and https://sonification.de/handbook/download/TheSonificationHandbook-chapter14.pdf - listed for follow-up, not read
- Handbook ch. 15, Parameter Mapping Sonification (Grond, Berger) - https://sonification.de/handbook/download/TheSonificationHandbook-chapter15.pdf - transfer function, quantiles, loudness verdict, one-to-many mapping, Flowers summary
- Handbook ch. 16, Model-Based Sonification (Hermann) - https://sonification.de/handbook/download/TheSonificationHandbook-chapter16.pdf - definition
- Sonification Report (Kramer et al.) - https://www.icad.org/websiteV2.0/References/nsf.html - definition of sonification
- Sonification, a definition (Hermann) - https://sonification.de/?p=39 - four conditions
- Dubus and Bresin 2013 - https://pmc.ncbi.nlm.nih.gov/articles/PMC3866150/ - mapping frequencies, evaluation rate
- Enge et al. 2024 - https://arxiv.org/abs/2402.16558v2 (abstract) and https://arxiv.org/html/2402.16558v2 (full text) - 57 papers, 53 parameter mapping, pitch 47, timbre 21, 20 without evaluation, CC BY 4.0
- Zanella et al. 2022 - https://arxiv.org/abs/2206.13536 - nearly 100 projects (DOI 10.1038/s41550-022-01721-z)
- Arcand et al. 2024 - https://arxiv.org/abs/2403.18082 (abstract read; journal version https://www.frontiersin.org/articles/10.3389/fcomm.2024.1288896) - 3,184 sighted and BVI respondents, self-reported learning gains and positive responses
- Walker and Mauney 2010 - https://wirelessrerc.gatech.edu/sites/default/files/publications/walker_et_al_-_a_comparison_of_sonification_mappings.pdf - polarity and slope tables, stimuli, correlations
- Walker 2002 - https://pubmed.ncbi.nlm.nih.gov/12570096/ - citation only (page not readable)
- Bruce Walker's Ph.D. dissertation research (summary page) - https://sonify.psych.gatech.edu/walkerb/research/phd/index.html - magnitude-estimation method, data dimensions tested, polarity unanimity as a measure of mapping effectiveness
- Neuhoff, Kramer, Wayand 2002, repository record - https://repository.gatech.edu/entities/publication/b42c37f0-ff76-47b9-833e-24b977198d26 - pitch and loudness interaction, via search summary only (this page blocked our fetch, and the APA press-release URL https://www.eurekalert.org/pub_releases/2002-03/apa-dte032602.php returned HTTP 404 today)
- Brown et al. 2003 - https://eprints.gla.ac.uk/3196/1/Brown_Guidelines_final.pdf - MIDI 35-100, musical timbres, 50-70 ms, panning, two and three series
- Flowers 2005 - https://digitalcommons.unl.edu/psychfacpub/430 - not opened
- Zhao et al. 2008 (iSonic) - https://www.cs.umd.edu/users/ben/papers/Zhao2008Data.pdf - five pitches, panning, legend, sweep timing, keypad zoom, HRTF remarks, user behaviour
- Yeo and Berger 2005 - https://ccrma.stanford.edu/~woony/publications/Yeo_Berger-ICAD05.pdf - scanning versus probing, inverse spectrogram
- Yeo and Berger, raster scanning - https://ccrma.stanford.edu/~woony/research/raster/ - line-by-line mapping between 1-D and 2-D, suited to image texture
- Meijer 1992 abstract - https://www.seeingwithsound.com/abstract.htm - citation, 64 x 64, 16 grey levels
- The vOICe mapping page - https://www.seeingwithsound.com/im2sound.htm - row oscillators, frequency distributions
- The vOICe hardware section - https://www.seeingwithsound.com/vbme5.html - 1.05 s and 2.10 s conversion times
- Levy-Tzedek et al. 2014 (EyeMusic) - https://pmc.ncbi.nlm.nih.gov/articles/PMC4227506 - colour to instrument, 40 x 24
- See ColOr (EURASIP Journal on Image and Video Processing 2007, article 76204; author order not confirmed) - https://link.springer.com/article/10.1155/2007/76204 - not readable (login redirect); mapping taken from a search summary only
- Chandra, A Universe of Sound - https://chandra.si.edu/sound/ - project, credits
- Chandra Galactic Center sonification - https://chandra.si.edu/sound/gcenter.html - scan direction, pitch, volume, notes versus drone
- SVS 13786, Data Sonification: Caldwell 73 - https://svs.gsfc.nasa.gov/13786/ - radar scan, radius to pitch, colour to instrument (confirmed on the live page today; same text in the local SVS API crawl)
- NASA, Sounds of the Sea - https://www.nasa.gov/science-research/earth-science/sounds-of-the-sea - colour channels to notes, 8 June 2022
- NASA Ocean Color gallery 781 - https://oceandata.sci.gsfc.nasa.gov/gallery/781/ - red, green, blue to flute, harp, upright bass
- ARSS - https://arss.sourceforge.net/ and https://sourceforge.net/projects/arss/ - sine and noise synthesis from image rows, log scale, GPLv2
- Photosounder - https://photosounder.com/ - commercial, 59 USD
- librosa.griffinlim - https://librosa.org/doc/0.10.2/generated/librosa.griffinlim.html - defaults n_iter = 32, momentum = 0.99, random initial phase (the /doc/main/ URL returned HTTP 404 today)
- librosa.util.peak_pick - https://librosa.org/doc/0.10.2/generated/librosa.util.peak_pick.html - three peak conditions
- Web Audio API specification - https://webaudio.github.io/web-audio-api/ - panning algorithm, setTargetAtTime formula, panning and distance models, oscillator and filter types, PeriodicWave
- MDN setTargetAtTime - https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime - time-constant table
- MDN PannerNode - https://developer.mozilla.org/en-US/docs/Web/API/PannerNode - properties, coordinates
- MDN requestVideoFrameCallback - https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback - metadata, Baseline 2024
- MDN node pages - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API - OscillatorNode, BiquadFilterNode, StereoPannerNode, ConvolverNode, DelayNode, AudioBufferSourceNode (pages exist)
- A tale of two clocks (Wilson) - https://web.dev/articles/audio-scheduling - 25 ms and 100 ms lookahead, timer jitter, visual queue
- Tone.js docs 15.1.22 - https://tonejs.github.io/docs/15.1.22/classes/FMSynth.html - class names and parameters (same path pattern for the other classes)
- Tone.js licence - https://raw.githubusercontent.com/Tonejs/Tone.js/dev/LICENSE.md - MIT
- npm registry, tone - https://registry.npmjs.org/tone/latest - version 15.1.22
- UNSW, note names and MIDI numbers - https://newt.phys.unsw.edu.au/jw/notes.html - MIDI formula
- UNSW, what is a decibel - https://www.animations.physics.unsw.edu.au/jw/dB.htm - dB formulas, 10 dB doubling, 1 dB JND
- Sethares, Relating Tuning and Timbre - https://sethares.engr.wisc.edu/consemi.html - dissonance of two tones rises then falls
- numpy.interp - https://numpy.org/doc/stable/reference/generated/numpy.interp.html - envelope interpolation
- numpy.fft.irfft - https://numpy.org/doc/stable/reference/generated/numpy.fft.irfft.html - inverse FFT
- Python wave module - https://docs.python.org/3/library/wave.html - WAV writing without scipy
- scipy.signal.butter - https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.butter.html - optional filter design
- Challenge resource pages - https://svs.gsfc.nasa.gov/5011/ , https://svs.gsfc.nasa.gov/5313/ , https://svs.gsfc.nasa.gov/5425/ , https://svs.gsfc.nasa.gov/5669/ , https://svs.gsfc.nasa.gov/5533/ , https://svs.gsfc.nasa.gov/4950/ - visual descriptions (read from the local crawl of the SVS API: pages.json, framesets.json)
