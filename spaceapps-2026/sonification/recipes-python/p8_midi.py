"""p8_midi.py (recipe P8) - Standard MIDI File (.mid) writer and reader in pure Python.
Needs: the Python standard library + musickit.py and score.py (for the demo at the bottom)."""
import struct

# track name -> (MIDI channel 0..15, General MIDI program 0..127). Channel 9 is the GM drum channel.
TRACKS = {'pad': (0, 89),      # GM 90 "Pad 2 (warm)"   (GM lists programs 1..128; the file stores 0..127)
          'lead': (1, 12),     # GM 13 "Marimba"
          'ref': (2, 11),      # GM 12 "Vibraphone"
          'event': (3, 13),    # GM 14 "Xylophone"
          'pulse': (9, 0)}     # drum channel: the note number picks the drum (76 = high wood block)


def vlq(n):
    """Variable-length quantity: 7 bits per byte, most significant group first; every byte except
    the last has its top bit set. 0 -> 00, 127 -> 7F, 128 -> 81 00, 480 -> 83 60."""
    out = [n & 0x7F]
    n >>= 7
    while n:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    return bytes(reversed(out))


def _track(events):
    """events: list of (tick, order, message bytes) -> one 'MTrk' chunk. Events are sorted by tick
    (then by order: note-off 0, controller 1, note-on 2), absolute ticks become delta times, and the
    obligatory End of Track meta event is appended."""
    data, last = b'', 0
    for tick, _, msg in sorted(events, key=lambda e: (e[0], e[1])):
        data += vlq(tick - last) + msg
        last = tick
    data += b'\x00\xFF\x2F\x00'
    return b'MTrk' + struct.pack('>I', len(data)) + data


def write_midi(path, notes, bpm=120, ppq=480, tracks=TRACKS):
    """notes: dicts with t and dur (seconds), midi, vel (0..1), track, and optionally pan (0..1).
    Writes a format-1 file: track 0 holds the tempo, then one track per entry of `tracks`.
    ppq = ticks per quarter note. Seconds become ticks with tick = seconds * bpm / 60 * ppq."""
    tick = lambda sec: int(round(sec * bpm / 60.0 * ppq))
    tempo = struct.pack('>I', round(60_000_000 / bpm))[1:]              # microseconds per quarter note, 3 bytes
    chunks = [_track([(0, 0, b'\xFF\x58\x04\x04\x02\x18\x08'),           # time signature 4/4
                      (0, 0, b'\xFF\x51\x03' + tempo)])]                 # set tempo
    for name, (channel, program) in tracks.items():
        ev = [(0, 0, b'\xFF\x03' + vlq(len(name)) + name.encode('ascii')),   # track name
              (0, 0, bytes([0xC0 | channel, program]))]                  # program change = pick the instrument
        for n in notes:
            if n['track'] != name:
                continue
            on = tick(n['t'])
            off = max(on + 1, tick(n['t'] + n['dur']))
            if n.get('pan') is not None and channel != 9:
                ev.append((on, 1, bytes([0xB0 | channel, 10, min(127, round(n['pan'] * 127))])))   # controller 10 = pan
            ev.append((on, 2, bytes([0x90 | channel, n['midi'], max(1, min(127, round(n['vel'] * 127)))])))  # note on
            ev.append((off, 0, bytes([0x80 | channel, n['midi'], 64])))  # note off
        chunks.append(_track(ev))
    with open(path, 'wb') as fh:
        fh.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(chunks), ppq) + b''.join(chunks))


