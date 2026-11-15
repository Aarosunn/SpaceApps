/* One instrument per kind of data, so the data type is recognisable by ear before a single value is read.
   Same interface as createEngine() in jukebox-engine.js (start, setMaster, setPad, play), so the player and the
   game drive it unchanged. All sound is synthesised live with Tone.js; there are no samples.

     water  sea heat, sea level   soft FM mallets that glide, waves that wash in (higher = bigger waves), surf   C major pentatonic
     fire   wildfires             woody pops with crackle (more fire = more crackle), over a low roar   A minor pentatonic
     warm   global heat           a brassy swell that gets brighter as it gets hotter, over a fifth drone   D dorian
     bell   night lights          glassy FM bells with a long shimmer                                   C major pentatonic
*/

export type VoiceId = "water" | "fire" | "warm" | "bell";

/* Scale and key per voice: merged into the engine's mapping, so the pitch rules stay in sonify-core.js. */
export const VOICE_MAP: Record<VoiceId, { scale: string; rootMidi: number }> = {
  water: { scale: "majorPentatonic", rootMidi: 48 }, // C3
  fire: { scale: "minorPentatonic", rootMidi: 45 }, // A2
  warm: { scale: "dorian", rootMidi: 50 }, // D3
  bell: { scale: "majorPentatonic", rootMidi: 48 },
};

export const VOICE_WORDS: Record<VoiceId, string> = {
  water: "soft mallets over washing waves",
  fire: "woody pops and crackle over a low roar",
  warm: "a brassy swell that brightens as it heats",
  bell: "glassy bells",
};

/* How many crackles one fire note gets: none for a trace of fire, up to 6 for the heaviest. Pure, checked in selfCheck. */
export const cracklesFor = (u: number) => Math.round(Math.max(0, Math.min(1, u)) * 6);

/* The band that joins the lead as the level (0..1) rises: bass, then hi-hat, then kick, then sparkle. Pure, checked in selfCheck. */
export const bandFor = (level: number) => ({ bass: level > 0.2, hat: level > 0.45, kick: level > 0.7, sparkle: level > 0.9 });

