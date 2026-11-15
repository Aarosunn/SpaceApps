"""musickit.py (recipe P3) - notes, scales, chords and Euclidean rhythms.
Needs: the Python standard library only (no numpy), so it also runs inside the MIDI recipe."""
import math

A4_MIDI, A4_HZ = 69, 440.0          # tuning reference: MIDI note 69 is the A above middle C, 440 Hz


def midi_to_hz(m):
    """MIDI note number -> frequency in Hz. One semitone = a factor of 2**(1/12); 12 semitones = x2."""
    return A4_HZ * 2.0 ** ((m - A4_MIDI) / 12.0)


def hz_to_midi(f):
    """Frequency in Hz -> (fractional) MIDI note number."""
    return A4_MIDI + 12.0 * math.log2(f / A4_HZ)


NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def note_name(m):
    """60 -> 'C4' (the convention in which middle C, MIDI 60, is called C4)."""
    return NOTE_NAMES[m % 12] + str(m // 12 - 1)


SCALES = {                           # semitones above the root, for one octave
    'major':            [0, 2, 4, 5, 7, 9, 11],
    'minor':            [0, 2, 3, 5, 7, 8, 10],      # natural minor
    'dorian':           [0, 2, 3, 5, 7, 9, 10],
    'lydian':           [0, 2, 4, 6, 7, 9, 11],
    'pentatonic_major': [0, 2, 4, 7, 9],
    'pentatonic_minor': [0, 3, 5, 7, 10],
    'whole_tone':       [0, 2, 4, 6, 8, 10],
    'chromatic':        list(range(12)),
}


def scale_notes(root=48, scale='pentatonic_major', octaves=2):
    """All MIDI notes of the scale from `root` up to and including the root `octaves` octaves higher."""
    return [root + 12 * o + s for o in range(octaves) for s in SCALES[scale]] + [root + 12 * octaves]


def quantize(v, root=48, scale='pentatonic_major', octaves=2):
    """Value in 0..1 -> a note of the scale. The 0..1 range is cut into equal bins, one per note:
    0 gives the root, 1 gives the top note, and a larger value never gives a lower note."""
    notes = scale_notes(root, scale, octaves)
    v = min(1.0, max(0.0, v))
    return notes[min(len(notes) - 1, int(v * len(notes)))]


CHORDS = {                           # semitones above the chord root
    'maj': [0, 4, 7], 'min': [0, 3, 7], 'dim': [0, 3, 6], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7],
    'maj7': [0, 4, 7, 11], 'min7': [0, 3, 7, 10], 'dom7': [0, 4, 7, 10], 'power': [0, 7, 12],
}


def chord(root, kind='maj'):
    """Chord as a list of MIDI notes, e.g. chord(60, 'min') -> [60, 63, 67]."""
    return [root + s for s in CHORDS[kind]]


