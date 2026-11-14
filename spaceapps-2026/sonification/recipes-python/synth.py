"""synth.py (recipe P2) - small synthesiser building blocks in numpy.
Needs: numpy + wavio.py (recipe P1). Mono signals are arrays (n,); stereo signals are (n, 2)."""
import numpy as np

import wavio

SR = wavio.SR


def phase(freq, n, sr=SR):
    """Phase (radians) of an oscillator for n samples. `freq` is a number in Hz or an array of n values
    (a glide). Phase is the running sum of frequency; summing is what keeps a glide free of clicks."""
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,))
    return 2.0 * np.pi * (np.cumsum(f) - f[0]) / sr


def sine(freq, n, sr=SR):
    """Pure tone: one frequency, no overtones. Sounds like a soft whistle."""
    return np.sin(phase(freq, n, sr))


def saw(freq, n, sr=SR, max_harmonics=40):
    """Band-limited sawtooth: the sum of sines at f, 2f, 3f, ... with amplitudes 1, 1/2, 1/3, ...
    Bright and buzzy; fewer harmonics = duller. Harmonics at or above sr/2 (the Nyquist limit) are
    left out, because a sampled signal cannot hold them and they would come back as wrong notes."""
    ph = phase(freq, n, sr)
    f_max = float(np.max(freq))
    out = np.zeros(n)
    for k in range(1, max_harmonics + 1):
        if k * f_max >= sr / 2:
            break
        out += np.sin(k * ph) / k
    return out * (2.0 / np.pi)


def adsr(n, attack=0.01, decay=0.1, sustain=0.7, release=0.2, sr=SR):
    """Attack-Decay-Sustain-Release envelope: n loudness values in 0..1 to multiply a tone with.
    Rises 0 -> 1 in `attack` s, falls to the `sustain` level in `decay` s, holds, then falls to 0
    during the last `release` s. Times are shrunk in proportion if the note is too short for them."""
    a, d, r = (max(1, int(round(x * sr))) for x in (attack, decay, release))
    if a + d + r > n:
        shrink = n / (a + d + r)
        a, d = max(1, int(a * shrink)), max(1, int(d * shrink))
        r = max(1, n - a - d)
    env = np.full(n, float(sustain))
    env[:a] = np.linspace(0.0, 1.0, a, endpoint=False)
    env[a:a + d] = np.linspace(1.0, sustain, d, endpoint=False)
    env[n - r:] = sustain * np.linspace(1.0, 0.0, r)
    return env


def perc_env(n, tau=0.06, sr=SR):
    """Percussive envelope: instant attack, exponential decay (level falls to 37 % every `tau` s)."""
    return np.exp(-np.arange(n) / (tau * sr))


def one_pole_lp(x, cutoff, sr=SR):
    """One-pole low-pass filter: y[i] = y[i-1] + a * (x[i] - y[i-1]) with a = 1 - exp(-2*pi*cutoff/sr).
    Content above `cutoff` Hz gets quieter by 6 dB per octave (duller sound). `cutoff` may be an array
    of len(x) values (a filter sweep). Each output needs the previous one, hence the plain loop."""
    a = 1.0 - np.exp(-2.0 * np.pi * np.broadcast_to(np.asarray(cutoff, dtype=np.float64), x.shape) / sr)
    y, out = 0.0, []
    for xi, ai in zip(x.tolist(), a.tolist()):
        y += ai * (xi - y)
        out.append(y)
    return np.array(out)


def pan(mono, x):
    """Equal-power pan: mono (n,) -> stereo (n, 2). x = 0 hard left, 0.5 centre, 1 hard right; a number
    or an array of n values. Gains are cos and sin of x*pi/2, so left^2 + right^2 = 1 everywhere and
    the sound does not get quieter as it crosses the middle."""
    theta = np.clip(x, 0.0, 1.0) * (np.pi / 2.0)
    return np.stack([mono * np.cos(theta), mono * np.sin(theta)], axis=1)


def mix_in(buf, sig, start, gain=1.0, sr=SR):
    """Add stereo `sig` (n, 2) into the stereo buffer `buf` at `start` seconds (cut off at the end)."""
    s = int(round(start * sr))
    n = min(len(sig), len(buf) - s)
    if n > 0:
        buf[s:s + n] += gain * sig[:n]


