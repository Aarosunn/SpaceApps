"""wavio.py (recipe P1) - write float audio to a 16-bit PCM WAV file.
Needs: numpy + the Python standard library. Every later recipe imports this file."""
import os
import wave

import numpy as np

SR = 44100  # sample rate in Hz (audio samples per second) used by every recipe


def db(x):
    """Amplitude ratio -> decibels. 1.0 -> 0 dB, 0.5 -> about -6 dB, 0.1 -> -20 dB."""
    return 20.0 * np.log10(np.maximum(x, 1e-12))


def soft_limit(x, drive=1.0):
    """tanh soft limiter for a signal whose peak is 1.0. The peak stays at 1.0; quieter samples are
    lifted (drive=1.0: a sample at 0.5 comes out at 0.61), so rare loud spikes cost less loudness.
    Larger drive squashes harder (and distorts more). Use drive=0 in master() to switch it off."""
    return np.tanh(drive * x) / np.tanh(drive)


def master(x, headroom_db=-1.0, fade_ms=10.0, drive=1.0, sr=SR):
    """Float array (n,) or (n, channels) at any level -> float array (n, channels) ready for 16-bit:
    1) scale so the loudest sample is 1.0          (peak normalisation)
    2) soft-limit with tanh                        (see soft_limit)
    3) scale the peak down to headroom_db dBFS     (-1 dBFS = 0.891 of full scale)
    4) fade the first and last fade_ms milliseconds so the file starts and ends at zero (no click)."""
    x = np.array(x, dtype=np.float64)              # a copy: the caller's array is never changed
    if x.ndim == 1:
        x = x[:, None]
    peak = np.max(np.abs(x))
    if peak > 0:
        x /= peak
        if drive > 0:
            x = soft_limit(x, drive)
        x *= 10.0 ** (headroom_db / 20.0)
    n_fade = min(int(sr * fade_ms / 1000.0), len(x) // 2)
    if n_fade > 0:
        ramp = 0.5 - 0.5 * np.cos(np.linspace(0.0, np.pi, n_fade))    # 0 -> 1, smooth (raised cosine)
        x[:n_fade] *= ramp[:, None]
        x[-n_fade:] *= ramp[::-1, None]
    return x


def write_wav(path, x, sr=SR, **master_options):
    """Master x (see master) and write it as 16-bit PCM. Returns the mastered float array."""
    y = master(x, sr=sr, **master_options)
    pcm = np.round(y * 32767.0).astype('<i2')      # little-endian signed 16-bit integers
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(y.shape[1])
        w.setsampwidth(2)                          # bytes per sample: 2 = 16 bit
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())               # rows are frames, so stereo is stored L R L R ...
    return y


def read_wav(path):
    """16-bit PCM WAV -> (sample_rate, float array (n, channels) in -1..1)."""
    with wave.open(str(path), 'rb') as w:
        assert w.getsampwidth() == 2, 'only 16-bit PCM is handled here'
        sr, channels = w.getframerate(), w.getnchannels()
        raw = w.readframes(w.getnframes())
    return sr, np.frombuffer(raw, dtype='<i2').reshape(-1, channels) / 32767.0


def check_wav(path, sr=SR, channels=2, dur=None, dur_tol=0.01, min_rms_db=-50.0, max_peak_db=-0.5):
    """Reopen a WAV with the wave module and assert it is what we meant to write.
    Prints one line of facts and returns the samples as a float array (n, channels)."""
    got_sr, x = read_wav(path)
    seconds = len(x) / got_sr
    peak_db = float(db(np.max(np.abs(x))))
    rms_db = float(db(np.sqrt(np.mean(x ** 2))))
    assert got_sr == sr, f'sample rate {got_sr} != {sr}'
    assert x.shape[1] == channels, f'{x.shape[1]} channels != {channels}'
    assert dur is None or abs(seconds - dur) <= dur_tol, f'duration {seconds:.3f} s != {dur:.3f} s'
    assert rms_db > min_rms_db, f'file is silent or nearly silent (rms {rms_db:.1f} dBFS)'
    assert peak_db <= max_peak_db, f'peak {peak_db:.2f} dBFS is above {max_peak_db} dBFS'
    print(f'OK {os.path.basename(str(path))}: {got_sr} Hz, {x.shape[1]} ch, 16-bit, {seconds:.3f} s, '
          f'peak {peak_db:.2f} dBFS, rms {rms_db:.1f} dBFS')
    return x


if __name__ == '__main__':
    t = np.arange(SR) / SR                                         # one second of time stamps

    loud = 3.0 * np.sin(2 * np.pi * 440.0 * t)                     # deliberately 3x over full scale
    write_wav('p1_mono.wav', loud)
    x = check_wav('p1_mono.wav', channels=1, dur=1.0)
    assert abs(float(db(np.max(np.abs(x)))) + 1.0) < 0.01          # peak sits at the -1 dBFS headroom
    assert x[0, 0] == 0.0 and x[-1, 0] == 0.0                      # the fades reach exactly zero

    stereo = np.stack([np.sin(2 * np.pi * 330.0 * t), 0.2 * np.sin(2 * np.pi * 550.0 * t)], axis=1)
    write_wav('p1_stereo.wav', stereo)
    y = check_wav('p1_stereo.wav', channels=2, dur=1.0)
    left_rms, right_rms = np.sqrt(np.mean(y ** 2, axis=0))
    assert left_rms > 3 * right_rms                                # channels are not swapped or summed

    s = soft_limit(np.linspace(-1.0, 1.0, 201))
    assert np.all(np.diff(s) > 0) and abs(s[-1] - 1.0) < 1e-12     # monotonic, peak stays at 1
    print(f'soft_limit(0.5) = {soft_limit(0.5):.3f} at drive 1.0, {soft_limit(0.5, 2.0):.3f} at drive 2.0')

    spec = np.abs(np.fft.rfft(master(np.sin(2 * np.pi * 440.0 * t), fade_ms=0)[:, 0]))
    print(f'full-scale 440 Hz sine through the limiter: 3rd harmonic at {float(db(spec[1320] / spec[440])):.1f} dB')

    write_wav('p1_silence.wav', np.zeros(SR))                      # silent input must not crash ...
    try:
        check_wav('p1_silence.wav', channels=1)
        raise SystemExit('FAIL: silence was not detected')
    except AssertionError as err:                                  # ... and the checker must catch it
        print('silence correctly rejected:', err)
    print('P1 all checks passed')