def scale_chord(root=48, scale='major', degree=1, size=3):
    """Chord made only of scale notes: start on scale degree `degree` (1 = the root) and take every
    other scale note. In a 7-note scale this gives the usual triads (C major: 1 -> C E G, 2 -> D F A)."""
    steps = SCALES[scale]
    idx = [degree - 1 + 2 * i for i in range(size)]
    return [root + 12 * (i // len(steps)) + steps[i % len(steps)] for i in idx]


def euclid(k, n):
    """Euclidean rhythm E(k, n) by Bjorklund's algorithm: k onsets spread as evenly as possible over
    n steps. Returns a list of n ones (onset) and zeros (rest); it always starts with an onset."""
    if k <= 0:
        return [0] * n
    if k >= n:
        return [1] * n
    groups, rest = [[1] for _ in range(k)], [[0] for _ in range(n - k)]
    while True:                                  # pair off: append one remainder group to each group
        m = min(len(groups), len(rest))
        paired = [groups[i] + rest[i] for i in range(m)]
        rest = groups[m:] if len(groups) > m else rest[m:]
        groups = paired
        if len(rest) <= 1:                       # always pair at least once, so E(3,4) is x.xx and not xxx.
            break
    return [step for g in groups + rest for step in g]


def pattern(steps):
    """[1, 0, 0, 1] -> 'x..x'"""
    return ''.join('x' if s else '.' for s in steps)


if __name__ == '__main__':
    # --- pitch -------------------------------------------------------------------------------
    assert midi_to_hz(69) == 440.0
    assert abs(midi_to_hz(60) - 261.6256) < 1e-4                    # middle C
    assert abs(midi_to_hz(81) - 880.0) < 1e-9                       # one octave up = double
    assert abs(hz_to_midi(440.0) - 69.0) < 1e-12 and abs(hz_to_midi(midi_to_hz(52.5)) - 52.5) < 1e-9
    assert note_name(60) == 'C4' and note_name(69) == 'A4' and note_name(45) == 'A2'

    # --- scales and quantisation -------------------------------------------------------------
    assert scale_notes(60, 'major', 1) == [60, 62, 64, 65, 67, 69, 71, 72]
    assert scale_notes(48, 'pentatonic_major', 2) == [48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72]
    assert quantize(0.0) == 48 and quantize(1.0) == 72 and quantize(-3) == 48 and quantize(9) == 72
    qs = [quantize(i / 1000) for i in range(1001)]
    assert all(b >= a for a, b in zip(qs, qs[1:]))                  # monotonic: never goes down
    assert set(qs) == set(scale_notes(48, 'pentatonic_major', 2))   # every note is reachable
    assert all((q - 48) % 12 in SCALES['pentatonic_major'] for q in qs)
    print('quantize: 11 notes over 2 octaves -> each note covers', round(1 / 11, 4), 'of the value range')

    # --- chords ------------------------------------------------------------------------------
    assert chord(60, 'maj') == [60, 64, 67] and chord(57, 'min') == [57, 60, 64]
    assert scale_chord(60, 'major', 1) == [60, 64, 67]              # C E G
    assert scale_chord(60, 'major', 2) == [62, 65, 69]              # D F A  (a minor chord)
    assert scale_chord(60, 'major', 7) == [71, 74, 77]              # B D F  (a diminished chord)
    assert scale_chord(60, 'major', 5, size=4) == [67, 71, 74, 77]  # G B D F (dominant seventh)

    # --- Euclidean rhythms: every pattern below is printed in Toussaint (2005) ------------------
    paper = {
        (1, 2): 'x.', (1, 3): 'x..', (1, 4): 'x...', (4, 12): 'x..x..x..x..',
        (2, 3): 'x.x', (2, 5): 'x.x..', (3, 4): 'x.xx', (3, 5): 'x.x.x', (3, 7): 'x.x.x..',
        (3, 8): 'x..x..x.', (4, 7): 'x.x.x.x', (4, 9): 'x.x.x.x..', (4, 11): 'x..x..x..x.',
        (5, 6): 'x.xxxx', (5, 7): 'x.xx.xx', (5, 8): 'x.xx.xx.', (5, 9): 'x.x.x.x.x',
        (5, 11): 'x.x.x.x.x..', (5, 12): 'x..x.x..x.x.', (5, 13): 'x..x.x..x.x..',
        (5, 16): 'x..x..x..x..x...', (7, 8): 'x.xxxxxx', (7, 12): 'x.xx.x.xx.x.',
        (7, 16): 'x..x.x.x..x.x.x.', (9, 16): 'x.xx.x.x.xx.x.x.',
        (11, 24): 'x..x.x.x.x.x..x.x.x.x.x.', (13, 24): 'x.xx.x.x.x.x.xx.x.x.x.x.',
    }
    exact = 0
    for (k, n), want in paper.items():
        got = pattern(euclid(k, n))
        assert len(got) == n and got.count('x') == k and got[0] == 'x'
        assert got in [want[r:] + want[:r] for r in range(n)], (k, n, got, want)   # same necklace
        exact += got == want
    print(f'euclid: {len(paper)} patterns from the paper reproduced, {exact} of them with the same starting point')
    assert pattern(euclid(3, 8)) == 'x..x..x.' and pattern(euclid(5, 8)) == 'x.xx.xx.'
    assert euclid(0, 4) == [0, 0, 0, 0] and euclid(4, 4) == [1, 1, 1, 1]
    for n in range(1, 33):                                          # every k, n: right length and count
        for k in range(0, n + 1):
            assert len(euclid(k, n)) == n and sum(euclid(k, n)) == k
    print('E(3,8) =', pattern(euclid(3, 8)), '  E(5,8) =', pattern(euclid(5, 8)), '  E(5,16) =', pattern(euclid(5, 16)))
    print('P3 all checks passed')
