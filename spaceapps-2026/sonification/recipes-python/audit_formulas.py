"""audit_formulas.py - checks the maths behind the sounds against independent reference values.

    python audit_formulas.py

Each recipe has its own self-test, but a self-test written by the same hand can share the same mistake.
These checks use numbers that come from outside the code: published constants, textbook identities,
and measurements of the rendered audio itself (pitch by FFT, loudness by RMS).
Prints PASS/FAIL per check; exit code 0 = all passed.
"""
import math
import os
import struct
import sys
import tempfile

import numpy as np

import musickit as mk
import p4_colscan as p4
import p5_colormap as p5
import synth
import wavio

HERE = os.path.dirname(os.path.abspath(__file__))
SR = wavio.SR
fails = 0


def check(name, ok, detail=''):
    global fails
    fails += not ok
    print(('PASS ' if ok else 'FAIL ') + name + (f'  ({detail})' if detail else ''))


def close(a, b, tol):
    return abs(a - b) <= tol


# ---- pitch: 12-tone equal temperament, A4 = 440 Hz (ISO 16) ----------------------------------------
REF_HZ = {69: 440.0, 60: 261.6256, 57: 220.0, 81: 880.0, 21: 27.5, 108: 4186.009}      # standard published values
check('MIDI note -> Hz matches the published table',
      all(close(mk.midi_to_hz(m), f, 1e-3) for m, f in REF_HZ.items()), 'A4=440, C4=261.6256, A0=27.5, C8=4186.009')
check('Hz -> MIDI is the exact inverse', all(close(mk.hz_to_midi(mk.midi_to_hz(m)), m, 1e-9) for m in range(128)))
check('one octave doubles the frequency, one semitone is 2^(1/12)',
      close(mk.midi_to_hz(72) / mk.midi_to_hz(60), 2.0, 1e-12) and close(mk.midi_to_hz(61) / mk.midi_to_hz(60), 2 ** (1 / 12), 1e-12))
check('major pentatonic = semitones 0 2 4 7 9', list(mk.SCALES['pentatonic_major']) == [0, 2, 4, 7, 9])
check('major scale = 0 2 4 5 7 9 11, natural minor = 0 2 3 5 7 8 10',
      list(mk.SCALES['major']) == [0, 2, 4, 5, 7, 9, 11] and list(mk.SCALES['minor']) == [0, 2, 3, 5, 7, 8, 10])
qs = [mk.quantize(v / 1000, 57, octaves=2) for v in range(1001)]
check('value -> note never goes down as the value goes up, and uses every note of the scale',
      all(b >= a for a, b in zip(qs, qs[1:])) and sorted(set(qs)) == mk.scale_notes(57, 'pentatonic_major', 2),
      f'{len(set(qs))} notes, {mk.note_name(qs[0])} to {mk.note_name(qs[-1])}')
counts = np.bincount(np.array(qs) - min(qs))
counts = counts[counts > 0]
check('each note covers an equal share of the value range', counts.max() - counts.min() <= 2, f'{counts.min()}..{counts.max()} of 1001 steps')

# ---- the rendered audio really has the pitch and loudness the code claims -------------------------
for midi in (45, 57, 69, 81, 93):
    x = synth.voice(mk.midi_to_hz(midi), 1.0, harmonics=1, attack=0.01, decay=0.0, sustain=1.0, release=0.01)
    w = x * np.hanning(len(x))
    spec = np.abs(np.fft.rfft(w, 8 * len(w)))
    measured = np.argmax(spec) * SR / (8 * len(w))
    cents = 1200 * math.log2(measured / mk.midi_to_hz(midi))
    check(f'rendered {mk.note_name(midi)} measures at the right pitch', abs(cents) < 3, f'{measured:.2f} Hz, {cents:+.2f} cents')
x = synth.saw(220.0, SR, max_harmonics=8)
spec = np.abs(np.fft.rfft(x))
h = [spec[220 * k] for k in range(1, 9)]
check('saw wave harmonics fall off as 1/k (Fourier series of a sawtooth)',
      all(close(h[k] / h[0], 1 / (k + 1), 0.01) for k in range(8)), ' '.join(f'{v / h[0]:.3f}' for v in h))
check('saw wave has nothing above its last harmonic (no aliasing)', spec[220 * 9:].max() < 1e-6 * h[0])

