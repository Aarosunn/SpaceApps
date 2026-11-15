"""p4_colscan.py (recipe P4) - image column scan ("inverse spectrogram"): play a 2-D array.
Needs: numpy + wavio.py, synth.py, musickit.py (recipes P1 to P3)."""
import numpy as np

import musickit as mk
import synth
import wavio

SR = wavio.SR


def colscan(img, dur=6.0, f_lo=110.0, f_hi=3520.0, scale=None, root=45, octaves=5, tilt=0.5, seed=0):
    """img: 2-D array (rows, cols) with values 0..1, row 0 = top. Returns stereo audio (n, 2).

    Every row drives one sine oscillator (top row = highest pitch). The image is scanned left to
    right in `dur` seconds: the brightness of a row in the current column is the loudness of that
    row's oscillator, and the scan position is the stereo position (left edge = left ear).
      scale=None   one oscillator per row, frequencies spaced evenly in pitch from f_lo to f_hi
      scale='...'  rows are grouped onto the notes of that scale starting at MIDI note `root`
                   (loudness = mean brightness of the group), so every chord is in key
    tilt: each oscillator is scaled by (lowest_freq / freq) ** tilt so high rows do not screech."""
    img = np.asarray(img, dtype=np.float64)
    rows, cols = img.shape
    height = 1.0 - np.arange(rows) / max(rows - 1, 1)             # 1.0 at the top row, 0.0 at the bottom
    if scale is None:
        freqs = f_lo * (f_hi / f_lo) ** height
        amps = img
    else:
        notes = mk.scale_notes(root, scale, octaves)
        idx = np.minimum((height * len(notes)).astype(int), len(notes) - 1)    # row -> note number
        used = np.unique(idx)
        freqs = np.array([mk.midi_to_hz(notes[i]) for i in used])
        amps = np.stack([img[idx == i].mean(axis=0) for i in used])            # (notes, cols)
    n = int(dur * SR)
    t = np.arange(n) / SR
    col = np.linspace(0.0, cols - 1.0, n)                         # (fractional) column under the scan line
    rng = np.random.default_rng(seed)
    out = np.zeros(n)
    for f, a in zip(freqs, amps):
        loud = np.interp(col, np.arange(cols), a)                 # glide between columns: no clicks
        out += (freqs.min() / f) ** tilt * loud * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi))
    return synth.pan(out, col / max(cols - 1.0, 1.0)), freqs


def demo_image(rows=48, cols=128):
    """Synthetic test picture: a steady line, a rising diagonal, and a soft blob in the middle."""
    img = np.zeros((rows, cols))
    img[36, :] = 0.6                                              # horizontal line -> one steady low tone
    for c in range(cols):                                         # diagonal, bottom-left to top-right
        img[int(round((rows - 1) * (1 - c / (cols - 1)))), c] = 1.0
    yy, xx = np.mgrid[0:rows, 0:cols]
    img += 0.8 * np.exp(-(((yy - 12) / 4.0) ** 2 + ((xx - 64) / 10.0) ** 2))   # blob near the top, mid-scan
    return np.clip(img, 0.0, 1.0)


if __name__ == '__main__':
    rms = lambda v: float(np.sqrt(np.mean(v ** 2)))
    rows, cols = 48, 128

    # 1) one bright row -> one steady tone at exactly that row's frequency
    line = np.zeros((rows, cols))
    line[10, :] = 1.0
    audio, freqs = colscan(line, dur=2.0)
    got = synth.peak_hz(audio.sum(axis=1))
    print(f'row 10 of {rows}: expected {freqs[10]:.1f} Hz, measured {got:.1f} Hz')
    assert abs(got - freqs[10]) < 1.0
    assert abs(freqs[0] - 3520.0) < 1e-9 and abs(freqs[-1] - 110.0) < 1e-9     # top row high, bottom row low

    # 2) rising diagonal -> rising pitch, and the sound travels from the left ear to the right ear
    diag = np.zeros((rows, cols))
    for c in range(cols):
        diag[int(round((rows - 1) * (1 - c / (cols - 1)))), c] = 1.0
    audio, _ = colscan(diag, dur=4.0)
    fifths = np.array_split(audio.sum(axis=1), 5)
    pitches = [synth.peak_hz(part) for part in fifths]
    print('diagonal: strongest frequency in each fifth of the scan:', [round(p) for p in pitches])
    assert all(b > a for a, b in zip(pitches, pitches[1:]))
    q = len(audio) // 4
    assert rms(audio[:q, 0]) > 2 * rms(audio[:q, 1]) and rms(audio[-q:, 1]) > 2 * rms(audio[-q:, 0])

    # 3) scale variant: every oscillator is a note of the scale, and the diagonal still rises
    audio, freqs = colscan(diag, dur=4.0, scale='pentatonic_major', root=45, octaves=5)
    allowed = [mk.midi_to_hz(m) for m in mk.scale_notes(45, 'pentatonic_major', 5)]
    assert all(min(abs(f - a) for a in allowed) < 1e-9 for f in freqs)
    pitches = [synth.peak_hz(part) for part in np.array_split(audio.sum(axis=1), 5)]
    assert all(min(abs(p - a) for a in allowed) < 2.0 for p in pitches) and pitches[-1] > pitches[0]
    print(f'scale variant: {rows} rows share {len(freqs)} notes, {mk.note_name(45)} to {mk.note_name(45 + 60)}')

    # 4) the demo picture, both ways
    img = demo_image(rows, cols)
    for name, kw in (('p4_colscan_log.wav', {}), ('p4_colscan_scale.wav', {'scale': 'pentatonic_major'})):
        audio, _ = colscan(img, dur=6.0, **kw)
        wavio.write_wav(name, audio)
        wavio.check_wav(name, channels=2, dur=6.0)
    print('P4 all checks passed')