def _comb(x, delay, g):
    """Feedback comb filter y[i] = x[i] + g * y[i - delay]: an echo that repeats every `delay` samples,
    each repeat g times quieter. Computed one delay-length block at a time (fast in numpy)."""
    y = x.copy()
    for start in range(delay, len(x), delay):
        seg = y[start:start + delay]
        seg += g * y[start - delay:start - delay + len(seg)]
    return y


def _allpass(x, delay, g=0.5):
    """Schroeder all-pass y[i] = -g*x[i] + x[i-delay] + g*y[i-delay]: multiplies the number of echoes
    without changing the balance of low and high frequencies."""
    y = -g * x
    for start in range(delay, len(x), delay):
        seg = y[start:start + delay]
        prev = slice(start - delay, start - delay + len(seg))
        seg += x[prev] + g * y[prev]
    return y


COMB_DELAYS = (1117, 1277, 1429, 1559)      # samples (25 to 35 ms); prime numbers, so echoes never line up
ALLPASS_DELAYS = (557, 223)
STEREO_SPREAD = 23                          # extra delay (samples) on the right channel -> wider sound


def reverb(stereo, rt60=1.8, wet=0.25, sr=SR):
    """Small Schroeder reverb: 4 parallel feedback combs, then 2 all-passes, per channel.
    rt60 = seconds for the tail to fade by 60 dB; wet = share of reverb in the output (0..1).
    End the input with about rt60 seconds of silence so the tail has room to ring out."""
    out = np.empty_like(stereo)
    for ch in range(stereo.shape[1]):
        x = stereo[:, ch]
        acc = np.zeros(len(x))
        for delay in COMB_DELAYS:
            d = delay + STEREO_SPREAD * ch
            acc += _comb(x, d, 10.0 ** (-3.0 * d / (rt60 * sr)))    # gain that gives -60 dB after rt60
        acc /= len(COMB_DELAYS)
        for delay in ALLPASS_DELAYS:
            acc = _allpass(acc, delay + STEREO_SPREAD * ch)
        out[:, ch] = (1.0 - wet) * x + wet * acc
    return out


def voice(freq, dur, harmonics=8, attack=0.01, decay=0.1, sustain=0.6, release=0.15, sr=SR):
    """One note, mono: a saw with `harmonics` overtones (1 = pure sine) shaped by an ADSR envelope."""
    n = int(round(dur * sr))
    return saw(freq, n, sr, max_harmonics=harmonics) * adsr(n, attack, decay, sustain, release, sr)


def peak_hz(x, sr=SR):
    """Frequency (Hz) of the strongest component of a mono signal (used by the self-tests)."""
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x))))
    return float(np.argmax(spec)) * sr / len(x)


def centroid_hz(x, sr=SR):
    """Spectral centroid (Hz): the "centre of mass" of the spectrum, a standard number for brightness."""
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x))))
    return float(np.sum(np.arange(len(spec)) * spec) / np.sum(spec)) * sr / len(x)