# ---- stereo: equal-power panning keeps total power constant ----------------------------------------
mono = np.ones(8)
power = [float((synth.pan(mono, p) ** 2).sum(axis=1)[0]) for p in np.linspace(0, 1, 21)]
check('equal-power pan: left^2 + right^2 = 1 at every position', all(close(v, 1.0, 1e-12) for v in power))
L, R = synth.pan(mono, 0.0)[0]
check('pan 0 is fully left, pan 1 fully right, pan 0.5 is -3.01 dB each side',
      close(L, 1, 1e-12) and close(R, 0, 1e-12) and close(synth.pan(mono, 1.0)[0][1], 1, 1e-12)
      and close(20 * math.log10(synth.pan(mono, 0.5)[0][0]), -3.0103, 1e-3))

# ---- level: decibels and the WAV writer -------------------------------------------------------------
check('dB = 20*log10(amplitude): 1 -> 0 dB, 0.5 -> -6.02 dB, 0.1 -> -20 dB',
      close(float(wavio.db(1.0)), 0, 1e-9) and close(float(wavio.db(0.5)), -6.0206, 1e-3) and close(float(wavio.db(0.1)), -20, 1e-9))
tmp = tempfile.mkdtemp()
t = np.arange(SR) / SR
path = os.path.join(tmp, 'a.wav')
wavio.write_wav(path, 0.3 * np.sin(2 * np.pi * 1000 * t))
with open(path, 'rb') as fh:
    raw = fh.read()
riff, _, wave_id, fmt, _, tag, ch, rate, byte_rate, align, bits = struct.unpack('<4sI4s4sIHHIIHH', raw[:36])
check('WAV header is canonical 16-bit PCM', (riff, wave_id, fmt, tag, bits, rate) == (b'RIFF', b'WAVE', b'fmt ', 1, 16, SR)
      and byte_rate == rate * ch * 2 and align == ch * 2, f'{ch} ch, {rate} Hz, {bits} bit')
sr2, y = wavio.read_wav(path)
peak_db = 20 * math.log10(np.abs(y).max())
check('written file peaks at the stated -1 dBFS and never clips', close(peak_db, -1.0, 0.05) and np.abs(y).max() < 1.0, f'{peak_db:.2f} dBFS')
spec = np.abs(np.fft.rfft(y[:, 0]))
check('a 1000 Hz tone is still 1000 Hz after writing and reading back', int(np.argmax(spec)) == 1000)

# ---- filter: one-pole low-pass has -3 dB at its cut-off ---------------------------------------------
fc = 1000.0
imp = np.zeros(SR)
imp[0] = 1.0
Hf = np.abs(np.fft.rfft(synth.one_pole_lp(imp, fc)))
gain_db = 20 * math.log10(Hf[int(fc)] / Hf[0])
check('one-pole low-pass is about -3 dB at the cut-off frequency', close(gain_db, -3.0, 0.5), f'{gain_db:.2f} dB at {fc:.0f} Hz')
check('low-pass passes DC unchanged and falls off above the cut-off', close(Hf[0], 1.0, 1e-3) and Hf[8000] < Hf[2000] < Hf[500])

# ---- envelope ---------------------------------------------------------------------------------------
env = synth.adsr(SR, attack=0.1, decay=0.2, sustain=0.5, release=0.3)
check('ADSR: starts at 0, peaks at 1 after the attack, holds the sustain level, ends at 0',
      close(env[0], 0, 1e-3) and close(env.max(), 1.0, 1e-3) and close(int(np.argmax(env)) / SR, 0.1, 0.002)
      and close(env[int(0.5 * SR)], 0.5, 1e-3) and close(env[-1], 0, 1e-2))

# ---- rhythm: Euclidean patterns from Toussaint (2005), "The Euclidean algorithm generates traditional musical rhythms"
TOUSSAINT = {(1, 4): 'x...', (2, 3): 'x.x', (2, 5): 'x.x..', (3, 4): 'x.xx', (3, 5): 'x.x.x', (3, 7): 'x.x.x..', (3, 8): 'x..x..x.',
             (4, 7): 'x.x.x.x', (4, 9): 'x.x.x.x..', (4, 12): 'x..x..x..x..', (5, 6): 'x.xxxx', (5, 8): 'x.xx.xx.', (5, 9): 'x.x.x.x.x',
             (5, 12): 'x..x.x..x.x.', (5, 16): 'x..x..x..x..x...', (7, 8): 'x.xxxxxx', (7, 12): 'x.xx.x.xx.x.', (7, 16): 'x..x.x.x..x.x.x.',
             (9, 16): 'x.xx.x.x.xx.x.x.', (11, 24): 'x..x.x.x.x.x..x.x.x.x.x.', (13, 24): 'x.xx.x.x.x.x.xx.x.x.x.x.'}
