# 04 - Making it musical without lying about the data

> Status: researched 2026-11-14 with live sources by its author. The independent fact-check pass did NOT complete (see README.md). Treat licence, citation and version claims as unconfirmed until you open the cited source.

Scope: how to turn a correct-but-ugly frame sonification into music for the Earth Information Jukebox. Assumes per-frame features already exist (02-frame-analysis-algorithms.md) and that basic mapping and synthesis are covered (03-sonification-mapping-and-synthesis.md). Full programs: 08-recipes-python.md, 09-recipes-browser.md. Tags: "(unverified)" = not confirmed on a live page today; "convention" = standard music practice, not a measured fact; "(tested)" = the snippet's logic was run under Node v24 with assertions. No audio was rendered or listened to while writing this file: every recipe needs ear-tuning.

Words used before they get their own section: **timbre** = the tone colour that makes a flute and a trumpet differ on the same note; **velocity** = how hard a note is struck (0-127 in MIDI, 0-1 in Tone.js), heard as loudness; **envelope** = how a note's level evolves (attack = fade-in time, release = fade-out time); **legato / staccato** = notes held into each other / cut short; **filter cutoff** = the frequency above which a lowpass filter removes sound (lower = duller); **drone** = one long held note or fifth; **pad** = slow, soft sustained chords; **portamento** = gliding between notes; **hysteresis** = switching only after the value has moved clearly past a boundary, as a thermostat does; **valence / arousal** = unpleasant-to-pleasant / calm-to-excited, the two axes used to describe perceived emotion; **true peak (dBTP)** = the highest level of the reconstructed waveform, including between samples; **chromagram** = a recording reduced to how strongly each of the 12 pitch classes sounds over time.

## TL;DR

- "Musical" means five constraints added on top of a correct mapping: a **scale** (which pitches are allowed), a **beat grid** (when notes may start), **roles** (bass, pad, lead, percussion: each owns one data feature and one register), a **form** (legend, data, ending) and a **mix** (levels, reverb, limiter). None of them has to change what the data says.
- Default pitch rule: normalise the feature to 0..1, map it to a **scale degree** of a pentatonic scale, add **hysteresis** so noise cannot make the note flicker. Any two notes of a pentatonic scale are 2, 3, 4 or 5 semitones apart (never a semitone or a tritone), so arbitrary data cannot clash. Cost: three octaves of pentatonic = 16 distinct levels. Carry finer detail on a continuous parameter (filter brightness) and keep a raw A/B mode.
- Default rhythm rule: density feature -> number of onsets `k` in a 16-step bar via the **Euclidean (Bjorklund) algorithm**; discrete events (lightning) snap to the nearest 16th note and their count goes to loudness.
- Colour: hue -> pitch has no scientific basis. In EIC frames colour is a colour bar or a category label, so decode it first, then map value -> pitch or brightness and class -> instrument or chord root.
- Emotion: mode (major/minor) and tempo are the strongest cues for perceived emotion (Eerola et al. 2013). Fix them per preset and disclose them as artistic constants; let urgency come only from data-driven cues (note density, loudness, brightness, dissonance). Constant input must sound calm.
- A sonification must be systematic and reproducible (Hermann 2008): seed every random choice; the same frames must give the same music.
- Use Tone.js 15.1.22 (MIT) synths only. Skip this weekend: AI music models, embedding Strudel (AGPL), TidalCycles, SCAMP (GPL), cellular automata, L-systems.

## Decisions for the Jukebox build

Ranked; what I would do in your place.

1. **One engine, presets as data.** `features.json` (precomputed per frame, because a page on your origin cannot read SVS pixels or call the SVS API) -> mapping table -> four role tracks -> master chain. A preset is a JSON object: scale, root, BPM, instruments, rule table. Reason: every preset reuses the same quantiser, Euclid function and mixer. Trade-off: less bespoke sound per visual.
2. **Build the A/B toggle and the audio legend before polishing sound.** "Raw" (one continuous sine per variable, no scale, no reverb) versus "Musical", same data, same timing; plus a 5-second legend that plays the lowest and highest possible note and each instrument alone. Reason: this is what separates you from the naive pixel-to-pitch entries, and it is what the Validity criterion and blind and low-vision (BVI) listeners need. Trade-off: about 3 hours not spent on presets.
3. **Lead voice = the key variable, snapped to the scale, never to the current chord.** A fixed note set makes the mapping monotone: a rise in the data is never a fall in pitch. Accompaniment layers may snap to chord tones.
4. **Pentatonic by default.** Use a 7-note mode only when you need more resolution or want one "colour" note reserved as a data signal.
5. **Fixed tempo locked to the video; change density, not tempo.** Bar length = 240 / BPM seconds. Pick BPM so one meaningful unit (a year, a model day, a longitude band) is one bar.
6. **Dissonance and loudness peaks come only from data** (anomaly -> tension ladder, section 1.5). Mode and tempo are written in the mapping table as "artistic constant".
7. **Synths, not samples**, unless 01-where-the-sounds-come-from.md or 05-tools-and-libraries.md gives you a sample set with a confirmed licence (one confirmed for this file: the samples bundled with Sonic Pi are CC0). Reason: nothing extra to license or credit. Trade-off: listeners in NASA's own study preferred instrumental timbres to synthetic ones (Arcand et al. 2024), so shape the synths to be instrument-like (plucks, mallets, soft pads) and avoid raw sawtooth buzz.
8. **Three finished presets beat five half-done.** Order: Lightning (events; easiest and most striking), Aerosols (four tracks show the roles idea), Sea surface temperature (continuous; prettiest). Then CO2, then Night lights.
9. **Skip**: AI music generators (section 10), embedding Strudel in the app (AGPL-3.0-or-later would relicense your code; prototyping patterns at strudel.cc is fine), TidalCycles and SuperCollider, SCAMP (GPL-3.0-only), Markov, cellular-automaton and L-system melodies (they add notes that are not data).

## 1. Music theory for programmers

### 1.1 Notes are integers

