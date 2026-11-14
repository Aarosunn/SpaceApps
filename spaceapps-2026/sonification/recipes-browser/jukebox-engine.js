/* jukebox-engine.js - the thin Tone.js / DOM layer shared by recipes J1, J3, J4 and J5.
 * Every musical decision lives in sonify-core.js; this file only builds the audio graph and plays what it is told.
 * Browser: load Tone.js 15.1.22 and sonify-core.js first, then this file; it defines the global JukeboxEngine.
 * Tone and core are passed in as arguments, so the functions can be exercised in Node with a fake Tone.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JukeboxEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PAD_TAU = 0.6;   // seconds. The pad glides to each new target with this time constant (about 95 % there after 3 * PAD_TAU).
  const AHEAD = 0.12;    // seconds of real time that notes are scheduled ahead of the playhead

  // Builds the instruments in the CURRENT Tone context: the live one, or the offline one inside Tone.Offline.
  // Signal path: pad, lead, reference blip, drums -> master gain -> limiter -> speakers.
  function createEngine(Tone, core, map) {
    const limiter = new Tone.Limiter({ threshold: -3 }).toDestination();
    const master = new Tone.Gain({ gain: 0.5 }).connect(limiter);

    // pad: two sawtooth oscillators a fifth apart -> low-pass filter (brightness) -> gain (loudness)
    const padGain = new Tone.Gain({ gain: 0 }).connect(master);
    const padFilter = new Tone.Filter({ frequency: map.padMinHz, type: 'lowpass' }).connect(padGain);
    const padOscs = [0, 7].map((semitones) =>
      new Tone.Oscillator({ frequency: core.midiToFreq(map.rootMidi + semitones), type: 'sawtooth' }).connect(padFilter));

    const leadPan = new Tone.Panner({ pan: 0 }).connect(master);
    const lead = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.25 },
    }).connect(leadPan);
    lead.volume.value = -6;

    const ref = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.06, sustain: 0, release: 0.05 },
    }).connect(master);
    ref.volume.value = -14;

    // three drum voices, each with its own panner, so simultaneous events can sit at different places
    const drums = [0, 1, 2].map(() => {
      const pan = new Tone.Panner({ pan: 0 }).connect(master);
      const synth = new Tone.MembraneSynth().connect(pan);
      synth.volume.value = -8;
      return { synth, pan, last: -1 };
    });
    const leadVoice = { last: -1 }, refVoice = { last: -1 };
    let nextDrum = 0;
    // Tone asserts that the start times of one voice strictly increase: never hand a voice the same time twice.
    const after = (voice, time) => (voice.last = Math.max(time, voice.last + 0.005));

    return {
      limiter,
      start(time) { padOscs.forEach((o) => o.start(time)); },
      setMaster(gain, time) { master.gain.setTargetAtTime(gain, time, 0.03); },
      setPad(targets, time, tau = PAD_TAU) {
        padGain.gain.setTargetAtTime(targets.gain, time, tau);
        if (targets.cutoff !== undefined) padFilter.frequency.setTargetAtTime(targets.cutoff, time, tau);
      },
      // ev: one item from SonifyCore.scoreWindow. time: audio-clock seconds. rate: playbackRate (shortens the notes).
      play(ev, time, rate = 1) {
        const hz = core.midiToFreq(ev.midi);
        if (ev.kind === 'lead') {
          const t = after(leadVoice, time);
          leadPan.pan.setValueAtTime(ev.pan, t);
          lead.triggerAttackRelease(hz, Math.max(0.03, ev.dur / rate), t, ev.vel);
        } else if (ev.kind === 'ref') {
          ref.triggerAttackRelease(hz, 0.06, after(refVoice, time), 0.9);
        } else if (ev.kind === 'drum') {
          const d = drums[nextDrum++ % drums.length], t = after(d, time);
          d.pan.pan.setValueAtTime(ev.pan, t);
          d.synth.triggerAttackRelease(hz, 0.1, t, ev.vel);
        }
      },
    };
  }

  // Slaves the engine to a media clock: a <video> element, or SonifyCore.makeClipClock for image sequences and the demo.
  // The clock is polled every 25 ms. Nothing here listens to play / pause / seek events, so every way of moving
  // the playhead (buttons, keyboard, scripts, looping, buffering) goes through the same few lines.
  // toggles: { pad, lead, ref, drum } booleans, read on every tick (flip them from checkboxes).
  function createPlayer(Tone, core, engine, toggles) {
    let clock = null, tl = null, stats = null, map = null, plan = core.NEW_PLAN, wasPlaying = false, timer = null;
    const player = {
      offset: 0,   // seconds; positive = sound earlier. Calibration knob for slow outputs such as Bluetooth headphones.
      setSource(newClock, timeline, mapping) {
        clock = newClock; tl = timeline; map = mapping; stats = core.timelineStats(tl); plan = core.NEW_PLAN;
      },
      tick() {
        if (!clock || !tl) return;
        const now = Tone.immediate();                       // audio clock, seconds
        const playing = !clock.paused && !clock.ended && clock.readyState >= 3;
        if (!playing) {
          if (wasPlaying) engine.setPad({ gain: 0 }, now, 0.05);   // the drone stops with the picture
          wasPlaying = false; plan = core.NEW_PLAN;
          return;
        }
        wasPlaying = true;
        const rate = Math.max(0.1, clock.playbackRate || 1);
        const t = clock.currentTime + player.offset * rate; // media clock, seconds
        const win = core.planWindow(plan, t, rate, AHEAD);
        plan = win.state;
        for (const ev of core.scoreWindow(tl, map, stats, win.from, win.to)) {
          // media time -> audio time: an event (ev.t - t) media seconds ahead is (ev.t - t) / rate real seconds ahead
          if (toggles[ev.kind]) engine.play(ev, now + Math.max(0, (ev.t - t) / rate), rate);
        }
        engine.setPad(toggles.pad ? core.padTargets(core.sampleTimeline(tl, t), map, stats) : { gain: 0 }, now);
      },
      start() { if (timer === null) timer = setInterval(player.tick, 25); },
      stop() { clearInterval(timer); timer = null; },
    };
    return player;
  }

  // Renders a whole timeline to audio, faster than real time. Same score and same engine as the live player.
  // Resolves with a ToneAudioBuffer: use numberOfChannels, getChannelData(c), sampleRate and duration.
  function renderOffline(Tone, core, tl, map, toggles, sampleRate = 44100, tail = 1.5) {
    const stats = core.timelineStats(tl);
    return Tone.Offline(() => {
      const engine = createEngine(Tone, core, map);   // only nodes created inside this callback are rendered
      engine.start(0);
      for (const f of tl.frames) engine.setPad(toggles.pad ? core.padTargets(f, map, stats) : { gain: 0 }, f.t);
      engine.setPad({ gain: 0 }, stats.duration, 0.3);
      for (const ev of core.scoreWindow(tl, map, stats, -1e-3, stats.duration)) {
        if (toggles[ev.kind]) engine.play(ev, ev.t, 1);
      }
    }, stats.duration + tail, 2, sampleRate);
  }

  // ---------- DOM helpers ----------
  // Draws the built-in demo picture for media time t: the timeline grid as coloured cells, events as fading white discs.
  function drawDemoFrame(core, g, w, h, tl, t) {
    const [rows, cols] = tl.meta.grid, s = core.sampleTimeline(tl, t), cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle = 'rgb(' + core.rampColor(s.grid[r * cols + c], core.DEMO_RAMP).join(',') + ')';
        g.fillRect(c * cw, r * ch, cw + 1, ch + 1);
      }
    }
    for (const e of core.eventsBetween(tl.frames, t - 0.4, t)) {
      g.fillStyle = 'rgba(255,255,255,' + (1 - (t - e.t) / 0.4).toFixed(2) + ')';
      g.beginPath(); g.arc(e.x * w, e.y * h, 0.06 * h, 0, 2 * Math.PI); g.fill();
    }
  }

  // Picture source for one track. Returns { clock, draw(t) }; call draw from requestAnimationFrame.
  //   spec.video  : URL of a video file. It may be cross-origin (for example svs.gsfc.nasa.gov) because
  //                 this code only shows it and never reads its pixels.
  //   spec.frames : { pattern: 'frames/f_{0000}.jpg', count, fps, first } for an image sequence.
  //   neither     : the built-in demo animation drawn from the timeline grid.
  function openVisual(core, video, canvas, spec, tl) {
    const g = canvas.getContext('2d'), nowSeconds = () => performance.now() / 1000;
    video.pause(); video.removeAttribute('src'); video.load();   // let go of the previous clip
    video.hidden = !spec.video; canvas.hidden = !!spec.video;
    if (spec.video) {
      video.muted = true;                                         // some SVS clips carry narration: the sonification replaces it
      video.src = spec.video;
      return { clock: video, draw() {} };
    }
    if (spec.frames) {
      const f = spec.frames, cache = new Map();   // ponytail: keeps every decoded frame; fine up to a few hundred small frames
      const get = (i) => {
        if (!cache.has(i)) { const im = new Image(); im.src = core.sequenceFrameUrl(f.pattern, (f.first || 0) + i); cache.set(i, im); }
        return cache.get(i);
      };
      return {
        clock: core.makeClipClock(f.count / f.fps, nowSeconds),
        draw(t) {
          const i = core.sequenceIndexAt(t, f.fps, f.count), im = get(i);
          if (i + 1 < f.count) get(i + 1);                        // warm the next frame
          if (im.complete && im.naturalWidth) g.drawImage(im, 0, 0, canvas.width, canvas.height);
        },
      };
    }
    return {
      clock: core.makeClipClock(core.timelineStats(tl).duration, nowSeconds),
      draw(t) { drawDemoFrame(core, g, canvas.width, canvas.height, tl, t); },
    };
  }

  // Hands a Blob to the user as a download.
  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // Wires the standard controls to a clock, creates the audio engine on the first Play, and redraws the picture
  // once per display frame. Expects elements with the ids play, seek, rate, loop, vol, offset and checkboxes
  // carrying data-layer="pad|lead|ref|drum". say(text) receives short status messages for an aria-live region.
  function createTransport(Tone, core, map, say) {
    const $ = (id) => document.getElementById(id);
    const toggles = { pad: true, lead: true, ref: true, drum: true };
    let cur = null, engine = null, player = null, audioReady = null, dragging = false, wasPaused = true, lastUi = 0;
    const volumeGain = () => Math.pow(+$('vol').value / 100, 2);   // squared, so the slider feels even to the ear

    async function startAudio() {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';   // iOS 17+: stay audible with the ring switch on silent
      await Tone.start();                                                     // resumes the AudioContext
      engine = createEngine(Tone, core, map);
      engine.start(Tone.immediate());
      engine.setMaster(volumeGain(), Tone.immediate());
      player = createPlayer(Tone, core, engine, toggles);
      player.offset = +$('offset').value / 1000;
      if (cur) player.setSource(cur.clock, cur.tl, cur.map);
      player.start();
      return engine;
    }
    // Audio is created on the first click or key press, never before: browsers block sound without a user gesture.
    const ensureAudio = () => (audioReady = audioReady || startAudio());

    $('play').addEventListener('click', () => {
      if (!cur) return;
      const c = cur.clock, media = c.paused || c.ended ? c.play() : c.pause();   // both calls run inside the user gesture
      Promise.all([ensureAudio(), media]).catch((err) => say('Playback failed: ' + err.message));
    });
    // The controls only change the clock; the player follows the clock.
    $('seek').addEventListener('pointerdown', () => { dragging = true; });
    addEventListener('pointerup', () => { dragging = false; });
    $('seek').addEventListener('input', () => { if (cur) cur.clock.currentTime = +$('seek').value; });
    $('rate').addEventListener('change', () => { if (cur) cur.clock.playbackRate = +$('rate').value; });
    $('loop').addEventListener('change', () => { if (cur) cur.clock.loop = $('loop').checked; });
    $('vol').addEventListener('input', () => { if (engine) engine.setMaster(volumeGain(), Tone.immediate()); });
    $('offset').addEventListener('change', () => { if (player) player.offset = +$('offset').value / 1000; });
    for (const box of document.querySelectorAll('[data-layer]')) {
      box.addEventListener('change', () => { toggles[box.dataset.layer] = box.checked; });
    }

    // Picture and control read-outs, once per display frame. The sound does not depend on this loop.
    function frame(ms) {
      requestAnimationFrame(frame);
      if (!cur) return;
      const c = cur.clock, t = c.currentTime, paused = c.paused || c.ended;
      const total = Number.isFinite(c.duration) ? c.duration : cur.stats.duration;
      cur.draw(t);
      if (paused !== wasPaused) {
        wasPaused = paused;
        $('play').textContent = paused ? 'Play' : 'Pause';
        say(paused ? 'Paused at ' + Math.round(t) + ' seconds.' : 'Playing.');
      }
      if (!dragging && ms - lastUi > 500) {
        lastUi = ms;
        $('seek').max = total.toFixed(1); $('seek').value = t.toFixed(1);
        $('seek').setAttribute('aria-valuetext', Math.round(t) + ' of ' + Math.round(total) + ' seconds');
      }
    }
    requestAnimationFrame(frame);

    return {
      ensureAudio,
      // visual: { clock, draw } from openVisual. Call again to switch to another track.
      load(visual, tl, trackMap) {
        if (cur) cur.clock.pause();
        cur = { clock: visual.clock, draw: visual.draw, tl, map: trackMap, stats: core.timelineStats(tl) };
        cur.clock.loop = $('loop').checked; cur.clock.playbackRate = +$('rate').value;
        wasPaused = true; $('play').textContent = 'Play'; lastUi = 0;
        if (player) player.setSource(cur.clock, tl, trackMap);
      },
    };
  }

  return { PAD_TAU, AHEAD, createEngine, createPlayer, renderOffline, drawDemoFrame, openVisual, saveBlob, createTransport };
});