bad = [f'E{k}' for k, want in TOUSSAINT.items() if mk.pattern(mk.euclid(*k)) != want]
check('Euclidean rhythms match 21 patterns printed in Toussaint 2005', not bad, 'mismatch: ' + ', '.join(bad) if bad else '')
check('Euclidean rhythm always has exactly k hits in n steps', all(sum(mk.euclid(k, n)) == k for n in range(1, 17) for k in range(0, n + 1)))

# ---- colour: sRGB -> OKLab (Ottosson 2020) -----------------------------------------------------------
OK_REF = {(255, 255, 255): (1.0, 0.0, 0.0), (255, 0, 0): (0.62796, 0.22486, 0.12585), (0, 255, 0): (0.86644, -0.23389, 0.17950),
          (0, 0, 255): (0.45201, -0.03246, -0.31153), (0, 0, 0): (0.0, 0.0, 0.0)}      # published reference values
worst = max(float(np.abs(p5.srgb_to_oklab(np.array(rgb, np.uint8)) - np.array(lab)).max()) for rgb, lab in OK_REF.items())
check('sRGB -> OKLab matches the published values for white, red, green, blue, black', worst < 5e-4, f'largest error {worst:.5f}')
rgb = np.random.default_rng(0).integers(0, 256, (500, 3), dtype=np.uint8)
back = np.round(np.clip(p5.oklab_to_srgb(p5.srgb_to_oklab(rgb)), 0, 1) * 255)
check('OKLab -> sRGB undoes sRGB -> OKLab', float(np.abs(back - rgb).max()) <= 1)

# ---- colourmap inversion on the REAL NASA colour bar ------------------------------------------------
bar = np.fromfile(os.path.join(HERE, 'data', 'cbar_310x95_rgba.raw'), dtype=np.uint8).reshape(95, 310, 4)
strip = bar[30:67, 16:290, :3]
legend = p5.legend_from_strip(strip)
truth = np.linspace(0, 1, strip.shape[1])
for hue_only in (False, True):
    got = p5.invert_colormap(strip, legend, hue_only=hue_only)
    err = np.abs(np.nanmean(got, axis=0) - truth)
    kept = float(np.isfinite(got).mean())
    check(f'reading the real colour bar back gives a straight 0..1 ramp ({"hue only" if hue_only else "full colour"})',
          kept > 0.95 and float(np.nanmax(err)) < 0.03, f'{kept:.0%} read, mean error {32 * float(np.nanmean(err)):.2f} C, worst {32 * float(np.nanmax(err)):.2f} C')
steps = np.diff(np.unwrap(np.arctan2(p5.srgb_to_oklab(legend)[:, 2], p5.srgb_to_oklab(legend)[:, 1])))
against = int((steps * np.sign(steps.sum()) < -0.01).sum())
check('the hue of the colour bar moves in one direction only (needed for hue-only reading to be unambiguous)',
      against == 0, f'{against} backward steps over {len(legend)} colours, {abs(np.degrees(steps.sum())):.0f} degrees of hue in total')

# ---- column scan: rows map to the stated frequency range, top row highest ----------------------------
img = np.zeros((16, 8))
img[0, :] = 1.0                                           # only the TOP row is bright
audio, freqs = p4.colscan(img, dur=1.0, f_lo=110.0, f_hi=3520.0)
spec = np.abs(np.fft.rfft(audio.sum(axis=1)))
check('column scan: top row = highest frequency, and that is the pitch actually heard',
      close(freqs[0], 3520.0, 1e-6) and close(freqs[-1], 110.0, 1e-6) and abs(int(np.argmax(spec)) - 3520) <= 2,
      f'rows span {freqs[-1]:.0f}..{freqs[0]:.0f} Hz, heard {int(np.argmax(spec))} Hz')

print(f'\n{"ALL FORMULA CHECKS PASSED" if not fails else str(fails) + " FAILED"}')
sys.exit(1 if fails else 0)