- MIDI note number `m` is an integer 0..127. `m = 69` is A4 = 440 Hz; `m = 60` is C4 (middle C, 261.63 Hz). Frequency: `f = 440 * 2 ** ((m - 69) / 12)`. In Tone.js: `Tone.mtof(69) // 440`, `Tone.Frequency("C3").toMidi()`.
- Semitone = +1 (frequency x 1.0595). Octave = +12 (frequency x 2). Notes an octave apart sound like the same note, so `m % 12` is the **pitch class** (0 C, 1 C#, 2 D, 3 D#, 4 E, 5 F, 6 F#, 7 G, 8 G#, 9 A, 10 A#, 11 B) and `Math.floor(m / 12) - 1` is the octave number.
- Interval = difference in semitones between two notes.

| Semitones | Name | Played together (convention) |
|---|---|---|
| 0, 12 | unison, octave | blends completely |
| 7 | perfect fifth (ratio about 3:2) | hollow, stable |
| 5 | perfect fourth (about 4:3) | stable, open |
| 4, 3 | major third, minor third | sweet; decides major versus minor |
| 9, 8 | major sixth, minor sixth | sweet, wider |
| 2, 10 | major second, minor seventh | mild tension |
| 1, 11 | minor second, major seventh | harsh, beating |
| 6 | tritone | unstable |

### 1.2 Scales and modes

A scale is the subset of the 12 pitch classes you allow, written as semitone offsets from a root. These lists match the interval tables in the tonal library's source.

| Scale | Offsets from root | Typical use (convention) |
|---|---|---|
| major pentatonic | 0 2 4 7 9 | default; open, cannot clash |
| minor pentatonic | 0 3 5 7 10 | darker default; same property |
| major (ionian) | 0 2 4 5 7 9 11 | bright, familiar |
| natural minor (aeolian) | 0 2 3 5 7 8 10 | dark, serious |
| dorian | 0 2 3 5 7 9 10 | minor with a raised 6th: sober, not tragic |
| lydian | 0 2 4 6 7 9 11 | major with a raised 4th: floating |
| harmonic minor | 0 2 3 5 7 8 11 | tense; 3-semitone gap between 8 and 11 |
| whole-tone | 0 2 4 6 8 10 | no tonal centre: ambiguous, dreamlike |

- **Why pentatonic rarely clashes (computed, tested):** the distances between any two notes of either pentatonic scale, folded into one octave, are only 2, 3, 4 or 5 semitones. The major scale also contains 1 (E-F, B-C) and 6 (F-B); the whole-tone scale contains 6. So in a pentatonic scale any notes may sound together or in any order.
- **Mode as a dial (tested):** in the order lydian, major, mixolydian (0 2 4 5 7 9 10), dorian, natural minor, phrygian (0 1 3 5 7 8 10), locrian (0 1 3 5 6 8 10), each step lowers exactly one note by one semitone. A variable can darken the scale one note at a time. Do this only if "darker" is a fair reading of that variable (section 7).
- **Scale degree** = index into the scale list; degree `d` -> MIDI is `root + 12 * floor(d / n) + scale[d mod n]` (code in section 2).

### 1.3 Chords, progressions, voice leading

- A chord is several notes at once. Build one by taking every other scale degree: triad = degrees d, d+2, d+4; a seventh chord adds d+6. In C major that gives C (C E G), Dm, Em, F, G, Am, B diminished, written as Roman numerals I ii iii IV V vi vii.
- Chord types as offsets (match tonal's chord table): major 0 4 7; minor 0 3 7; diminished 0 3 6; augmented 0 4 8; sus2 0 2 7; sus4 0 5 7; major 7th 0 4 7 11; minor 7th 0 3 7 10; dominant 7th 0 4 7 10; add9 0 4 7 14.
- **Sus chords and open fifths (0 7) have no third, so they are neither major nor minor.** Use them when the harmony should not pass judgement on the data.
- Common progressions (conventions; in C major): I-V-vi-IV (C G Am F); vi-IV-I-V (Am F C G, more sombre); I-IV (two-chord vamp, good for ambient); ii-V-I (Dm G C, a strong "arrival"); dorian vamp i-IV (Dm G); lydian vamp I-II over a held root (C, D over C).
- **Harmonic rhythm** = how often the chord changes. One chord per 1 or 2 bars is normal; ambient music holds a chord for 4 to 8 bars.
- **Voice leading** = moving each chord note as little as possible. Cheapest algorithm (tested): fold every chord into one fixed octave window.

```js
const voiceInWindow = (rootPc, chord, lo = 60) =>          // chord = offsets, e.g. [0, 4, 7]
  chord.map((c) => lo + ((((rootPc + c - lo) % 12) + 12) % 12)).sort((a, b) => a - b);
// C: [60,64,67] -> F: [60,65,69] (3 semitones of total movement; block chords would move 15)
```

### 1.4 Register, tempo, meter, swing

| Role | Register (MIDI) | Note |
|---|---|---|
| bass | C1-C3 (24-48) | single notes, octaves or fifths only; close intervals down here sound muddy (convention) |
| pad | C3-C5 (48-72) | chords |
| lead | C4-C6 (60-84) | where the ear follows melody best |
| sparkle, events | above C6 (84+) or unpitched | short sounds |

- Tempo in BPM (beats per minute): beat = 60 / BPM seconds; 16th note = 60 / BPM / 4 (0.125 s at 120 BPM); bar of 4/4 = 240 / BPM seconds. Meter = beats per bar (4/4 = 16 sixteenth-steps). A clip of T seconds holds `T * BPM * 4 / 60` sixteenth-steps: 30 s at 96 BPM = 192 steps = 12 bars.
- Swing = delaying every second 8th note. Tone.js: `Tone.getTransport().swing` (0..1) and `swingSubdivision` (default "8n"). Leave swing at 0 on any layer whose timing is data.

### 1.5 Consonance, dissonance, and dissonance as a data channel

Consonant intervals blend; dissonant ones (1, 6, 11 semitones) sound rough because close frequencies beat against each other (Plomp and Levelt 1965; detail from memory, unverified). Two usable controls:

- **Tension ladder.** Score a chord by counting note pairs that are a semitone or a tritone apart (after folding into one octave). Map an anomaly feature to the ladder level, change level only on bar lines, and drop back when the anomaly ends.

| Level | Chord (offsets) | Semitone + tritone pairs |
|---|---|---|
| L0 | 0 7 12 (open fifth) | 0 |
| L1 | 0 2 7 (sus2) | 0 |
| L2 | 0 4 7 11 (major 7th) | 1 |
| L3 | 0 3 6 9 (diminished 7th) | 2 |
| L4 | 0 1 6 7 (cluster) | 4 |

- **Detune beating.** Two oscillators d cents apart beat at `f * (2 ** (d / 1200) - 1)` Hz: 20 cents at 440 Hz = 5.1 beats per second. A continuous roughness knob that does not change the note.

Rule: every dissonance must be traceable to a named feature in the mapping table.

## 2. Pitch quantisation

Pipeline: value -> normalise to x in 0..1 (publish the min and max, or the percentiles used) -> optional curve `x ** gamma` (SYSTEM Sounds' tutorial uses 0.5 to spread small values) -> smooth -> degree with hysteresis -> MIDI -> schedule on the grid.

```js
const degreeToMidi = (deg, scale, root) => {            // tested
  const n = scale.length, oct = Math.floor(deg / n);
  return root + 12 * oct + scale[((deg % n) + n) % n];
};
function makeQuantizer(span, hyst = 0.6) {              // span = number of notes available
  let cur = null;
  return (x) => {                                       // x in 0..1 -> scale degree
    const target = Math.min(1, Math.max(0, x)) * (span - 1);
    if (cur === null || Math.abs(target - cur) > hyst) cur = Math.round(target);
    return cur;
  };
}
function snapToSet(midi, pcs) {                         // pcs = allowed pitch classes, e.g. [0, 4, 7]
  for (let d = 0; d <= 6; d++)
    for (const m of [midi - d, midi + d])
      if (pcs.includes(((m % 12) + 12) % 12)) return m;
  return midi;
}
```

Worked example: x = 0.62, C major pentatonic `[0,2,4,7,9]`, three octaves from C3 (root 48, span 16): degree = round(0.62 * 15) = 9 -> 48 + 12 + 9 = 69 = A4 = 440 Hz.

- **Jitter.** A value sitting on a boundary flips with plain rounding on every sample (39 flips in 40 samples in the test); with hysteresis 0.6 it flips 0 times, yet a real move is followed at once. Also smooth first (`y += 0.2 * (x - y)`) and allow at most one new note per 16th.
- **Stuck notes, two kinds.** Hung notes: always use `triggerAttackRelease(note, duration, time)` so every note has an end, and call `releaseAll()` on each `Tone.PolySynth` when playback stops. Monotony: if the degree has not changed, do not retrigger; hold the note (a tie) or rest. A long held note honestly says "no change".
- **Contour.** Mapping to a fixed note set is monotone, so direction is preserved or flattened, never reversed. Snapping to chord tones breaks this when the chord changes between two samples, which is why the lead snaps to the scale only. Unit test: for every consecutive pair, the sign of the note change is 0 or equals the sign of the data change.
- **What quantisation costs.**

| Note set | Notes over 2 octaves | Over 3 octaves |
|---|---|---|
| pentatonic (5) | 11 | 16 |
| 7-note mode | 15 | 22 |
| chromatic (12) | 25 | 37 |

  If the change that carries the science is smaller than one step, zoom the mapped range, or put the unquantised value on a continuous parameter (filter cutoff, loudness of a second partial). Rank-based (histogram-equalised) normalisation uses every note but distorts magnitudes: allowed only if the mapping table says so.

## 3. Colour to harmony

**Caveat first.** There is no physical or agreed perceptual rule that ties a hue to a pitch; historical schemes (Newton, Scriabin) disagree with each other (secondary sources, unverified in detail). What experiments do support:

- People match high pitch with small, bright objects high up in space (Spence 2011, review). So lightness -> higher register or brighter timbre, and up on the map -> higher pitch, are defensible.
- Faster, major-mode music was matched to more saturated, lighter, yellower colours and slower minor music to desaturated, darker, bluer ones, in the US and Mexico, with the link running through emotion (Palmer et al. 2013). So colour-music matches are about mood, not about note names.

**In EIC frames colour is already data**: a colour bar (sea surface temperature: blue 0 C, green 10-20 C, yellow about 25 C, red 32 C) or a category label (aerosol type; more or less night light). Decode first, then choose:

| Colour means | Mapping | Example |
|---|---|---|
| a category | class -> instrument, register, pan; dominant class -> chord root | aerosols: four types, four timbres |
| a value on a colour bar | value -> scale degree (lead) and filter brightness | sea surface temperature |
| palette spread (number of distinct hue clusters in the frame) | chord size: 1 cluster -> open fifth, 2 -> triad or sus, 3 or more -> add9 or 7th | visual complexity -> harmonic complexity |
| slow drift of the dominant hue | circle-of-fifths walk for the key | optional, below |

**Circle of fifths.** Order the 12 keys so neighbours are 7 semitones apart: C G D A E B F# C# G# D# A# F. Neighbouring major keys share 6 of their 7 notes; opposite keys (C and F#) share 2 (tested). Slow data drift then sounds like smooth key changes and a big jump sounds like a scene change.

```js
// hue in degrees -> root pitch class; 12 sectors of 30 degrees walked in fifths (tested)
const hueToRootPc = (h) => (7 * (Math.round((((h % 360) + 360) % 360) / 30) % 12)) % 12;
```

Label this as an artistic convention in the mapping table. **Data-driven chord changes:** change chord only on a bar line, at most once per bar, and only when the driving feature has crossed a threshold with hysteresis.

## 4. Rhythm from data

**Density -> onsets (Euclidean rhythm).** E(k, n) places k onsets as evenly as possible in n steps. Toussaint (2005) showed that Bjorklund's algorithm (written for timing pulses in a neutron accelerator) reproduces many traditional rhythms: E(3,8) `x..x..x.` (Cuban tresillo), E(5,8) `x.xx.xx.` (cinquillo), E(7,12) `x.xx.x.xx.x.` (West African bell pattern), E(5,16) `x..x..x..x..x...` (bossa-nova necklace), E(4,16) `x...x...x...x...`.

```js
function euclid(k, n) {                                  // tested against 22 patterns printed by Toussaint
  if (k <= 0) return new Array(n).fill(0);
  if (k >= n) return new Array(n).fill(1);
  let a = Array.from({ length: k }, () => [1]);          // groups that start with an onset
  let b = Array.from({ length: n - k }, () => [0]);      // remainder groups
  do {
    const m = Math.min(a.length, b.length);
    const merged = [];
    for (let i = 0; i < m; i++) merged.push(a[i].concat(b[i]));
    const rest = a.length > m ? a.slice(m) : b.slice(m);
    a = merged; b = rest;
  } while (b.length > 1);
  return a.concat(b).flat();
}
const densityToPattern = (d, steps = 16) => euclid(Math.round(d * steps), steps);  // d in 0..1
const rotate = (p, r) => p.slice(r).concat(p.slice(0, r));                         // variation
```

Ready-made: Strudel `note("c3").euclid(3,8)`, Sonic Pi `spread(3, 8)`, isobar `PEuclidean`.

- **Probability gates.** Each step fires with probability p = feature. `Tone.Loop` has `probability` and `humanize` (off by default), but its source calls `Math.random()` directly, so that gate cannot be seeded; for reproducibility use your own seeded generator:

```js
function mulberry32(seed) {                              // tested: same seed, same sequence
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- **Events -> grid.** step = round(t / stepDuration). Several events in one step = one hit with velocity `log(1 + n) / log(1 + nMax)`. Timing error is at most half a step (62.5 ms for 16ths at 120 BPM): state it. Live events in Tone.js can use the `"@16n"` time notation (next 16th).
- **Tempo curves.** `Tone.getTransport().bpm.rampTo(120, 10)` ramps tempo. But tempo is a strong arousal cue and a tempo change breaks sync with a fixed-rate video, so prefer changing note density (quarters -> 8ths -> 16ths) at fixed BPM.
- **Polyrhythm from periodicity.** If autocorrelation (see 02) finds a period, make one bar equal one period: the data sets the meter. Two periods (say 24 and 16 frames) -> two loops of those lengths -> a 3:2 polyrhythm that is literally the data's structure.

## 5. Texture and form

| Texture | What it is | Carries |
|---|---|---|
| drone, pad | long held notes or chords; slow filter moves | slow global state |
| arpeggio | chord notes one at a time (`Tone.Pattern`: up, down, upDown, downUp, alternateUp, alternateDown, random, randomOnce, randomWalk) | regional values in a fixed order |
| ostinato | short repeating rhythm (Euclidean) | density |
| lead line | one note at a time, most audible | the key variable |
| call and response | layer A plays 2 bars, layer B answers | comparison of two series without masking |

Form over one animation (30 s example): 0-4 s **legend** (lowest note, highest note, each instrument alone, one spoken or captioned sentence); 4-27 s **data**, layers entering only when their feature is non-zero; last 3 s **ending**. End on the home chord only if the data returned to its start; if it did not (a rising trend), stop on the unresolved chord and say so in the listening guide.

**Silence is information.** Zero and missing are different: zero = a quiet tick or the drone alone; missing or masked = true silence or a distinct neutral sound. Never fill gaps with a default note.

## 6. Orchestration

| Role | Data it carries | Tone.js starting point | Pan |
|---|---|---|---|
| bass | slow global trend (frame mean, low-passed) | `Tone.Synth`, triangle oscillator (has harmonics, so it survives small speakers) | centre |
| pad | regional averages: each region owns one chord tone; its level or filter follows the region | `Tone.PolySynth` with `fatsawtooth` or `fatsine` (`count` 3, `spread` 20 cents), slow attack, lowpass `Tone.Filter` | wide |
| lead | the key variable | `Tone.FMSynth` (`harmonicity`, `modulationIndex`) or `Tone.Synth` with `portamento` | follows x position |
| percussion | events | `Tone.MembraneSynth` (`pitchDecay`, `octaves`), `Tone.MetalSynth`, `Tone.NoiseSynth` | event position |

Timbre that suits the phenomenon without cliche (design judgement, untested by ear):

- Water: smooth sine or triangle, legato, glides (`portamento`), slow `Tone.Chorus`; flow speed -> motion, not wave samples.
- Air and aerosols: filtered noise (`Tone.NoiseSynth` -> `Tone.AutoFilter`) for haze; dry plucks (`Tone.PluckSynth`, Karplus-Strong) for dust grains.
- Fire and smoke: FM with `modulationIndex` rising with intensity (brighter and rougher), not crackle recordings.
- City lights: short bright plucks or bells, one per lit region.
- Lightning: a low membrane hit plus a noise click, not thunder recordings. Literal sound effects invite the belief that the audio is a recording (many listeners of NASA sonifications assumed exactly that, Arcand et al. 2024).

Keeping layers apart: at least one octave between roles, different attack shapes (pluck versus pad), different note rates, different pan. Timbre differences help the ear keep data streams separate, and loudness alone is a poor carrier for continuous values (Flowers 2005, via search summary). Three or four simultaneous streams is a sensible ceiling (rule of thumb, unverified). Give every layer solo and mute (`Tone.Channel` has `solo` and `mute`): NASA's Chandra pages publish each telescope's layer solo and together.

## 7. Emotion: what the research says and how to use it

Eerola, Friberg and Bresin (2013) varied six cues over 200 short examples and had listeners rate four emotions. Linear models explained 77-89% of rating variance; cues combined additively with no significant interactions; importance order: mode, then tempo, register, dynamics, articulation, timbre. Directions (standardised betas, re-read directly from the paper's regression table; mode is coded 0 = minor, 1 = major):

| Perceived emotion | Cues that raise it |
|---|---|
| happy | major mode (1.77), faster (0.25), higher register (0.18), more staccato (0.14) |
| sad | minor mode (-1.6), slower (-0.32), more legato (-0.18), darker timbre (-0.14) |
| peaceful | slower (-0.27), softer (-0.28), darker timbre (-0.45), major mode (0.43), higher register (0.15) |
| scary | low register (-0.23), minor mode (-0.74), louder (0.20) |

Cue levels in that study: tempo 1.2 to 6 notes per second, register F3 to B5, dynamics over a 20 dB range. For "scary", which of the four composed pieces was played mattered more than any single cue (beta 1.56): the notes themselves carry emotion too.

Broader reviews agree at the level of: tempo, loudness and pitch height raise arousal; mode and consonance move valence (Juslin and Laukka 2003, a review of 104 vocal-expression and 41 music-performance studies; Gabrielsson and Lindstrom 2010; their cue tables not re-read today, unverified).

Using this responsibly:

1. **The data picks the notes; the preset picks the palette.** Any emotion cue that is not driven by a feature is constant for the whole piece and listed as "artistic constant".
2. **Urgency must be earned.** Bind arousal cues (density, loudness, brightness, dissonance) to magnitude or rate of change. **Null test:** feed constant frames; the result must be a static, calm drone. **Shuffle test:** shuffle the frames; the music must change.
3. **Do not hard-wire "minor = bad".** Mode is the strongest valence cue, so binding it to a variable is a value judgement. Prefer chords without thirds, or one mode per preset.
4. Optional: offer "Calm" and "Urgent" as labelled listening modes that differ only in constants (for example 72 versus 108 BPM) with identical mappings, and say so. That shows the framing instead of hiding it.
5. Instrumentation, tempo and key carry a strong emotional charge, so sensitive topics call for restraint (Geere and Quick 2021, paraphrased).

## 8. Generative techniques and tools

Generative layers are accompaniment. Rules: seeded, parameterised by data, at least 6 dB quieter than data layers, removed in Raw mode.

| Technique | What it does | Data hook | Verdict |
|---|---|---|---|
| arpeggiator | cycles chord notes | chord and rate from data | use (`Tone.Pattern`) |
| Euclidean ostinato | even onsets | k from density | use |
| phasing loops | several loops of unrelated lengths never realign | which notes are in the loops; loop levels | use as a bed |
| constrained random walk | melody steps 1-2 scale degrees, pulled toward a data-defined centre | centre and step size | optional, seeded |
| Markov chain | next note drawn from a transition table | data selects or weights tables | skip: the table, not the data, writes the notes |
| cellular automata, L-systems | rule-generated patterns | rule or seed from data | skip (no source checked) |

Phasing in practice: Eno described Music for Airports as tape loops repeating roughly every 23.5, 25.9 and 29.9 seconds, lengths he called incommensurable, so the loops are unlikely ever to line up again. Parviainen's Web Audio recreation uses seven notes of a D-flat major seventh chord with an added ninth, with loop lengths between 17.7 s and 22.1 s. Recipe: 5-7 notes of the current scale, one loop each, lengths of 17-30 s that share no simple ratio.

| Tool | Version, licence (checked 2026-11-14) | Use for | Verdict |
|---|---|---|---|
| Tone.js | npm `tone` 15.1.22, MIT | Transport, `Loop`, `Sequence`, `Pattern`, synths, effects | use |
| tonal | npm `tonal` 6.5.1, MIT | `Scale.get("C major").notes`, `Note.midi("C4")`, chord names | optional; the scale tables above are enough |
| Strudel | `@strudel/web` 1.3.0, AGPL-3.0-or-later (OSI-approved); the official JavaScript port of the TidalCycles pattern language | `n("0 2 4 6 4 2").scale("C:major")`, `.euclid(3,8)` | prototype in its REPL; do not embed unless you accept AGPL for the app |
| TidalCycles | GPL-3.0; GitHub repository archived | Haskell live coding | skip |
| Sonic Pi | main source MIT; its web build is AGPL-3.0-or-later; bundled samples are CC0 (all per its LICENSE.md) | desktop app: offline rendering of a curated playlist; `spread` for Euclidean rhythms; a source of public-domain samples | only for the playlist route, or for its CC0 samples |
| music21 | PyPI 10.5.2, BSD-3-Clause, Python >= 3.11 | scale and chord objects, MIDI export | optional (Python route) |
| SCAMP | PyPI 0.13.0, GPL-3.0-only, Python >= 3.12 | playback and notation | skip (GPL) |
| isobar | PyPI 0.2.1, MIT (repository) | `PEuclidean`, `PDegree`, `PMarkov`, `PLSystem`, `PBrown` -> MIDI | optional (Python route) |
| MIDIUtil | PyPI 1.2.1 (2018), MIT | writing .mid files (used in SYSTEM Sounds' tutorial) | fine |

## 9. Mixing essentials

Vocabulary: **dBFS** = level relative to digital full scale (0 dBFS is the maximum; above it the signal clips, an ugly crackle). **Headroom** = distance below 0. **Compressor** = turns loud passages down above a threshold. **Limiter** = a compressor with a very high ratio used as a ceiling. **EQ** = per-frequency-band volume. **Reverb** = simulated room; **delay** = echoes. **LUFS** = a loudness unit that follows perception (ITU-R BS.1770).

Sketch (class names and arguments checked against the 15.1.22 docs; not executed):

```js
const limiter = new Tone.Limiter(-1).toDestination();          // safety ceiling at -1 dB
const comp = new Tone.Compressor(-18, 3).connect(limiter);     // threshold dB, ratio
const eq = new Tone.EQ3().connect(comp);                       // eq.low / eq.mid / eq.high in dB
const bus = new Tone.Gain(1).connect(eq);
const reverb = new Tone.Reverb(3).connect(bus);                // 3 s decay; await reverb.ready
const send = new Tone.Gain(0.25).connect(reverb);              // shared reverb send
const strip = (volume, pan) => {
  const ch = new Tone.Channel({ volume, pan }).connect(bus);   // volume in dB, pan -1..1
  ch.connect(send);
  return ch;                                                    // ch.solo, ch.mute for the legend
};
const leadCh = strip(-8, 0), bassCh = strip(-10, 0), percCh = strip(-12, 0), padCh = strip(-16, 0);
// lead.connect(leadCh); ...   and call await Tone.start() from a click before any sound
```

- **Gain staging.** Start with lead -8 dB, bass -10, percussion -12, pad -16, generative bed -20. Five layers each peaking at -12 dBFS can sum to +2 dBFS (5 x 0.251 = 1.26) and clip; at -15 dBFS each they sum to -1 dBFS. Turn layers down before reaching for the compressor.
- **Compressor and limiter.** The raw Web Audio `DynamicsCompressorNode` defaults are threshold -24 dB, knee 30, ratio 12, attack 0.003 s, release 0.25 s: far too heavy for a data mix, so set values explicitly. If loudness carries data, bus compression flattens it; keep it gentle (ratio 2-3) and treat the limiter as a safety net that rarely acts (watch `limiter.reduction`).
- **EQ carving.** Give each role its own band: bass below about 200 Hz, pad 200 Hz-2 kHz (lowpass it), lead 500 Hz-5 kHz, percussion above 3 kHz or a kick below 100 Hz. Laptop speakers reproduce little below roughly 150-250 Hz (anecdotal figures, unverified), so the bass needs harmonics (triangle, sawtooth or FM, or doubled an octave up).
- **Space.** Reverb send for pad and lead (decay 2.5-5 s), little or none on bass and kick. `Tone.Reverb` builds its impulse response asynchronously (`ready`); `Tone.Freeverb` runs in an AudioWorklet and its own docs warn about performance. Delay on the lead only: `new Tone.FeedbackDelay("8n", 0.3)` at low level.
- **Stereo.** `Tone.Panner` or the `Channel` pan for position; `Tone.StereoWidener` (0 = mono, 1 = all side) on the pad at about 0.6. Bass and kick in the centre. Check in mono: phone speakers are close to mono.
- **Clicks.** Envelope attack and release of at least 5-10 ms; move parameters with `rampTo`, never jumps.
- **Loudness target for the demo video and exported audio:** -14 LUFS integrated, true peak at or below -1 dBTP (Spotify's published numbers; YouTube is widely reported to use -14 LUFS too but does not document it, unverified). Broadcast (EBU R 128) is -23 LUFS. Measure offline: ffmpeg's `ebur128` and `loudnorm` filters (loudnorm defaults I = -24, TP = -2, so set them) or `pyloudnorm` (MIT). In the browser, `Tone.Meter` gives RMS only, a rough guide. `Tone.Offline` renders a passage faster than real time.

## 10. AI music and audio models

| Model | Licence (code / weights) | Conditioning relevant here | Needs | Verdict |
|---|---|---|---|---|
| MusicGen (Meta AudioCraft) | MIT / CC-BY-NC 4.0 | text; melody variants follow a reference audio's chromagram (`generate_with_chroma`) | its docs ask for a GPU with 16 GB or more for the 1.5B models | skip: non-commercial weights, heavy |
| Stable Audio Open 1.0 (Stability AI) | Stability AI Community License; gated download | text -> up to 47 s stereo at 44.1 kHz; its model card says it is stronger at sound effects and field recordings than at music | GPU | skip; at most one declared texture |
| Magenta RealTime 2 (Google, 2026) | Apache 2.0 / CC BY 4.0; the model card says Google claims no rights in what you generate | text or audio style, plus **MIDI: a 128-value pitch state per frame**; 48 kHz stereo; 230M and 2.4B sizes | live streaming needs Apple Silicon; offline on Apple Silicon or an NVIDIA GPU | the only honest candidate; try only with an M-series Mac and 3 spare hours |
| Lyria RealTime (Gemini API, `models/lyria-realtime-exp`, experimental) | closed service, API key | weighted text prompts; `bpm` 60-200, `density` 0-1, `brightness` 0-1, `scale`; the docs say output audio is always watermarked | network | skip: black box, cannot be open-sourced or reproduced offline |
| ACE-Step 1.5 | MIT (code; weights tagged MIT on Hugging Face) | text and lyrics -> full songs; BPM and key metadata; no note-level input in the README | README claims under 4 GB VRAM; Python 3.11-3.12 | skip: training data not stated in the README, which sits badly with "no copyrighted music" |

Newer `stabilityai/stable-audio-3-*` repositories exist on Hugging Face (created May 2026); not read (unverified).

- **Honest conditioning, if you ever do it:** (1) the deterministic sonification outputs MIDI and raw audio; (2) the model performs or accompanies that MIDI; (3) publish 1 and 2 side by side and label the AI layer; (4) check the output still contains the melody (compare note onsets or chroma) or discard it.
- **Why I still recommend skipping:** a generative model can add or drop notes and differs from run to run, so the result no longer has the same structure on repetition (Hermann's condition C), exactly where Validity is judged; and it costs GPU time you do not have.
- **Rules:** all AI use goes in the "Use of AI" field; the team's rules notes say AI audio must be acknowledged in the description or metadata (2025 wording via a third-party kit; 2026 wording unverified). Using an AI coding assistant for the synth code must be declared too.

## 11. Case studies: which musical decisions made them work

| Piece | Mapping | Decisions worth copying |
|---|---|---|
| Chandra "A Universe of Sound": Galactic Center (CXC with SYSTEM Sounds: M. Russo, A. Santaguida) | left-to-right scan; height -> pitch; brightness -> volume | point sources become separate notes while diffuse gas becomes a slowly changing drone (figure versus ground); one layer per telescope, published solo and together; the crescendo is the data's own peak at Sagittarius A* |
| Caldwell 73 (SVS 13786, the challenge's own reference) | radar sweep; star radius -> pitch | whole image as a choir bed; orange and red stars on marimba, blue stars on glockenspiel: colour class -> timbre family |
| SYSTEM Sounds "Turn Data Into Music With Python" (moon impacts) | crater age -> time, diameter -> pitch and velocity; 60 BPM | hand-picked 23-note set: only C and G in the bass (C1 C2 G2), then C E G A B D with no F, F#6 on top; power curve 0.5; velocity 35-127 double-codes size |
| NASA "Sounds of the Sea" (R. and J. Vandermeulen, 2022) | red, green, blue ocean-colour channels -> notes, arranged in GarageBand | one instrument per channel; a day-offset turned one piece into a waltz; the makers chose music because it engages people across backgrounds |
| "A Song of Our Warming Planet" (D. Crawford, 2013) | one cello note per year 1880-2012; pitch = NASA GISS temperature anomaly; coldest year (1909) = open C; one semitone is about 0.03 C; three octaves | no scale at all: maximum fidelity, one acoustic instrument, one variable, a one-sentence legend |
| NASA Earthdata NDVI sonification (Maskey and Maroune, 2023) | vegetation index -> MIDI chords C1-A6, velocity 35-127 | same note-set recipe on Earth data; code public but with no licence file |
| Loud Numbers (Geere and Quick) | varies | explain the mapping first, then play; genre as framing (jungle for inequality, baroque counterpoint for EU law) |

NASA's own listener study (Arcand et al. 2024; 3,184 responses; pieces: Galactic Center, Cassiopeia A, Chandra Deep Field South): the words calm (326 mentions) and curious or curiosity (329) dominated; respondents preferred instrumental timbres to synthesised ones; the synthetic-sounding Deep Field had the widest spread of enjoyment; many thought they were hearing recordings from space; the authors recommend explaining goals and process alongside the audio. A separate engagement study found that data-to-music sonification with melodic, rhythmic and chordal content can serve analysis with enhanced user engagement (Middleton et al. 2023, abstract).

Listen: https://chandra.si.edu/sound/ , https://svs.gsfc.nasa.gov/13786/ , https://www.youtube.com/watch?v=ANYxkwvb8pc (moon impacts), https://www.nasa.gov/science-research/earth-science/sounds-of-the-sea .

## 12. Fidelity versus beauty: checklist

Hermann (2008): a technique is sonification only if (A) the sound reflects properties or relations in the data, (B) the transformation is completely systematic, (C) it is reproducible (the same data gives the same sound structure), (D) it can be used with different data. Pitch is by far the most used mapping in the literature, and mappings are rarely evaluated (Dubus and Bresin 2013: 179 publications, 495 mappings).

- [ ] **Mapping table** per preset: feature, units, normalisation range, polarity, sound parameter, sound range, step size, and every artistic constant.
- [ ] **Listening guide**: two or three sentences before playback, plus the audio legend (lowest and highest note, each instrument alone). Geere and Quick stress that the audience must understand the mapping before listening.
- [ ] **A/B toggle** Raw versus Musical, same data and timing.
- [ ] **Resolution check**: state what one scale step equals in data units (for example 2.1 C). If the science is smaller than a step, zoom the range or add a continuous parameter.
- [ ] **Polarity** stated and consistent: higher pitch can mean more or less and neither is natural, so say which (Geere and Quick).
- [ ] **Loudness never the only carrier** of a continuous variable: double-map it with pitch or timbre.
- [ ] **Determinism**: seeded randomness; the same frames give the same events.
- [ ] **Three tests**: null (constant input is calm), shuffle (shuffled input changes the music), contour (melody never moves against the data).
- [ ] **Decoration** (arpeggios, loops, reverb tails) is quieter, labelled, and absent in Raw mode.
- [ ] **No emotion cue bound to a variable** without a stated reason.
- [ ] **"Generated from image data, not a recording"** is said in the UI.
- [ ] **Listening test on both modes** with the same question (see 07-accessibility-and-listening-tests.md). If Musical scores worse than Raw, the arrangement is hiding signal.

## 13. Five presets for EIC visuals

Shared conventions: every feature is normalised to 0..1 over the whole clip (publish min and max); "k" = Euclidean onsets in a 16-step bar; pitches use the hysteresis quantiser; percentages and thresholds are starting values. Feature names are suggestions: align them with 02-frame-analysis-algorithms.md. All sounds are Tone.js synths, no samples. Untested by ear. `new Tone.PolySynth(Tone.FMSynth, options)` is the documented argument order (voice class, then options).

Legend lines, one per preset, to speak or caption before playback (they restate the rule tables below in plain words):

- Lightning: "Each tick is lightning. Left ear is west, right ear is east, louder means more flashes. The bell is higher when storms are further north. A deep drum marks the biggest storm clusters."
- Aerosols: "We sweep the map from west to east. Breathy pings are sea salt, dry plucks are dust, the low rough tone is smoke, the small bell is sulfate. Busier means more of that particle; higher means further north."
- Sea surface temperature: "The melody is water temperature along one track: higher and brighter is warmer. Faster notes mean faster currents. A separate high bell marks turbulent water."
- Carbon dioxide: "The pad swells once per model day, like breathing; fuller means more carbon dioxide in view. The lead follows the strongest plume: higher is denser. The chords turn tense only when hotspots are unusually large."
- Night lights: "First, each bar is one year: plucks run from west to east, higher means a brighter region, busier means more light overall. Then rising high notes are places that gained light and falling low notes are places that lost it. Silence means no change."

### 13.1 Lightning (SVS 5011)

Visual: lightning events from the LIS sensor on the ISS, 2017-2023, 10-day roving window. Key: E minor pentatonic (E G A B D). Tempo: 120 BPM, 4/4, 16th grid (0.125 s; timing error at most 62.5 ms).

Instruments: `spark` = `Tone.PolySynth(Tone.FMSynth)` with `harmonicity` 3.01, `modulationIndex` 10, envelope attack 0.001, decay 0.3, sustain 0, release 0.3 (bell); `strike` = `Tone.MembraneSynth` with `pitchDecay` 0.03, `octaves` 6, on E1; `tick` = `Tone.NoiseSynth`, envelope decay 0.05, sustain 0; `sky` = pad on E2 B2 E3 (open fifth), `fatsawtooth` through a lowpass filter.

| Feature (per 16th step) | Sound | Rule |
|---|---|---|
| flash count n in each longitude third (west, centre, east) | one `tick` per region, pan -0.7, 0, +0.7 | velocity = log(1 + n) / log(1 + nMax); n = 0 -> nothing |
| mean latitude of the flashes in that region | `spark` pitch | degree = round(x * 15) from E4 (E4-E7); north = high |
| n above the clip's 90th percentile | add `strike` | landmark for storm clusters |
| rolling total over the visual's 10-day window, low-passed | `sky` filter cutoff 300-3000 Hz, level -24 to -14 dB | slow swell |
| no flashes anywhere | pad only | silence = no lightning |

Effects: short reverb (decay 1.5 s, low send) so hits stay crisp; no delay; the limiter matters here (sharp transients).

### 13.2 Aerosols by type (SVS 5669)

Visual: a still for 2025-08-19 20:00 UTC from the GEOS model: sea salt (blue), dust (pink/magenta), smoke from fires (orange/red), sulfates (green). A still has no time axis: sweep west to east in 16 bars (1 bar = 22.5 degrees of longitude), or follow the user's cursor column. Key: A minor pentatonic (A C D E G). Tempo: 84 BPM (bar 2.86 s; sweep 45.7 s).

| Type | Instrument | Register | Pan |
|---|---|---|---|
| sea salt | `Tone.NoiseSynth` -> `Tone.AutoFilter` (breathy wash) plus sine pings | A5-A6 | -0.6 |
| dust | `Tone.PluckSynth` (dry grains) | A3-A5 | -0.2 |
| smoke | `Tone.FMSynth`, `modulationIndex` 2-12 | A2-A4 | +0.2 |
| sulfate | `Tone.MetalSynth` (short bell) | E5-E7 | +0.6 |

| Feature (per bar, per type) | Sound | Rule |
|---|---|---|
| coverage fraction c of the column band | that track's rhythm | k = round(12 * c); k = 0 -> track silent |
| mean intensity (opacity) | velocity 0.3-1; smoke `modulationIndex`; salt filter cutoff | denser = louder, rougher, brighter |
| mean latitude of that type's pixels | pitch degree inside the track's register | north = high |
| dominant type (must lead by 10 points to take over) | pad chord: salt Csus2 (C D G), dust Dsus2 (D E A), smoke Asus4 (A D E), sulfate Gsus2 (G A D) | all four chords lie inside the scale and none has a third: the chord says who dominates, not whether that is good |

Effects: reverb decay 2.5 s on pitched tracks only; fixed pans keep the four streams apart.

### 13.3 Sea surface currents and temperature (SVS 3912)

Visual: ECCO2 model surface flows coloured by temperature, 2007-03-25 to 2008-03-03; colour bar blue 0 C, green 10-20 C, yellow about 25 C, red 32 C. Key: C lydian; data voices use only C D E G A, and F# (the raised 4th) is reserved for the eddy signal. Tempo: 60 BPM (bar = 4 s), no drums, legato.

Instruments: `current` = `Tone.Synth`, triangle, `portamento` 0.15 (the glide is the flow); `ocean` = `Tone.PolySynth` pad, `fatsine`, attack 1.5 s, release 3 s, through `Tone.Chorus`; `deep` = `Tone.Synth` triangle bass; `eddy` = FM bell on F#5, B5, F#6.

| Feature | Sound | Rule |
|---|---|---|
| decoded temperature along one tracked box or transect (0-32 C) | `current` pitch | degree = round(x * 15) from C3: 16 notes, about 2.1 C per step |
| the same value, unquantised | `current` filter cutoff 400-4000 Hz | carries the detail below one step |
| mean temperature of four ocean boxes | level (-30 to -12 dB) of four pad notes C3, G3, D4, A4, one per box | regional averages |
| flow-speed proxy (frame-difference energy) | `current` note rate: quarters, 8ths, 16ths at two thresholds; chorus depth | faster water = more motion |
| turbulence proxy (local variance) above its 80th percentile | seeded gate with p = feature fires `eddy` | the only source of the F# tension |
| global mean temperature, low-passed over about 30 frames | `deep` degree among C2 D2 E2 G2 A2 | seasonal trend |

Effects: reverb decay 5 s; `Tone.FeedbackDelay("4n", 0.3)` on the lead at low level.

### 13.4 Carbon dioxide (SVS 5196)

Visual: DYAMOND model, global CO2, January-March 2020. The map pulses daily (fires flare by day; plants take up CO2 by day and release it at night; the boundary layer rises and falls). Key: D dorian (D E F G A B C). Tempo: one bar = one model day, BPM = 240 / (seconds one day lasts in the clip; measure it; 2 s -> 120 BPM).

Instruments: `breath` = pad, `fatsawtooth` + lowpass; `ground` = triangle bass on D2; `plume` = `Tone.FMSynth` lead; `pulse` = soft `Tone.MembraneSynth` D1 on beat 1 plus `Tone.NoiseSynth` ticks.

| Feature | Sound | Rule |
|---|---|---|
| global mean CO2 colour density per frame | `breath` cutoff 300-2500 Hz and level | continuous, unquantised: the planet audibly breathes once per bar |
| 7-day running mean of the same | `ground` scale degree | one step per eighth of the clip's range |
| intensity of the brightest plume | `plume` pitch D4-D6 (15 notes), `modulationIndex` 2-14 | key variable |
| hotspot area fraction | `pulse` ticks | k = round(12 * x) |
| hotspot area z-score against the clip mean | tension ladder: below 1 -> L0, 1-2 -> L1, 2-3 -> L2, above 3 -> L3 | changes on bar lines only |
| hotspot centroid x | `plume` pan -0.8 to +0.8 | |

Effects: reverb decay about 5 s on `breath` and `plume` (send about 0.4), none on `ground` and `pulse`; no delay.

Ending: stop on the chord the data leaves you on. Caveats: the camera moves in these clips, so features mix camera motion with data change (pick the steadiest clip and say which); the colour bar is published on the page but its colours were not inspected for this file (calibrate from it).

### 13.5 Night lights change 2012-2023 (SVS 5313)

Visual: Black Marble annual averages 2012-2023, then a change map (purple = more light, orange = less light), then zooms on India, Ukraine, Western Europe and the Eastern Mediterranean. Key: D major pentatonic (D E F# A B) over a D-A drone (no third). Tempo: part 1, one bar = one year, BPM = 240 / (seconds per year in the clip; 2.5 s -> 96 BPM).

Instruments: `lights` = `Tone.PluckSynth` (`attackNoise` 1, `dampening` 4500, `resonance` 0.9), one instance per region so notes can overlap; `fade` = soft FM mallet; `night` = drone D2 + A2; `year` = very soft `Tone.MembraneSynth` on beat 1.

| Feature | Sound | Rule |
|---|---|---|
| year index (part 1) | bar number; `year` tick | lets a listener count the years |
| global lit fraction | `lights` rhythm | k = round(4 + 12 * x): more light = busier |
| lit fraction of region i (4-6 fixed boxes, west to east) | successive onsets cycle through the regions | degree = round(x * 10) from D4 (11 notes); pan = box longitude |
| global mean brightness, low-passed | `night` level -24 to -12 dB | |
| part 2, purple fraction per region | call, bars 1-2: `lights`, D5-D7, pattern "up" | k = round(8 * x) |
| part 2, orange fraction per region | response, bars 3-4: `fade`, D3-D5, pattern "down" | k = round(8 * x) |
| both below a floor | silent bars | no change = silence |

Effects: reverb decay about 3 s with a moderate send on `lights` and `fade`; optionally `Tone.FeedbackDelay("8n.", 0.25)` at low level on `lights`; `night` and `year` stay dry.

Both colours use the same scale: register and direction encode more or less, and the harmony does not judge it (a darker region can have several causes; the frame cannot say which).

## Open questions / unverified

- Nothing here was auditioned. Instrument settings, levels and thresholds are starting points.
- Eerola et al. (2013): the beta values and cue levels quoted in section 7 were re-read directly from the article's regression table and methods text, not only through an automated summary. Juslin and Laukka (2003) and Gabrielsson and Lindstrom (2010): only abstracts or citations confirmed, not their cue tables. Plomp and Levelt (1965): citation confirmed, content from memory.
- Colour-pitch history (Newton, Scriabin) rests on secondary pages seen only as search results.
- Flowers (2005) and Dubus and Bresin (2013) statements come from search summaries or abstracts, not full texts. Sonification Handbook chapters 7 and 15: only abstracts read.
- YouTube's -14 LUFS target is not officially documented. Laptop-speaker roll-off figures are anecdotal. The "three or four streams" ceiling and the low-register spacing rule are rules of thumb.
- Tone.js: snippets use names confirmed in the 15.1.22 docs or source, but none was executed. Confirmed in the source after the first draft: noise types are "white", "pink" and "brown"; `probability` gates call `Math.random()` and cannot be seeded; `humanize` is off by default. Not confirmed: licences of individual folders in the Tonejs/audio sample repository.
- The seeded generator is the widely circulated "mulberry32" form; its authorship and licence were not checked (it is six lines; rewrite or credit).
- SYSTEM Sounds' tutorial repository and NASA-IMPACT/data_sonification have no licence file according to the GitHub API: learn from them, do not copy code.
- "Sounds of the Sea" instrument assignments (guitar, harp, bass) and Loud Numbers' Sonic Pi-then-DAW workflow come from search snippets. A string-quartet sequel to "A Song of Our Warming Planet" was seen only in a snippet.
- EIC specifics not checked: seconds per year or per day in each clip (presets give formulas), the CO2 colour bar's colours, whether lightning frames show a seasonal north-south swing, an animated sibling of the aerosol still.
- AI models: Stable Audio 3 details, ACE-Step training data, Magenta RealTime 2 minimum hardware and real-time factor were not established. The 2026 Space Apps wording on AI audio was not read first-hand.
- TidalCycles: the GitHub repository is archived; its current home was not checked.
- Cellular automata and L-systems for music: no source consulted.

## Sources

Local evidence
- Official challenge text (local copy) - spaceapps-2026/sources/jukebox.txt (official page: https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/ as recorded in the team's notes) - wording on "chaotic noise", scales, harmonies, colour -> chords, pixel density -> rhythm, emotional impact.
- Team rules notes (local) - spaceapps-2026/03-rules-and-deadline.md - AI declaration, OSI licence, no copyrighted music.
- Local SVS API crawl (spaceapps-eic-evidence/svs_api/*.json) - descriptions of SVS 5313, 3912, 5669, 5196, 5011, 13786.

NASA and SVS
- GEOS Aerosols (2025) - https://svs.gsfc.nasa.gov/5669/ - colours per aerosol type, date, still-only media.
- Change in Night Lights 2012-2023, EIC version - https://svs.gsfc.nasa.gov/5313/ - purple = more light, orange = less, zoom regions.
- Global Sea Surface Currents and Temperature - https://svs.gsfc.nasa.gov/3912/ - ECCO2, colour bar values, date range.
- DYAMOND Global Carbon Dioxide - https://svs.gsfc.nasa.gov/5196/ - period, causes of the daily pulsing, colour bar exists.
- Lightning Events Detected from the ISS 2017-2023 - https://svs.gsfc.nasa.gov/5011/ - LIS sensor, 10-day window.
- Data Sonification: Caldwell 73 - https://svs.gsfc.nasa.gov/13786/ - radius -> pitch, choir, marimba, glockenspiel.
- Chandra "A Universe of Sound" - https://chandra.si.edu/sound/ - makers, accessibility consultant, list of pieces.
- Chandra Galactic Center sonification - https://chandra.si.edu/sound/gcenter.html - scan direction, pitch and volume mapping, notes versus drone, solo layers.
- Arcand et al. 2024, Frontiers in Communication - https://www.frontiersin.org/articles/10.3389/fcomm.2024.1288896/full - listener study numbers and recommendations.
- NASA "Sounds of the Sea" - https://www.nasa.gov/science-research/earth-science/sounds-of-the-sea - ocean-colour sonification process and quotes.
- NASA Earthdata blog on data sonification - https://www.earthdata.nasa.gov/learn/blog/data-sonification-open-science - NDVI -> MIDI chords; links https://github.com/NASA-IMPACT/data_sonification and https://www.nasa.gov/content/explore-from-space-to-sound (not opened).

Music theory and algorithms
- Note names, MIDI numbers and frequencies (J. Wolfe, UNSW) - https://newt.phys.unsw.edu.au/jw/notes.html - MIDI-frequency formula, A4 = 69.
- tonal scale table - https://raw.githubusercontent.com/tonaljs/tonal/main/packages/scale-type/data.ts - scale interval lists.
- tonal chord table - https://raw.githubusercontent.com/tonaljs/tonal/main/packages/chord-type/data.ts - chord interval lists.
- tonal repository - https://github.com/tonaljs/tonal - API examples, MIT; version from https://registry.npmjs.org/tonal/latest .
- Toussaint, "The Euclidean Algorithm Generates Traditional Musical Rhythms" (2005) - https://cgm.cs.mcgill.ca/~godfried/publications/banff.pdf - Bjorklund's algorithm, E(k,n) patterns and their traditional names.
- Eno, "Generative Music" talk (1996) - https://inmotionmagazine.com/eno1.html - loop lengths, "incommensurable".
- Parviainen, "JavaScript Systems Music" - https://teropa.info/blog/2016/07/28/javascript-systems-music.html - Web Audio and Tone.js recreations of Reich and Eno, loop durations.
- Parviainen, "How Generative Music Works" - https://teropa.info/loop/ - overview of generative techniques.

Tools
- Tone.js home - https://tonejs.github.io/ - Transport, instruments, `Tone.start()` on user gesture.
- Tone.js API docs 15.1.22 - https://tonejs.github.io/docs/15.1.22/classes/Pattern.html (and sibling pages Loop, Sequence, Limiter, Compressor, Reverb, Freeverb, FeedbackDelay, EQ3, StereoWidener, Meter, PolySynth, Sampler, MembraneSynth, MetalSynth, NoiseSynth, PluckSynth, FMSynth, AMSynth, Panner, Chorus, AutoFilter, Channel; functions/mtof.html, functions/Frequency.html) - class names, constructor arguments, properties.
- Tone.js source - https://github.com/Tonejs/Tone.js (files Tone/event/PatternGenerator.ts, Tone/core/clock/Transport.ts, Tone/event/Loop.ts, Tone/event/ToneEvent.ts, Tone/core/type/Time.ts, Tone/source/Noise.ts, Tone/source/oscillator/OscillatorInterface.ts via raw.githubusercontent.com) - pattern names, swing, bpm ramp, probability (uses `Math.random()`), "@" quantise notation, noise types, fat oscillator types; MIT.
- npm registry - https://registry.npmjs.org/tone/latest , https://registry.npmjs.org/@strudel/web/latest , https://registry.npmjs.org/@strudel/core/latest - versions and licences.
- Tone.js audio files - https://github.com/Tonejs/audio - per-folder licences statement.
- Strudel - https://strudel.cc/workshop/getting-started/ , https://strudel.cc/learn/tonal/ , https://strudel.cc/learn/time-modifiers/ - what it is, `scale`, `euclid`; source at https://codeberg.org/uzu/strudel .
- OSI, GNU AGPL v3 and GNU GPL v3 - https://opensource.org/license/agpl-v3 , https://opensource.org/license/gpl-3-0 - both are OSI-approved.
- TidalCycles - https://github.com/tidalcycles/Tidal - GPL-3.0, archived.
- Sonic Pi - https://github.com/sonic-pi-net/sonic-pi (https://raw.githubusercontent.com/sonic-pi-net/sonic-pi/dev/LICENSE.md and app/server/ruby/lib/sonicpi/lang/core.rb) - main source MIT, web build AGPL-3.0-or-later, bundled samples CC0; `spread` implements Toussaint's process.
- PyPI JSON API - https://pypi.org/pypi/music21/json , https://pypi.org/pypi/scamp/json , https://pypi.org/pypi/MIDIUtil/json , https://pypi.org/pypi/isobar/json , https://pypi.org/pypi/pyloudnorm/json , https://pypi.org/pypi/audiocraft/json - versions, licences, Python requirements.
- isobar - https://github.com/ideoforms/isobar - pattern classes, MIT. SCAMP - https://github.com/MarcTheSpark/scamp - GPL-3.0. music21 - https://github.com/cuthbertLab/music21 - BSD-3-Clause.
- SYSTEM Sounds sonification tutorials - https://github.com/SYSTEMSounds/sonification-tutorials (script https://raw.githubusercontent.com/SYSTEMSounds/sonification-tutorials/main/data2midi-part1.py ; video https://www.youtube.com/watch?v=YgLvfLxVWvU) - note set, scaling, velocity range, libraries.

Sonification literature
- Hermann, sonification definition - https://sonification.de/?p=39 - conditions A-D; music versus sonification.
- The Sonification Handbook - https://sonification.de/handbook/ , https://sonification.de/handbook/chapters/ , https://sonification.de/handbook/download/TheSonificationHandbook-chapter7.pdf , https://sonification.de/handbook/download/TheSonificationHandbook-chapter15.pdf - open-access reference; design and aesthetics; parameter mapping.
- Dubus and Bresin 2013, PLOS ONE - https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3866150/ - pitch is the most used mapping; evaluation is rare.
- Flowers 2005, ICAD - https://digitalcommons.unl.edu/psychfacpub/430 - pitfalls of loudness, role of timbre (search summary).
- Geere and Quick 2021, "Making numbers louder" - https://datajournalism.com/read/longreads/data-sonification - explain first, polarity, double-mapping, emotion caution, examples.
- MPR News on "A Song of Our Warming Planet" - https://www.mprnews.org/story/2013/07/09/how-a-university-of-minnesota-student-set-global-warming-to-music - mapping details.
- Middleton et al. 2023, Frontiers in Big Data (DOI 10.3389/fdata.2023.1206081) - record via https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE%3A%22sonification%22%20AND%20TITLE%3A%22engagement%22%20AND%20AUTH%3A%22Middleton%22&format=json&resultType=core - engagement with data-to-music sonification.

Emotion and cross-modal research
- Eerola, Friberg and Bresin 2013, Frontiers in Psychology - https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2013.00487/full - cue levels, betas, ranking, additivity.
- Juslin and Laukka 2003, Psychological Bulletin 129(5) (DOI 10.1037/0033-2909.129.5.770) - Europe PMC record via https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE%3A%22Communication%20of%20emotions%20in%20vocal%20expression%20and%20music%20performance%22&format=json&resultType=core - abstract.
- Gabrielsson and Lindstrom, "The role of structure in the musical expression of emotions" - https://typeset.io/papers/the-role-of-structure-in-the-musical-expression-of-emotions-2tfmgam4l1 - existence of the chapter (search listing).
- Palmer, Schloss, Xu and Prado-Leon 2013, PNAS (DOI 10.1073/pnas.1212562110) - https://pmc.ncbi.nlm.nih.gov/articles/PMC3670360 (abstract read through the Europe PMC API) - music-colour associations mediated by emotion.
- Spence 2011, "Crossmodal correspondences: a tutorial review" (DOI 10.3758/s13414-010-0073-7) - Europe PMC record via https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE%3A%22Crossmodal%20correspondences%3A%20a%20tutorial%20review%22&format=json&resultType=core - high pitch matched with small, bright, high objects.
- Plomp and Levelt 1965, JASA (DOI 10.1121/1.1909741) - Europe PMC record via https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE%3A%22Tonal%20consonance%20and%20critical%20bandwidth%22&format=json&resultType=core - citation only.
- Hue to pitch (rhythmiclight.com) - https://rhythmiclight.com/correspondences/hue-to-pitch/ - historical colour-pitch schemes disagree (search listing).

Mixing and loudness
- MDN, DynamicsCompressorNode - https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode and https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode/DynamicsCompressorNode - purpose, default values.
- Spotify, loudness normalization - https://support.spotify.com/artists/article/loudness-normalization/ - -14 LUFS, true-peak advice.
- EBU R 128 - https://tech.ebu.ch/publications/r128 - -23 LUFS, version 5.0 (November 2023).
- FFmpeg filters - https://ffmpeg.org/ffmpeg-filters.html - `loudnorm` options and defaults, `ebur128`.

AI models
- MusicGen documentation - https://github.com/facebookresearch/audiocraft/blob/main/docs/MUSICGEN.md - model list, melody conditioning, GPU memory, training data.
- MusicGen model card - https://github.com/facebookresearch/audiocraft/blob/main/model_cards/MUSICGEN_MODEL_CARD.md - code under MIT, model weights under CC-BY-NC 4.0; limitations.
- Stable Audio Open 1.0 - https://huggingface.co/stabilityai/stable-audio-open-1.0 - licence, 47 s, training data, strengths.
- Hugging Face model listing - https://huggingface.co/api/models?search=stable-audio&author=stabilityai&limit=20 - existence of stable-audio-3 repositories.
- Magenta RealTime 2 model card - https://huggingface.co/google/magenta-realtime-2 - licences, conditioning (including MIDI), sizes, output format.
- Magenta RealTime repository - https://github.com/magenta/magenta-realtime - hardware notes, install command.
- Lyria RealTime - https://ai.google.dev/gemini-api/docs/realtime-music-generation (redirects to https://aistudio.google.com/docs/realtime-music-generation) - model id, controls, watermark.
- ACE-Step 1.5 - https://github.com/ace-step/ACE-Step-1.5 - licence, features, hardware claims.
