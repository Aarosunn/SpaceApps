"""Synthesise the video's sound effects (no samples, no downloads): whoosh, riser, impact, pop, end chord.
Run: python3 capture/make_sfx.py  -> public/sfx/*.wav"""
import os, wave
import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def save(name, x, peak=0.8):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.abs(x).max() + 1e-9) * peak
    stereo = np.stack([x, x], axis=1) if x.ndim == 1 else x
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((stereo * 32767).astype("<i2").tobytes())

def lowpass_sweep(x, f0, f1):
    """One-pole low-pass whose cutoff glides from f0 to f1 (Hz)."""
    y = np.zeros_like(x); acc = 0.0
    fc = np.geomspace(f0, f1, len(x))
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc); y[i] = acc
    return y

def t(d): return np.arange(int(SR * d)) / SR

# whoosh: noise through a filter that opens then closes, bell-shaped loudness, panned left to right
d = 0.55; n = rng.standard_normal(int(SR * d))
half = len(n) // 2
y = np.concatenate([lowpass_sweep(n[:half], 300, 6000), lowpass_sweep(n[half:], 6000, 400)])
env = np.hanning(len(y)) ** 1.5
pan = np.linspace(0.15, 0.85, len(y))
save("whoosh.wav", np.stack([y * env * (1 - pan), y * env * pan], axis=1), 0.7)

# riser: rising tone + opening noise, growing louder
d = 2.6; tt = t(d)
f = 110 * (2 ** (tt / d * 3.2))
tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
noise = lowpass_sweep(rng.standard_normal(len(tt)), 200, 9000) * 0.6
save("riser.wav", (tone * 0.5 + noise) * (tt / d) ** 2.2, 0.75)

# impact: low thump + short noise burst
d = 1.2; tt = t(d)
thump = np.sin(2 * np.pi * (48 + 60 * np.exp(-tt * 18)) * tt) * np.exp(-tt * 4.5)
burst = lowpass_sweep(rng.standard_normal(len(tt)), 5000, 200) * np.exp(-tt * 14)
save("impact.wav", thump + 0.5 * burst, 0.9)

# pop: tiny pitched blip for captions
d = 0.12; tt = t(d)
save("pop.wav", np.sin(2 * np.pi * (900 + 500 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 38), 0.5)

# end chord: bell-like C major pentatonic arpeggio (C E G A C), FM bells with long tails
d = 4.2; tt = t(d); y = np.zeros_like(tt)
for i, midi in enumerate([60, 64, 67, 69, 72, 79]):
    hz = 440 * 2 ** ((midi - 69) / 12); st = int(SR * i * 0.11); ts = tt[: len(tt) - st]
    bell = np.sin(2 * np.pi * hz * ts + 2.2 * np.exp(-ts * 3) * np.sin(2 * np.pi * hz * 3.01 * ts)) * np.exp(-ts * 1.25)
    y[st:] += bell * (0.9 if i < 5 else 0.6)
y += 0.35 * np.sin(2 * np.pi * 130.81 * tt) * np.exp(-tt * 0.9)  # low C under it
save("endchord.wav", y, 0.8)
print("sfx:", sorted(os.listdir(OUT)))