type LeadEv = { kind: string; midi: number; vel?: number; pan?: number; dur?: number; u?: number; wave?: boolean }; // wave: force / forbid a wave on this note (unset = about one a second)
type PadTargets = { gain: number; cutoff?: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tone and the UMD core are untyped here, as in useJukebox
export function createInstruments(Tone: any, core: any) {
  const limiter = new Tone.Limiter({ threshold: -3 }).toDestination();
  const master = new Tone.Gain({ gain: 0.5 }).connect(limiter);
  const meter = new Tone.Meter({ smoothing: 0.75 });
  const fft = new Tone.Analyser("fft", 256); // 256 bins of ~94 Hz
  master.connect(meter);
  master.connect(fft);
  const reverb = new Tone.Reverb({ decay: 2.6, wet: 1 });
  const reverbSend = new Tone.Gain({ gain: 0.22 }).connect(reverb);
  reverb.connect(master);

  const PAD_TAU = 0.6;
  let voice: VoiceId = "water";

  /* ---- water: FM mallets with a glide, swell + surf ---- */
  const waterPan = new Tone.Panner(0).connect(master);
  waterPan.connect(reverbSend);
  const waterLead = new Tone.FMSynth({
    harmonicity: 2, modulationIndex: 1.4, portamento: 0.06,
    oscillator: { type: "sine" }, modulation: { type: "sine" },
    envelope: { attack: 0.012, decay: 0.45, sustain: 0.12, release: 0.9 },
    modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.4 },
  }).connect(waterPan);
  waterLead.volume.value = -4;
  const waterPadGain = new Tone.Gain(0).connect(master);
  waterPadGain.connect(reverbSend);
  const swell = new Tone.Tremolo({ frequency: 0.18, depth: 0.55, spread: 60 }).connect(waterPadGain).start();
  const waterFilter = new Tone.Filter({ frequency: 500, type: "lowpass" }).connect(swell);
  const waterOscs = [0, 12, 19].map((st) => new Tone.Oscillator({ frequency: core.midiToFreq(VOICE_MAP.water.rootMidi + st), type: st === 0 ? "triangle" : "sine" }).connect(waterFilter));
  const surfGain = new Tone.Gain(0.35).connect(swell);
  const surf = new Tone.Noise("pink").connect(new Tone.Filter({ frequency: 700, type: "lowpass" }).connect(surfGain));

  // waves: a noise swell that washes in and out through an opening filter; bigger and brighter when the value is higher
  const waveFilter = new Tone.Filter({ frequency: 300, type: "lowpass" }).connect(master);
  waveFilter.connect(reverbSend);
  const waveSynth = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.55, decay: 0.75, sustain: 0, release: 0.4 } }).connect(waveFilter);
  waveSynth.volume.value = -3;
  let lastWave = -10;

  /* ---- fire: woody pop + crackle, low roar ---- */
  const firePan = new Tone.Panner(0).connect(master);
  const fireDrive = new Tone.Distortion({ distortion: 0.35, wet: 0.5 }).connect(firePan);
  const fireLead = new Tone.MonoSynth({
    oscillator: { type: "sawtooth" },
    filter: { Q: 3, type: "lowpass" },
    envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.12 },
    filterEnvelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1, baseFrequency: 260, octaves: 4 },
  }).connect(fireDrive);
  fireLead.volume.value = -15; // quiet: it only keeps the pitch clear under the pop
  // the pop: a noise burst through a narrow filter tuned to the note, like a knot bursting in a log
  const popFilter = new Tone.Filter({ frequency: 800, type: "bandpass", Q: 16 }).connect(firePan);
  const pop = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.03 } }).connect(popFilter);
  pop.volume.value = 8; // the narrow filter passes little energy
  const crackleHp = new Tone.Filter({ frequency: 3200, type: "highpass" }).connect(firePan);
  const crackle = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 } }).connect(crackleHp);
  crackle.volume.value = -10;
  const firePadGain = new Tone.Gain(0).connect(master);
  const roarFilter = new Tone.Filter({ frequency: 320, type: "bandpass", Q: 0.7 }).connect(firePadGain);
  const roar = new Tone.Noise("brown").connect(roarFilter);
  const fireDrone = new Tone.Oscillator({ frequency: core.midiToFreq(VOICE_MAP.fire.rootMidi - 12), type: "sawtooth" }).connect(new Tone.Filter({ frequency: 180, type: "lowpass" }).connect(firePadGain));

  /* ---- warm: brassy swell, fifth drone that brightens ---- */
  const warmPan = new Tone.Panner(0).connect(master);
  warmPan.connect(reverbSend);
  const warmLead = new Tone.MonoSynth({
    oscillator: { type: "fatsawtooth", count: 3, spread: 22 },
    filter: { Q: 1, type: "lowpass" },
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.45 },
    filterEnvelope: { attack: 0.06, decay: 0.25, sustain: 0.6, release: 0.4, baseFrequency: 420, octaves: 2.4 },
  }).connect(warmPan);
  warmLead.volume.value = -11;
  const warmPadGain = new Tone.Gain(0).connect(master);
  const warmFilter = new Tone.Filter({ frequency: 250, type: "lowpass" }).connect(warmPadGain);
  const warmOscs = [0, 7].map((st) => new Tone.Oscillator({ frequency: core.midiToFreq(VOICE_MAP.warm.rootMidi + st), type: "sawtooth" }).connect(warmFilter));

  /* ---- bell: glassy FM bells ---- */
  const bellPan = new Tone.Panner(0).connect(master);
  const bellSend = new Tone.Gain(1.6).connect(reverbSend);
  bellPan.connect(bellSend);
  const bells = [0, 1, 2].map(() => {
    const b = new Tone.FMSynth({
      harmonicity: 3.01, modulationIndex: 12,
      oscillator: { type: "sine" }, modulation: { type: "sine" },
      envelope: { attack: 0.001, decay: 1.1, sustain: 0, release: 1.1 },
      modulationEnvelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.4 },
    }).connect(bellPan);
    b.volume.value = -9;
    return { synth: b, last: -1 };
  });
  let nextBell = 0;
  const bellPadGain = new Tone.Gain(0).connect(master);
  bellPadGain.connect(reverbSend);
  const bellOscs = [12, 19].map((st) => new Tone.Oscillator({ frequency: core.midiToFreq(VOICE_MAP.bell.rootMidi + st), type: "sine" }).connect(bellPadGain));

  /* ---- shared: reference blip and event drum, as in the original engine ---- */
  const ref = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.06, sustain: 0, release: 0.05 } }).connect(master);
  ref.volume.value = -14;
  const drum = new Tone.MembraneSynth().connect(master);
  drum.volume.value = -8;

  /* ---- the band (game): joins the lead as the value rises ---- */
  const bass = new Tone.MonoSynth({
    oscillator: { type: "triangle" },
    filter: { Q: 1, type: "lowpass" },
    envelope: { attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.25 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.2, baseFrequency: 180, octaves: 2 },
  }).connect(master);
  bass.volume.value = -9;
  const hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.01 } }).connect(new Tone.Filter({ frequency: 7500, type: "highpass" }).connect(master));
  hat.volume.value = -20;
  const kick = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 5, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } }).connect(master);
  kick.volume.value = -7;
  const sparkle = new Tone.FMSynth({
    harmonicity: 3.01, modulationIndex: 10,
    envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.5 },
    modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
  }).connect(reverbSend);
  sparkle.connect(master);
  sparkle.volume.value = -16;

  const pads: Record<VoiceId, { gain: { gain: { setTargetAtTime: (v: number, t: number, tau: number) => void } }; scale: number; cutoff?: { frequency: { setTargetAtTime: (v: number, t: number, tau: number) => void } } }> = {
    water: { gain: waterPadGain, scale: 1.5, cutoff: waterFilter },
    fire: { gain: firePadGain, scale: 3.6, cutoff: roarFilter },
    warm: { gain: warmPadGain, scale: 1, cutoff: warmFilter },
    bell: { gain: bellPadGain, scale: 0.5 },
  };
  // Tone asserts that one voice's start times strictly increase: never hand a voice the same time twice.
  const last: Record<string, number> = {};
  const after = (key: string, time: number) => (last[key] = Math.max(time, (last[key] ?? -1) + 0.005));

  return {
    limiter,
    start(time: number) {
      [...waterOscs, surf, roar, fireDrone, ...warmOscs, ...bellOscs].forEach((o) => o.start(time));
    },
    setMaster(gain: number, time: number) {
      master.gain.setTargetAtTime(gain, time, 0.03);
    },
    /* Which instrument plays from now on. The other pads fade out. */
    setVoice(v: VoiceId) {
      if (v === voice) return;
      const now = Tone.now();
      pads[voice].gain.gain.setTargetAtTime(0, now, 0.08);
      voice = v;
    },
    getVoice: () => voice,
    setPad(targets: PadTargets, time: number, tau = PAD_TAU) {
      const p = pads[voice];
      p.gain.gain.setTargetAtTime(targets.gain * p.scale, time, tau);
      if (targets.cutoff !== undefined && p.cutoff) {
        // the roar and the swell live lower than the brass drone: scale the engine's 250..2500 Hz into each pad's range
        const hz = voice === "fire" ? 180 + targets.cutoff * 0.22 : voice === "water" ? 300 + targets.cutoff * 0.5 : targets.cutoff;
        p.cutoff.frequency.setTargetAtTime(hz, time, tau);
      }
    },
    play(ev: LeadEv, time: number, rate = 1) {
      const hz = core.midiToFreq(ev.midi);
      if (ev.kind === "ref") return ref.triggerAttackRelease(hz, 0.06, after("ref", time), 0.9);
      if (ev.kind === "drum") return drum.triggerAttackRelease(hz, 0.1, after("drum", time), ev.vel ?? 0.8);
      if (ev.kind !== "lead") return;
      const dur = Math.max(0.03, (ev.dur ?? 0.2) / rate), vel = ev.vel ?? 0.7, pan = ev.pan ?? 0, u = ev.u ?? 0.5;
      if (voice === "water") {
        const t = after("water", time);
        waterPan.pan.setValueAtTime(pan, t);
        waterLead.triggerAttackRelease(hz, dur * 1.4, t, vel);
        // a wave washes in about once a second; higher value = louder, brighter wave
        if (ev.wave ?? t - lastWave > 1.0) {
          lastWave = t;
          waveFilter.frequency.cancelScheduledValues(t);
          waveFilter.frequency.setValueAtTime(280, t);
          waveFilter.frequency.exponentialRampToValueAtTime(700 + 3200 * u, t + 0.55);
          waveFilter.frequency.exponentialRampToValueAtTime(280, t + 1.4);
          waveSynth.triggerAttackRelease(0.9, t, 0.25 + 0.75 * u);
        }
      } else if (voice === "fire") {
        const t = after("fire", time);
        firePan.pan.setValueAtTime(pan, t);
        fireLead.triggerAttackRelease(hz, dur * 0.7, t, vel);
        popFilter.frequency.setValueAtTime(hz * 2, t);
        pop.triggerAttackRelease(0.09, after("pop", t), vel);
        // more fire = more crackle: 0 to 6 sparks scattered over the note (how many is the data; exactly when is chance)
        const n = cracklesFor(u);
        const times = Array.from({ length: n }, () => Math.random() * dur).sort((a, b) => a - b);
        for (const dt of times) crackle.triggerAttackRelease(0.02 + Math.random() * 0.03, after("crackle", t + dt), 0.3 + 0.7 * Math.random() * (0.5 + 0.5 * u));
      } else if (voice === "warm") {
        const t = after("warm", time);
        warmPan.pan.setValueAtTime(pan, t);
        warmLead.filterEnvelope.baseFrequency = 300 + 1500 * u; // hotter = brighter
        warmLead.triggerAttackRelease(hz, dur * 1.8, t, vel);
      } else {
        const b = bells[nextBell++ % bells.length];
        const t = (b.last = Math.max(time, b.last + 0.005));
        bellPan.pan.setValueAtTime(pan, t);
        b.synth.triggerAttackRelease(hz * 2, dur * 2, t, vel);
      }
    },
    /* Game: the band behind note number `i` of a phrase. level 0..1 = where this value sits in the round's range.
       Low = the lead alone; then bass, hi-hat, kick and sparkle join, so "more" is heard as a fuller band. */
    accompany(level: number, time: number, i: number, midi: number) {
      const b = bandFor(level), root = VOICE_MAP[voice].rootMidi - 12;
      if (b.bass && i % 2 === 0) bass.triggerAttackRelease(core.midiToFreq(i % 4 === 0 ? root : root + 7), 0.3, after("bass", time), 0.8);
      if (b.hat) hat.triggerAttackRelease(0.04, after("hat", time), 0.35 + 0.5 * level);
      if (b.kick && i % 2 === 0) kick.triggerAttackRelease(core.midiToFreq(36), 0.2, after("kick", time), 0.9);
      if (b.sparkle) sparkle.triggerAttackRelease(core.midiToFreq(midi + 24), 0.3, after("sparkle", time + 0.12), 0.7);
    },
    /* For the visuals: loudness 0..1 and a 256-bin spectrum (dB). */
    level(): number {
      const db = meter.getValue() as number;
      return Number.isFinite(db) ? Math.max(0, Math.min(1, (db + 48) / 42)) : 0;
    },
    spectrum(): Float32Array {
      return fft.getValue() as Float32Array;
    },
  };
}

export type Instruments = ReturnType<typeof createInstruments>;

export function selfCheck() {
  console.assert(cracklesFor(0) === 0 && cracklesFor(1) === 6 && cracklesFor(0.5) === 3, "crackle count follows the fire value");
  const low = bandFor(0.1), mid = bandFor(0.5), top = bandFor(1);
  console.assert(!low.bass && !low.hat && mid.bass && mid.hat && !mid.kick && top.kick && top.sparkle, "the band grows with the level");
  console.assert(new Set(Object.values(VOICE_MAP).map((m) => `${m.scale}${m.rootMidi}`)).size >= 3, "voices differ in key or scale");
}