def read_midi(path):
    """Parse a Standard MIDI File. Returns {'format', 'ppq', 'tempo' (microseconds per quarter note),
    'tracks': [{'name', 'program', 'ended' (has End of Track), 'notes': [(on_tick, off_tick, channel,
    midi, velocity)], 'pans': [(tick, value)]}]}. Handles running status, meta and sysex events."""
    with open(path, 'rb') as fh:
        data = fh.read()
    assert data[:4] == b'MThd' and struct.unpack('>I', data[4:8])[0] == 6, 'not a MIDI file'
    fmt, ntracks, division = struct.unpack('>HHH', data[8:14])
    assert division < 0x8000, 'SMPTE time division is not handled'
    out = {'format': fmt, 'ppq': division, 'tempo': 500000, 'tracks': []}
    pos = 14
    for _ in range(ntracks):
        assert data[pos:pos + 4] == b'MTrk', 'missing track chunk'
        end = pos + 8 + struct.unpack('>I', data[pos + 4:pos + 8])[0]
        pos += 8
        tr = {'name': '', 'program': None, 'ended': False, 'notes': [], 'pans': []}
        tick, status, sounding = 0, 0, {}
        while pos < end:
            delta = 0
            while True:                                                  # read one variable-length quantity
                byte = data[pos]
                pos += 1
                delta = (delta << 7) | (byte & 0x7F)
                if byte < 0x80:
                    break
            tick += delta
            if data[pos] == 0xFF:                                        # meta event: FF type length data
                kind, length = data[pos + 1], data[pos + 2]              # (lengths here are all below 128)
                body = data[pos + 3:pos + 3 + length]
                pos += 3 + length
                if kind == 0x03:
                    tr['name'] = body.decode('ascii')
                elif kind == 0x51:
                    out['tempo'] = int.from_bytes(body, 'big')
                elif kind == 0x2F:
                    tr['ended'] = True
            elif data[pos] in (0xF0, 0xF7):                              # sysex: skip
                pos += 2 + data[pos + 1]
            else:
                if data[pos] & 0x80:                                     # a new status byte ...
                    status = data[pos]
                    pos += 1                                             # ... else running status: reuse the last
                kind, channel = status & 0xF0, status & 0x0F
                a = data[pos]
                b = data[pos + 1] if kind not in (0xC0, 0xD0) else None  # program change / pressure: 1 data byte
                pos += 1 if b is None else 2
                if kind == 0x90 and b > 0:
                    sounding[(channel, a)] = (tick, b)
                elif kind == 0x80 or (kind == 0x90 and b == 0):          # note-on with velocity 0 = note-off
                    start, vel = sounding.pop((channel, a))
                    tr['notes'].append((start, tick, channel, a, vel))
                elif kind == 0xC0:
                    tr['program'] = a
                elif kind == 0xB0 and a == 10:
                    tr['pans'].append((tick, b))
        assert pos == end and not sounding, 'track length wrong or a note never ends'
        tr['notes'].sort()
        out['tracks'].append(tr)
    return out


if __name__ == '__main__':
    import json

    import score

    # variable-length quantities: the 12 examples printed in the Standard MIDI Files 1.0 specification
    spec = {0x00: '00', 0x40: '40', 0x7F: '7F', 0x80: '81 00', 0x2000: 'C0 00', 0x3FFF: 'FF 7F',
            0x4000: '81 80 00', 0x100000: 'C0 80 00', 0x1FFFFF: 'FF FF 7F', 0x200000: '81 80 80 00',
            0x8000000: 'C0 80 80 00', 0xFFFFFFF: 'FF FF FF 7F'}
    for number, text in spec.items():
        assert vlq(number) == bytes.fromhex(text), hex(number)

    with open('timeline.json') as fh:
        tl = json.load(fh)
    notes, info = score.make_score(tl)
    BPM, PPQ = 120, 480
    write_midi('p8_piece.mid', notes, bpm=BPM, ppq=PPQ)

    raw = open('p8_piece.mid', 'rb').read()
    assert raw[:14] == b'MThd' + bytes([0, 0, 0, 6, 0, 1, 0, 6, 0x01, 0xE0])     # format 1, 6 tracks, 480 ticks
    assert raw[14:22] == b'MTrk' + bytes([0, 0, 0, 19])                         # tempo track: 19 bytes
    assert raw[22:41].hex(' ') == '00 ff 58 04 04 02 18 08 00 ff 51 03 07 a1 20 00 ff 2f 00'

    mid = read_midi('p8_piece.mid')
    assert mid['format'] == 1 and mid['ppq'] == PPQ and mid['tempo'] == 500000  # 500000 us per beat = 120 bpm
    assert [t['name'] for t in mid['tracks']] == [''] + list(TRACKS)
    assert all(t['ended'] for t in mid['tracks'])
    tick = lambda sec: int(round(sec * BPM / 60.0 * PPQ))
    total = 0
    for tr in mid['tracks'][1:]:
        channel, program = TRACKS[tr['name']]
        want = sorted((tick(n['t']), max(tick(n['t']) + 1, tick(n['t'] + n['dur'])), channel, n['midi'],
                       max(1, min(127, round(n['vel'] * 127)))) for n in notes if n['track'] == tr['name'])
        assert tr['notes'] == want and tr['program'] == program, tr['name']
        total += len(want)
    assert total == len(notes)
    seconds = lambda ticks: ticks * mid['tempo'] / 1e6 / mid['ppq']
    last_off = max(off for tr in mid['tracks'] for (_, off, _, _, _) in tr['notes'])
    ev = mid['tracks'][4]
    print(f"p8_piece.mid: {len(raw)} bytes, format {mid['format']}, {len(mid['tracks'])} tracks, {mid['ppq']} ticks per beat, "
          f"tempo {60e6 / mid['tempo']:.0f} bpm, {total} notes, ends at {seconds(last_off):.2f} s")
    print('notes read back per track:', {t['name']: len(t['notes']) for t in mid['tracks'][1:]})
    print('first event hit: tick', ev['notes'][0][0], f"= {seconds(ev['notes'][0][0]):.3f} s, note", ev['notes'][0][3],
          'pan controller value', ev['pans'][0][1], '(0 = left, 64 = centre, 127 = right)')
    assert abs(seconds(ev['notes'][0][0]) - (info['t0'] + 0.8)) < 0.002
    assert abs(seconds(last_off) - info['total']) < 0.01
    print('P8 all checks passed')