if __name__ == '__main__':
    rms = lambda v: float(np.sqrt(np.mean(v ** 2)))

    # oscillators ---------------------------------------------------------------------------------
    assert abs(peak_hz(sine(440.0, SR)) - 440.0) <= 1.0
    spec = np.abs(np.fft.rfft(saw(110.0, SR)))                       # 1 Hz per bin
    assert abs(spec[220] / spec[110] - 1 / 2) < 0.01 and abs(spec[330] / spec[110] - 1 / 3) < 0.01
    assert spec[110 * 41:].max() < 1e-6 * spec[110]                  # nothing above the 40th harmonic
    spec = np.abs(np.fft.rfft(saw(3000.0, SR)))
    others = np.delete(spec, np.arange(3000, len(spec), 3000))
    assert others.max() < 1e-6 * spec[3000]                          # 7 harmonics fit below 22050 Hz: no aliasing
    glide = sine(np.linspace(220.0, 440.0, SR), SR)                  # a glide: frequency given per sample
    assert peak_hz(glide[:SR // 8]) < peak_hz(glide[-SR // 8:]) and np.max(np.abs(np.diff(glide))) < 0.07

    # envelopes -----------------------------------------------------------------------------------
    env = adsr(SR, attack=0.01, decay=0.1, sustain=0.6, release=0.2)
    assert env[0] == 0.0 and env[441] == 1.0 and env[SR // 2] == 0.6 and env[-1] == 0.0
    assert env.min() >= 0.0 and env.max() == 1.0 and len(adsr(100)) == 100 and adsr(100)[-1] == 0.0
    assert abs(perc_env(SR, tau=0.06)[int(0.06 * SR)] - np.exp(-1)) < 1e-3

    # filter: a sine at the cutoff loses 3 dB (x0.707); three octaves higher it is much quieter ----
    for f, lo, hi in ((1000.0, 0.69, 0.72), (8000.0, 0.10, 0.16)):
        tone = sine(f, SR)
        gain = rms(one_pole_lp(tone, 1000.0)[SR // 2:]) / rms(tone[SR // 2:])
        assert lo < gain < hi, (f, gain)
    sweep = one_pole_lp(saw(110.0, SR), np.linspace(200.0, 6000.0, SR))    # opening filter sweep
    assert centroid_hz(sweep[-SR // 4:]) > 1.3 * centroid_hz(sweep[:SR // 4])   # it gets brighter

    # pan -----------------------------------------------------------------------------------------
    for x in np.linspace(0.0, 1.0, 11):
        left, right = pan(np.ones(1), x)[0]
        assert abs(left ** 2 + right ** 2 - 1.0) < 1e-12
    assert np.allclose(pan(np.ones(1), 0.5), [[np.sqrt(0.5), np.sqrt(0.5)]])
    assert np.allclose(pan(np.ones(1), 0.0), [[1.0, 0.0]]) and np.allclose(pan(np.ones(1), 1.0), [[0.0, 1.0]])

    # reverb: the fast block versions must equal the textbook one-sample-at-a-time equations -------
    rng = np.random.default_rng(0)
    x = rng.standard_normal(5000)
    slow_c, slow_a = np.zeros(5000), np.zeros(5000)
    for i in range(5000):
        slow_c[i] = x[i] + (0.8 * slow_c[i - 700] if i >= 700 else 0.0)
        slow_a[i] = -0.5 * x[i] + ((x[i - 700] + 0.5 * slow_a[i - 700]) if i >= 700 else 0.0)
    assert np.allclose(_comb(x, 700, 0.8), slow_c) and np.allclose(_allpass(x, 700, 0.5), slow_a)
    assert all(all(d % p for p in range(2, int(d ** 0.5) + 1)) for d in COMB_DELAYS + ALLPASS_DELAYS)
    click = np.zeros((3 * SR, 2))
    click[0] = 1.0
    tail = reverb(click, rt60=1.0, wet=1.0)
    early, late = rms(tail[int(0.05 * SR):int(0.15 * SR)]), rms(tail[int(1.05 * SR):int(1.15 * SR)])
    print(f'reverb tail level drop from 0.1 s to 1.1 s at rt60 = 1.0 s: {wavio.db(late / early):.1f} dB (design: -60)')
    assert -66.0 < wavio.db(late / early) < -54.0

    # test phrase: an arpeggio through oscillator -> filter -> envelope -> pan -> reverb ------------
    notes = [57, 60, 64, 67, 69, 72, 69, 67, 64, 60, 57]            # A minor 7 arpeggio, up and down
    step = 0.25
    buf = np.zeros((int((len(notes) * step + 2.5) * SR), 2))
    for i, m in enumerate(notes):
        n = int(0.4 * SR)
        tone = saw(440.0 * 2 ** ((m - 69) / 12), n)
        tone = one_pole_lp(tone, 2500.0) * adsr(n, 0.005, 0.08, 0.5, 0.2)
        mix_in(buf, pan(tone, i / (len(notes) - 1)), i * step)       # walks from left to right
    wavio.write_wav('p2_phrase.wav', reverb(buf, rt60=1.8, wet=0.25))
    y = wavio.check_wav('p2_phrase.wav', channels=2, dur=len(notes) * step + 2.5)
    first, last = y[:int(0.4 * SR)], y[int(10 * step * SR):int((10 * step + 0.4) * SR)]
    assert rms(first[:, 0]) > 2 * rms(first[:, 1]) and rms(last[:, 1]) > 2 * rms(last[:, 0])
    assert abs(peak_hz(first[:, 0]) - 220.0) < 3.0                  # first note is A3 = 220 Hz
    print('P2 all checks passed')
