"""p7_render.py (recipe P7, part 2) - render the notes from score.py to a stereo WAV.
Needs: numpy + wavio.py, synth.py, musickit.py, score.py and a timeline.json (recipe P6)."""
import json

import numpy as np

import musickit as mk
import score
import synth
import wavio

SR = wavio.SR
GAINS = {'pad': 0.12, 'lead': 0.80, 'ref': 1.20, 'event': 0.90, 'pulse': 0.25}   # mix level per track
SENDS = {'pad': 0.50, 'lead': 0.30, 'ref': 0.20, 'event': 0.35, 'pulse': 0.10}   # share sent to the reverb


def render_note(n, rng):
    """One note dict -> stereo array (samples, 2). The track decides the instrument."""
    f, vel, dur = mk.midi_to_hz(n['midi']), n['vel'], n['dur']
    if n['track'] == 'pad':                    # two saws detuned by -4 / +4 cents, one per ear: slow shimmer;
        h = 2 + int(round(10 * vel))           # more overtones (brighter) when the trend is higher
        left, right = (synth.voice(f * 2 ** (c / 1200), dur + 0.6, harmonics=h, attack=0.5, decay=0.3,
                                   sustain=0.8, release=0.6) for c in (-4, 4))
        return vel * np.stack([left, right], axis=1)
    if n['track'] == 'lead':                   # plucked, fairly bright
        tone = synth.voice(f, dur + 0.1, harmonics=8, attack=0.005, decay=0.15, sustain=0.45, release=0.1)
    elif n['track'] == 'ref':                  # pure sine: clearly a different instrument from the lead
        tone = synth.voice(f, dur, harmonics=1, attack=0.01, decay=0.1, sustain=0.6, release=0.1)
    else:
        m = int(round(dur * SR))
        noise = rng.standard_normal(m)
        if n['track'] == 'event':              # pitched "tok": decaying sine plus a 4 ms noise click
            tone = synth.sine(f, m) * synth.perc_env(m, 0.05) + 0.4 * noise * synth.perc_env(m, 0.004)
        else:                                  # pulse: a tick of hiss (noise minus its own low part)
            tone = (noise - synth.one_pole_lp(noise, 5000.0)) * synth.perc_env(m, 0.01)
    return vel * synth.pan(tone, n['pan'])


def render(notes, total, tail=2.0, seed=0):
    """notes -> (mix, stems). total = seconds of music; `tail` extra seconds let the reverb ring out.
    stems is a dict track -> stereo array before gain and reverb (handy for checks or a DAW)."""
    rng = np.random.default_rng(seed)
    stems = {k: np.zeros((int((total + tail) * SR), 2)) for k in GAINS}
    for n in notes:
        synth.mix_in(stems[n['track']], render_note(n, rng), n['t'])
    dry = sum(GAINS[k] * (1.0 - SENDS[k]) * stems[k] for k in stems)
    send = sum(GAINS[k] * SENDS[k] * stems[k] for k in stems)
    return dry + synth.reverb(send, rt60=1.8, wet=1.0), stems


if __name__ == '__main__':
    rms = lambda v: float(np.sqrt(np.mean(v ** 2)))
    at = lambda sec: int(round(sec * SR))
    with open('timeline.json') as fh:
        tl = json.load(fh)

    notes, info = score.make_score(tl)                               # with the 4 s audio legend
    mix, stems = render(notes, info['total'])
    wavio.write_wav('p7_piece.wav', mix)
    wavio.check_wav('p7_piece.wav', channels=2, dur=info['total'] + 2.0)
    t0, step = info['t0'], info['beat'] / 2
    rel = lambda k, level: round(float(wavio.db(GAINS[k] * level(stems[k]) / (GAINS['lead'] * level(stems['lead'])))), 1)
    print('stem level in the mix, dB relative to the lead (rms, peak):',
          {k: (rel(k, rms), rel(k, lambda v: np.abs(v).max())) for k in stems})

    # 1) the lead plays the planted rising trend: first data note A3 (220 Hz), last A5 (880 Hz)
    lead = stems['lead'].sum(axis=1)
    f_first = synth.peak_hz(lead[at(t0):at(t0 + step)])
    f_last = synth.peak_hz(lead[at(t0 + 47 * step):at(t0 + 48 * step)])
    print(f'lead: first data note {f_first:.0f} Hz, last {f_last:.0f} Hz')
    assert abs(f_first / mk.midi_to_hz(info['lead_notes'][0]) - 1) < 0.03
    assert abs(f_last / mk.midi_to_hz(info['lead_notes'][-1]) - 1) < 0.03

    # 2) every flash is a hit at the right moment, on the correct side
    ev = stems['event']
    hits = [n for n in notes if n['track'] == 'event']
    for n in hits:
        after, before = ev[at(n['t']):at(n['t'] + 0.05)], ev[at(n['t'] - 0.06):at(n['t'] - 0.01)]
        assert rms(after) > 10 * rms(before) + 1e-6
        assert (rms(after[:, 1]) > rms(after[:, 0])) == (n['pan'] > 0.5)
    print(f'events: {len(hits)} hits, each starts within 50 ms of its flash and sits on the correct side')

    # 3) the pad gets brighter as the trend rises; nothing but the legend plays before the data starts
    pad = stems['pad'].sum(axis=1)
    c_first = synth.centroid_hz(pad[at(t0 + 0.6):at(t0 + info['bar'])])
    c_last = synth.centroid_hz(pad[at(t0 + 5 * info['bar'] + 0.6):at(t0 + 6 * info['bar'])])
    print(f'pad brightness (spectral centroid): first bar {c_first:.0f} Hz, last bar {c_last:.0f} Hz')
    assert c_last > 1.2 * c_first
    assert all(np.abs(stems[k][:at(t0) - 1]).max() == 0.0 for k in ('pad', 'event', 'pulse'))

    # 4) the melody follows the brightest region from the left ear to the right ear
    assert rms(stems['lead'][at(t0):at(t0 + 1), 0]) > 2 * rms(stems['lead'][at(t0):at(t0 + 1), 1])
    assert rms(stems['lead'][at(t0 + 11):at(t0 + 12), 1]) > 2 * rms(stems['lead'][at(t0 + 11):at(t0 + 12), 0])

    # 5) version for muxing onto the video: no legend, data second 0 = audio second 0
    notes, info = score.make_score(tl, legend=False)
    mix, _ = render(notes, info['total'])
    wavio.write_wav('p7_sync.wav', mix)
    wavio.check_wav('p7_sync.wav', channels=2, dur=info['data_dur'] + 2.0)
    print('P7 all checks passed')
