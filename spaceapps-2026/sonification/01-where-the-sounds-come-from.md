# Where the sounds come from: synthesis, samples, recordings, AI, and how to get them legally

> Status: researched 2026-11-14 with live sources by its author. The independent fact-check pass did NOT complete (see README.md). Treat licence, citation and version claims as unconfirmed until you open the cited source.

Scope: answers "how do we actually get the sounds?" for the Earth Information Jukebox. Mapping design is in 03-sonification-mapping-and-synthesis.md, musical rules in 04-making-it-musical.md, library comparison in 05-tools-and-libraries.md, full programs in 08-recipes-python.md and 09-recipes-browser.md. Every licence statement below was read on the cited page on 2026-11-14 unless tagged "(unverified)". File sizes were measured with HTTP HEAD requests the same day.

## TL;DR

- The EIC gallery gives you pictures, not sounds: of the local crawl's 1,729 media items exactly one is audio (`maria_360_audio.mov`, the soundtrack of the Hurricane Maria 360 video, SVS 4685), and none ends in .wav, .mp3, .m4a, .aac, .ogg or .flac. Every sound has to come from one of four places: **synthesis** (code computes the waveform), **samples** (recorded instrument notes replayed at other pitches), **recorded real-world audio** (ocean, rain, thunder), or **AI generation**.
- Professionals use the first three, mostly the second. NASA's Chandra sonifications and the challenge's reference piece (Caldwell 73: choir, marimba, glockenspiel) are data mapped to notes that are played by instrument sounds. SYSTEM Sounds' public tutorial does it as Python -> MIDI file -> instrument sounds chosen in a DAW.
- Recommended here: **sampled instruments for discrete pitched events + synthesized drones and filtered noise for continuous fields, generated live in the browser with Tone.js**, an optional public-domain "auditory icon" layer (US National Park Service ocean, rain, thunder), and pre-rendered files as fallback and for the 30-second video.
- Easiest legal sample set with no install: per-note MP3s of the FluidR3_GM soundfont hosted by `midi-js-soundfonts` (about 14 to 26 KB per note, CORS open). It contains choir, marimba and glockenspiel, the Caldwell 73 trio. Three instruments x 17 notes is about 1 MB: copy them into your own repo.
- Licence rule of thumb: **use** CC0, public domain, MIT, CC BY (with credit). **Avoid** CC BY-SA (MusyngKite and FatBoy; MusyngKite is the default kit of the `smplr` library), anything non-commercial (BBC Sound Effects, MusicGen weights, Suno free plan), "no standalone distribution" licences (Pixabay), and GPL code (WebAudioFont) unless the whole project is GPL.
- **Mute SVS videos.** SVS content is public domain, but SVS states "some of our visualizations feature licensed music, which is not in the public domain"; at least 10 of the 94 EIC pages carry third-party music credits.
- Skip text-to-music AI for the product's audio: a text prompt is not a data mapping, the usable licences are narrow, and all AI use must be declared.

## Decisions for the Jukebox build

Ranked. Each is what I would do in your place.

1. **Make the sound in the browser with Tone.js, from two kinds of source.** Discrete things in the frame (cities, lightning flashes, grid cells, hot spots) become notes on a sampled instrument; continuous things (mean brightness, aerosol amount, temperature) drive a synthesized drone or filtered noise. Reason: this is the Chandra split (stars and compact sources become single notes, extended gas clouds become an evolving drone), it is "live", and it costs about 1 MB. Trade-off: you must design an envelope and filter for the synth layer (1 to 2 hours).
2. **Use FluidR3_GM per-note MP3s (marimba, glockenspiel, choir_aahs, optionally orchestral_harp) and self-host them.** Reason: no soundfont player or install needed, files are tiny, the instruments match the NASA reference piece, attribution is one line. Trade-off: General MIDI quality is "good keyboard", not "film score"; licence statement is inconsistent between sources (CC BY 3.0 vs MIT, see section 3), so credit the author either way. Each note file lasts only 3.16 s (measured), so the choir works for notes, not for a held drone.
3. **Keep a synthesis-only fallback** (Tone.js `PluckSynth` or `FMSynth` instead of the sampler) behind one flag. Reason: sample loading can fail on venue Wi-Fi, and GitHub Pages hosts "rate-limit requests per second" (smplr README). Trade-off: sounds more electronic.
4. **Add at most one auditory icon per visualization, from public-domain recordings** (NPS ocean, stream, rain, thunder), quiet and switchable. Reason: it tells a blind listener what kind of data this is before any explanation. Trade-off: it can mask the data layer; it is decoration, never the data channel.
5. **Also export one audio file per visualization** (browser recording or Python render). Reason: the challenge explicitly accepts "a curated collection of original, generated audio files", the 30-second video needs it, and it is the demo fallback. Trade-off: a file is not interactive.
6. **Start `ATTRIBUTION.md` at the first commit** and add a row the moment any external file or library enters the repo. License your code MIT or Apache-2.0; keep third-party audio under its own licence in a separate folder. Reason: the submission checkbox makes you confirm every external resource is listed.
7. **Play SVS videos muted and strip audio from any re-encoded clip.**
8. **Skip:** AI music generators; a DAW-centred workflow (manual, not live, and DAW stock sounds add licences to check); loading whole SF2 soundfonts in the browser (32 to 216 MB); SFZ libraries; WebAudioFont (GPL-3.0); BBC Sound Effects; Pixabay; smplr's default MusyngKite kit.

## 1. The four ways a sonification gets audible material

Digital audio is a list of numbers. At the usual **sample rate** of 44,100 numbers per second (44.1 kHz), each number is the loudspeaker cone position at that instant. One second of mono 16-bit audio is 44,100 x 2 = 88,200 bytes. Everything below is a way of filling that list.

Two definitions used throughout. **Pitch** is frequency in hertz (Hz, cycles per second). Notes are numbered with **MIDI note numbers** (integers 0 to 127; A0 = 21, C4 "middle C" = 60, A4 = 69):

`f = 440 * 2^((m - 69) / 12)`  so m = 60 gives 261.63 Hz, and +12 (one **octave**) doubles the frequency.

One step of m is a **semitone** (a frequency ratio of 2^(1/12), about 1.0595); a **cent** is 1/100 of a semitone, the unit for tuning errors. **MIDI is not audio**: a MIDI file is only a list of note events (which note, how hard, when, how long), and something must turn it into sound, either a synthesizer (1.1) or a sampler (1.2).

### 1.1 Synthesis: compute the waveform

An **oscillator** outputs a repeating wave at a chosen frequency. The Web Audio API `OscillatorNode.type` accepts `sine` (default), `square`, `sawtooth`, `triangle`, `custom`. A sine is a single frequency (pure, dull). A sawtooth contains all harmonics (multiples of f; bright, buzzy). A square contains odd harmonics (hollow). **Noise** is random numbers (hiss); filtered, it becomes wind, surf or rain. Tone.js `Noise` offers "white", "brown", "pink".

| Technique | How it works | Sounds like | Tone.js class (names verified in v15.1.22 docs) |
|---|---|---|---|
| Subtractive | bright oscillator -> **filter** that removes high frequencies above a cutoff | pads, basses | `Oscillator` or `Noise` -> `Filter` |
| **Envelope (ADSR)** | gain curve per note: Attack (time 0 -> peak), Decay, Sustain (held level), Release (fade after note-off) | shapes any sound; without it notes click | built into every synth |
| FM (frequency modulation) | `y = sin(2*pi*fc*t + I*sin(2*pi*fm*t))`; ratio fm/fc integer = harmonic, non-integer = bell/metal; index I = brightness | bells, electric piano | `FMSynth` |
| AM (amplitude modulation) | multiply the signal by a slow oscillator | tremolo below 20 Hz | `AMSynth` |
| Additive | sum of sines with chosen amplitudes | organ; "spectrum drawn by data" | several `Oscillator`s |
| Wavetable | loop one stored cycle of any shape | classic digital synth | `custom` type via `setPeriodicWave()` |
| Physical modelling (Karplus-Strong) | noise burst circulating in a delay line of N = SR/f samples through an averaging filter | plucked string | `PluckSynth` ("Karplus-Strong string synthesis.") |
| Granular | chop a recording into 10 to 100 ms grains, replay overlapped | frozen or stretched textures | `GrainPlayer` ("adjust pitch and playback rate independently") |

ADSR starting values: mallet-like = A 0.005 s, D 0.3 s, S 0, R 0.3 s; pad = A 1.5 s, D 0.5 s, S 0.8, R 2 s. A low-pass cutoff driven by data (300 Hz = dull, 4,000 Hz = bright) is one of the most audible and pleasant continuous mappings.

Verified on this machine (Python 3.14, numpy 2.5.3; full version in 08-recipes-python.md):

```python
import numpy as np
SR = 44100
def midi_to_hz(m): return 440.0 * 2 ** ((m - 69) / 12)      # 60 -> 261.63 Hz

def fm_bell(m, dur=0.8, ratio=3.5, index=4.0):               # non-integer ratio = bell
    t = np.arange(int(dur * SR)) / SR
    f, decay = midi_to_hz(m), np.exp(-4 * t)                 # exp decay is the envelope
    return np.sin(2*np.pi*f*t + index*decay*np.sin(2*np.pi*f*ratio*t)) * decay

def pluck(m, dur=1.0):                                        # Karplus-Strong string
    n = int(round(SR / midi_to_hz(m)))                        # delay length = one period
    buf = np.random.default_rng(0).uniform(-1, 1, n); buf -= buf.mean()
    out = np.empty(int(dur * SR))
    for i in range(out.size):
        out[i] = buf[i % n]
        buf[i % n] = 0.996 * 0.5 * (buf[i % n] + buf[(i + 1) % n])   # averaging = low-pass
    return out
```

Measured: `pluck(69)` (target 440 Hz, n = 100) peaks at 443 Hz, about 12 cents sharp, because the delay length must be a whole number of samples; 1 s of pluck renders in 0.07 s. The error grows with pitch: at C6 (m = 84, n = 42) the same code measured about 27 cents sharp, a quarter of a semitone. Use this pluck below about C5 and a sine, FM or sampled voice above.

- Pros: zero licence risk, zero download, every parameter can follow data continuously, tiny code.
- Cons: default oscillators sound like test tones; pleasant timbres need envelope + filter + reverb tuning by ear.

### 1.2 Samples: replay recorded instrument notes

A **sampler** plays a recording of one note and changes its pitch by changing playback speed: shifting by k semitones needs `rate = 2^(k/12)`. Example: +3 semitones = 1.189x faster, so the note is also 16% shorter and its resonances shift ("chipmunk" effect). Hence **multisampling**: record many notes so no sample is shifted far. Salamander Grand Piano records one note every minor third (3 semitones) "from the lowest A" at "16 Velocity layers" (a **velocity layer** is the same note recorded at a different loudness, because a hard-struck note is brighter, not just louder). **Velocity** itself is the MIDI loudness value, 0 to 127.

Why samples sound real: a real note has a noisy attack, slightly out-of-tune partials and a spectrum that changes as it decays. A recording captures all of that; a bare oscillator has none of it.

Formats you will meet:

| Format | What it is | Practical note |
|---|---|---|
| SF2 (SoundFont) | "a file format for sample-based instrument sounds"; one binary file holding samples plus mapping for many instruments | needs a player (FluidSynth, a JS/WASM synth); 30 to 216 MB |
| SF3 | "An extension of the SF2 format that allows sample compression" | MuseScore_General: 215.6 MB as .sf2, 39.9 MB as .sf3 |
| SFZ | "A .sfz definition file is just a text file"; it "does not include the sample content" (separate audio files) | highest quality libraries; needs an SFZ player |
| Per-note MP3 folders | one small file per note, e.g. `marimba-mp3/C4.mp3` | what a browser wants; no player needed |

**General MIDI (GM)** is the convention that program numbers mean fixed instruments, so any GM soundfont has the same 128 slots. Positions in FluidR3_GM's `names.json` (1-based, assumed GM order): glockenspiel 10, vibraphone 12, marimba 13, tubular_bells 15, cello 43, orchestral_harp 47, string_ensemble_1 49, choir_aahs 53, flute 74, pad_2_warm 90, kalimba 109, taiko_drum 117, seashore 123, bird_tweet 124.

In the browser, Tone.js `Sampler` fills the gaps: "If you have audio files organized by note, Tone.Sampler will pitch shift the samples to fill in gaps between notes." It is polyphonic (several notes at once).

```js
import * as Tone from "tone";                       // v15.1.22, MIT
const marimba = new Tone.Sampler({
  urls: { C3: "C3.mp3", A3: "A3.mp3", C4: "C4.mp3", A4: "A4.mp3", C5: "C5.mp3", A5: "A5.mp3", C6: "C6.mp3" },
  baseUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/marimba-mp3/",  // self-host for the demo
}).toDestination();
playButton.addEventListener("click", async () => {
  await Tone.start();                               // browsers block audio until a user gesture
  await Tone.loaded();                              // wait for the MP3s
  marimba.triggerAttackRelease("E4", 0.5);          // note, duration in seconds
});
```

(All seven files above returned HTTP 200 today. Flats are spelled with a b: `Eb4.mp3`, `Gb4.mp3`, `Bb4.mp3` all exist. The same spelling works as a `urls` key: the Tone.js 15.1.22 source accepts a note letter, an optional `b` or `#`, then the octave number, or a MIDI number. A test page using this pattern (Tone.js 15.1.22 loaded from unpkg, keys C3, Eb3, Gb3, A3 and C4, then one note and one chord) ran in a desktop browser today: the samples loaded cross-origin, the decoded C4 buffer was 3.13 s of stereo audio, and the notes triggered with no console errors. Nobody has listened to the result yet.)

Measured from the MP3 frame counts: each FluidR3_GM note file checked (marimba C4, glockenspiel C6, choir_aahs C4, seashore C4) lasts 3.16 s; a Salamander piano C4 lasts 16.2 s.

- Pros: instantly musical; a listener recognises "marimba" vs "choir", which makes instrument = category mappings work.
- Cons: licence per library; download size; notes are fixed-length recordings. A FluidR3 choir note is a 3.16 s file (measured), so **sampled notes cannot be held as long drones; use synthesis for sustained layers**, or retrigger overlapping notes about every 2 s.

### 1.3 Recorded real-world audio

Two terms from the sonification literature: an **auditory icon** is a real-world sound that resembles what it stands for (thunder for lightning data); an **earcon** is a short abstract musical motif whose meaning must be learned (Sonification Handbook, chapters 13 and 14).

Three ways to put recordings under data control:

1. **Triggered icon**: play a short clip when an event occurs (a flash, a threshold crossing).
2. **Looped bed**: loop 10 to 30 s of ocean or wind, crossfading 0.5 to 2 s at the seam, and let data drive its gain (for example -30 dB to -6 dB) and a low-pass cutoff (300 to 6,000 Hz).
3. **Granular texture**: feed the clip to a granular player and let data set grain position and density.

- Pros: immediate meaning ("this is the ocean one") with no training; emotional weight.
- Cons: it carries almost no quantitative information; it masks quieter musical layers; each file needs its own licence check; literal sounds can feel cheesy. Keep it well below the data layer and give it an on/off control (see 07-accessibility-and-listening-tests.md).

### 1.4 AI-generated audio (state of late 2026)

| Model / service | What I could confirm | Terms relevant to you | Verdict |
|---|---|---|---|
| Stable Audio Open 1.0 (open weights) | "up to 47s" stereo at 44.1 kHz; trained on 486,492 recordings "licensed under CC0, CC BY, or CC Sampling+"; "better at generating sound effects and field recordings than music"; gated download | "Stability AI Community License"; commercial use per stability.ai/license | only plausible for textures; needs a GPU and setup time |
| Stable Audio 3.0 | vendor page (9 Sep 2026): three of four models open weights, up to 6 min 20 s, no vocals | vendor claim: Community License free under $1M revenue, "you own the audio you generate" (unverified at licence text) | same |
| Meta AudioCraft (MusicGen, AudioGen) | code MIT | weights "released under the CC-BY-NC 4.0 license" | avoid (non-commercial) |
| Google Lyria 3 (`lyria-3-clip-preview`, 30 s clips; `lyria-3.5`, songs of "a couple of minutes") | "All generated audio includes a SynthID audio watermark"; prompts can include text plus up to 10 images | output ownership not stated on the docs page | avoid |
| Google Lyria RealTime (`lyria-realtime-exp`) | streaming music steered by weighted prompts, BPM, density, scale (search summary of Google docs, unverified) | experimental | interesting, but the mapping is a black box |
| Magenta RealTime 2 (open weights) | code Apache-2.0; "Real-time streaming requires Apple Silicon" | weights licence not checked | avoid this weekend |
| Suno | free plan: "only intended for personal, non-commercial use", "cannot be monetized" | conflicts with an open-source release | do not use |

How the Space Apps rules bite:

- The submission checkbox (local `sources/guide-judging.txt`): "all external resources including code, text and images (even if they are open source or freely available) used in the project are listed in the References field" and "my team has not used any copyrighted materials (i.e., music, images, text, etc.) that we don't have permission to use."
- AI disclosure (2025 wording recorded in `03-rules-and-deadline.md`, 2026 text not re-read): declare tools and how they were used; AI audio "must be acknowledged in the description/metadata".
- The project must be the team's original work under an OSI-approved licence (team notes, via a third-party kit). The US Copyright Office's January 2025 report concludes copyright "does not extend to purely AI-generated material" and that prompts alone are not authorship (search summary of copyright.gov, PDF not read). So a pure text-to-music track is weak as "original work" and there may be nothing for you to license.
- Validity: the challenge asks for sonifications generated "from NASA's EIC visual frames". A prompt such as "ocean ambient music" is not derived from the frames. Lyria 3's image input makes it possible to send a frame and get music back, but how the model turns the picture into sound is undocumented, so it cannot support a data-fidelity claim and a listener cannot learn the mapping.

The challenge does invite "machine learning algorithms", so ML is allowed; the point is that generative audio adds legal and validity risk for no scoring gain. Recommendation: none in the audio path. Declare AI coding assistants separately.

### 1.5 Side by side for a 30-hour build

| Route | Time to first good sound | Licence risk | Data fidelity | Size | Use it for |
|---|---|---|---|---|---|
| Synthesis | 1 to 3 h of tuning | none | highest (any parameter is continuous) | 0 | drones, textures, fallback |
| Samples | 30 min | low if CC0/CC BY/MIT and credited | high for pitch, loudness, timbre category | about 1 MB | melodic and percussive events |
| Recordings | 30 min per clip | per file | low | 0.2 to 1 MB per clip | context icon only |
| AI audio | hours (accounts, GPU) | high | none unless you build conditioning | n/a | skip |

## 2. How professionals get theirs

### 2.1 NASA Chandra "A Universe of Sound" (Arcand + SYSTEM Sounds)

- People: Dr. Kimberly Arcand (Chandra visualization scientist, lead), Dr. Matt Russo (astrophysicist and musician) and Andrew Santaguida (musician and sound engineer) of SYSTEM Sounds, with consultant Christine Malec, who is blind.
- What they publish about sound sources is the instrument per layer, not the software. NASA: the team "assigned each wavelength of observation to a different musical instrument or synthesized sound". Cassiopeia A: "modified piano sounds represent X-ray data from Chandra", "strings and brass represent infrared data from Webb and Spitzer", "small cymbals represent stars located via visual light data from Hubble". Their listener-study paper lists Galactic Center = "Glockenspiel, String, Piano", Cassiopeia A = "String section (double bass, cello, viola, and two violins)", Chandra Deep Field South = "Synthetic sounds".
- Mapping pattern (Galactic Center): scan left to right; "The light of objects located towards the top of the image are heard as higher pitches"; "the intensity of the light controls the volume"; point sources are single notes, diffuse clouds a drone.
- Workflow, from SYSTEM Sounds' own public tutorial (`data2midi-part1`): Python (pandas, matplotlib, `midiutil`) maps each data point to a MIDI note number from a hand-picked note list and to a velocity between 35 and 127, writes a `.mid` file, then "open MIDI file in DAW (Digital Audio Workstation) like Logic, Garageband, Ableton, ProTools,...", "choose instruments/sounds", "add effects and/or other layers". Russo elsewhere: "The way I do it is with coding in Python language." A **DAW** is a music production program that plays MIDI through instrument plug-ins. Which DAW and sample libraries the NASA releases actually used is not published in anything I read (unverified).
- Evidence it works for BVI audiences: Arcand et al. 2024 surveyed 3,184 blind or low-vision and sighted participants and report learning gains and positive responses. They release separate layers and describe them: "We're being very specific with providing all of the layers of sound, and then describing what those layers are doing."

### 2.2 "Data Sonification: Caldwell 73" (SVS 13786), the challenge's model

Released 23 Dec 2020; credit "SYSTEM Sounds (M. Russo, A. Santaguida)". The page says: "As the radar scans around in this sonification, the radius of the stars is mapped to pitch, so stars farther from the center are higher pitched. The entire image is converted to the sound of a choir, while the orange and red stars are represented by a marimba, and the blue stars are represented by a glockenspiel."

So: (1) a line sweeps around the centre like a clock hand; (2) a star sounds when the line crosses it; (3) distance from centre sets pitch; (4) star colour picks the instrument (timbre = category); (5) a choir layer carries the image as a whole. The page does not state the software, the scale, the sweep direction, or a volume rule (the challenge text adds luminosity -> volume). Only a 1920x1920 video is offered (mp4 73.9 MB, webm 5.6 MB), no separate audio file. All three timbres exist in FluidR3_GM (`choir_aahs`, `marimba`, `glockenspiel`), so you can reproduce the palette legally.

### 2.3 Earth and climate sonifications

| Project | Data | Mapping | Where the sound came from | Listen | Method |
|---|---|---|---|---|---|
| NASA "Sounds of the Sea" (Ryan and Jon Vandermeulen, 2022) | ocean-colour satellite images (Rio de la Plata, Bering Sea, Coral Sea chlorophyll from Aqua-MODIS, Indian Ocean) | red, green and blue channels "rescaled" and "assigned musical notes"; one voice per channel (inferred) | custom program -> notes imported into a DAW ("For Jon that was GarageBand"); Bering Sea is "three simple instruments plucking along" | https://soundcloud.com/nasa | https://www.nasa.gov/science-research/earth-science/sounds-of-the-sea |
| NASA Earthdata "From Data to Melody" (Maskey and Maroune; page dated 7 Dec 2023) | HLS NDVI (vegetation index) time series, tile 15TVG, Central Iowa, 2020 to 2023; also warming stripes | value -> MIDI note in the set C1 to A6, "higher data values assigned to lower notes"; velocity 35 to 127 | Python `midiutil` MIDI file played by a General MIDI player (repo uses pygame and, in the browser, the MIDIjs player script from midijs.net) | videos on the article | article + https://github.com/NASA-IMPACT/data_sonification (no licence file) |
| "A Song of Our Warming Planet" (Daniel Crawford, 2013) | NASA GISS surface temperature, 1880 to 2012 | one note per year; coldest year (-0.47 C, 1909) = cello open C; three octaves; one semitone = about 0.03 C | a human playing a real cello from the data-derived score | https://vimeo.com/69122809 | https://www.mprnews.org/story/2013/07/09/how-a-university-of-minnesota-student-set-global-warming-to-music |
| "Arctic Sea Ice" (Judy Twedt, 2018) | satellite record of Arctic sea ice (dataset name unverified) | one note per month; "Higher, louder notes mean more ice; lower, quieter notes mean less" | acoustic piano, written score | https://www.youtube.com/embed/Rg5KGVRHP58 | https://ballofwax.org/2018/07/ball-of-wax-53-songs-judy-twedt-arctic-sea-ice/ ; UW thesis "Listening to Earth" |
| "Climate" (Erik Ian Walker, The ClimateMusic Project) | modelled climate variables, 1800 to 2300, in 30 minutes | air temperature -> pitch, CO2 -> tempo, "solar radiation distorts notes" | composed score performed with live musicians | https://climatemusic.org/our-music/ | https://www.kalw.org/show/crosscurrents/2017-04-24/if-climate-change-were-a-song-what-would-it-sound-like |
| Loud Numbers (Miriam Quick, Duncan Geere) | e.g. 22 years of insect counts; 100 years of Alaska ice break-up dates | "The more insects there are, the more buzzing sounds there are"; the track empties as insects decline | insect recordings, "funereal-like bells", techno production; Geere uses VCV Rack and suggests TwoTone, Sonic Pi, SuperCollider, Max/MSP | https://podcasters.spotify.com/pod/show/loudnumbers/ | https://www.ableton.com/en/blog/sound-the-alarm-data-sonification-as-a-tool-for-climate-action/ |

### 2.4 What the professionals have in common

1. Nobody sends pixels to the loudspeaker. They reduce the image to a few data streams, map each to notes from a chosen note set, then pick pleasant timbres.
2. Timbre encodes category (wavelength, colour, element), pitch encodes position or value, loudness encodes intensity, and extended structure becomes a drone.
3. The sounds are ordinary: sampled or live acoustic instruments plus synthesizer pads. Nothing exotic.
4. They explain each layer in words and let you hear layers separately. Copy this: a solo button per layer plus a one-sentence legend.
5. A blind consultant is in the loop, and prefers sonifications that are "simpler and cleaner because they're easier to parse" (Malec).

## 3. Licence-safe sound sources you can use this weekend

Licence vocabulary: **CC0 / public domain** = no conditions. **MIT** = keep the copyright and licence notice. **CC BY** = credit the author, name and link the licence, say if you changed the file (standard practice; deed not re-read today). **CC BY-SA** = as CC BY plus derivatives must carry the same licence. **NC / non-commercial** = cannot go into an open-source release, which must allow commercial use (Open Source Definition, not re-read today). **GPL-3.0** = everything combined with it must be GPL too. The OSI FAQ says of CC0 for code: "we do not recommend releasing software using the the CC0 public domain dedication", so use MIT or Apache-2.0 for your code and keep audio assets under their own licences.

| Source | What you get | Licence, as stated at the source | Credit line to paste | Commit to your repo? | Catch |
|---|---|---|---|---|---|
| Your own synthesis (Tone.js v15.1.22) | any synth sound | Tone.js is MIT | "Tone.js (MIT)" | yes | none |
| FluidR3_GM via `gleitz/midi-js-soundfonts` | 128 GM instruments as per-note MP3 (marimba C4 14.8 KB, glockenspiel C6 16.6 KB, choir C4 25.6 KB); CORS `*` | repo README: "Released under Creative Commons Attribution 3.0 license". The FluidR3 README reproduced by MuseScore: "I hereby release Fluid under the MIT license" (Frank Wen) | "Fluid (R3) GM SoundFont by Frank Wen, MP3 renders from MIDI.js Soundfonts by Benjamin Gleitzman, CC BY 3.0" | yes, with credit | the two statements conflict; crediting Frank Wen satisfies both |
| MusyngKite, FatBoy (same repo) | better-sounding GM sets | "Creative Commons Attribution Share-Alike 3.0" | n/a | avoid | share-alike; MusyngKite is smplr's default kit, so pass `kit: "FluidR3_GM"` |
| MuseScore_General | GM soundfont, .sf2 215.6 MB, .sf3 39.9 MB | "MuseScore_General.sf2 is shared under the MIT license"; "The acknowledgements and copyright notices above must be included in any derivative work" | copy the notice block from its licence file | yes, but too big for a web page | needs an SF2 player; use for Python or desktop rendering only |
| GeneralUser GS v2.0.3 (S. Christian Collins) | GM/GS soundfont, 32.3 MB, "261 instrument presets and 13 drum kits" | custom: "You may use GeneralUser GS without restriction for your own music creation, private or commercial... Please feel free to use it in your software projects" | "GeneralUser GS by S. Christian Collins" | yes | author "cannot be 100% sure where all of the samples originated"; asks you not to hotlink his download files |
| Salamander Grand Piano (Alexander Holm) | multisampled Yamaha C5 grand; MP3 notes at tonejs.github.io/audio/salamander/ (C4 = 78.7 KB) | "Licence: CC-by http://creativecommons.org/licenses/by/3.0/" | "Salamander Grand Piano by Alexander Holm, CC BY 3.0" | yes, with credit | piano only |
| VSCO-2 CE (Versilian Studios) | orchestral library (SFZ version 1.1.0 available), repo about 2.3 GB | CC0-1.0 | none required; list it anyway | yes | large; pick individual WAVs |
| VCSL (Versilian Community Sample Library) | mallets, harps, percussion, organs, kalimba and more; repo about 4 GB | "under a Creative Commons 0 license... no royalties, no credit, no special terms" | none required; list it anyway | yes | large; easiest through smplr's hosted copy, whose index lists 195 VCSL instruments (Marimba, Glockenspiel, Vibraphone, Concert Harp, Tubular Bells, Timpani, Ocean Drum, Wine Glasses and more); smplr calls its VCSL support partial |
| `nbrosowsky/tonejs-instruments` | 19 instruments as MP3 notes plus a Tone.js loader (harp C5 = 170 KB) | "Code: MIT License"; "Samples: CC-by 3.0" | "tonejs-instruments (github.com/nbrosowsky), samples CC BY 3.0" | yes, with credit | cello, nylon guitar and harmonium come from Freesound uploads whose own licences I did not check; prefer the VSCO-derived ones (harp, flute, violin, xylophone) |
| `smplr` (danigb) + hosted samples | JS sampler with ready instruments (FluidR3_GM, Splendid Grand Piano, VCSL mallets) and offline WAV export | library MIT (v1.2.0); samples keep their own licences (VCSL CC0; Splendid Grand Piano "released as public domain... by Akai") | per instrument | library yes | samples load from GitHub Pages, which "rate-limits requests per second"; no licence is stated for its Mellotron set, skip it |
| WebAudioFont (surikov) | about 2,000 GM instruments as JS files | GPL-3.0 | n/a | only if your project is GPL-3.0 | several source banks have undocumented origin |
| University of Iowa Musical Instrument Samples | orchestral notes recorded in an anechoic chamber | "may be downloaded and used for any projects, without restrictions" | "University of Iowa Musical Instrument Samples" | yes | raw files, need trimming |
| Freesound | any field recording | per sound: CC0, Attribution, or Attribution NonCommercial | FAQ format: "sound1" by user1 (http://freesound.org/s/soundID/), plus the licence | CC0 and CC BY yes; BY-NC no | account required to download; filter to "Creative Commons 0" and record the sound ID |
| US National Park Service sound libraries | ocean, stream, rain, thunder, wildfire, geysers, birds | Yellowstone: "in the public domain. They may be downloaded and used without limitation; however, please credit the 'National Park Service'". Sound Gallery: "The files are in the public domain and may be downloaded" | "National Park Service, <clip>, <URL>" | yes | US natural sounds only |
| NASA audio (nasa.gov, soundcloud.com/nasa) | mission audio, sonifications | NASA material is "generally... not subject to copyright in the United States"; "NASA should be acknowledged as the source" | "NASA" (text only, no logo) | yes | third-party material inside NASA products is excluded; the insignia is "not in the public domain" |
| SVS / EIC video soundtracks | production music | "licensed music, which is not in the public domain"; "you're allowed to use them without the associated audio tracks" | n/a | **no** | EIC pages 12772, 13417, 13543, 14367, 14369, 14568, 14606, 14696, 14700, 14713 carry third-party music credits (e.g. Universal Production Music, Atmosphere Music); on four of them the credit sits in a media-group description, not the page description, and gallery pages 40467, 40484, 40487 re-list some of these videos |
| BBC Sound Effects | 30,000+ effects | RemArc licence; site text: "Commercial use of this content is not allowed under the RemArc license" | n/a | **no** | non-commercial only |
| Pixabay audio | music and effects | summary: "You cannot sell or distribute Content... on a Standalone basis" | none required | **no** (a raw file in a public repo is standalone distribution) | summary is not the binding text |

## 4. Where the sound is produced: browser vs pre-rendered

| | In the visitor's browser, real time | Pre-rendered audio files |
|---|---|---|
| What "live sonification" means | audio is computed while the frame plays; the user can scrub, change mapping, solo a layer | a fixed recording; press play |
| Tools | Web Audio API, Tone.js, smplr | Python (numpy + standard-library `wave`), MIDI file + SoundFont synth, or a DAW |
| Assets | code + about 1 MB of note samples | WAV 16-bit 44.1 kHz = 5.3 MB per minute mono, 10.6 MB stereo; MP3 at 128 kbit/s = about 0.96 MB per minute |
| Risks | audio is blocked until a click (MDN: playback is "generally blocked if... initiated in a tab which has not yet had any user interaction"); sample loading; device differences | no interactivity; "is it live?" from a judge |
| Demo | strongest in the room; always carry a recorded backup | reliable; right for the 30-second video |

Three consequences for this project:

- **The browser cannot read SVS pixels** (SVS sends a fixed `access-control-allow-origin`), so "live" has two honest forms: (a) Python extracts per-frame features into a small JSON file and the browser synthesizes sound from it at playback time; or (b) you copy frames to your own site (allowed: SVS content is "free to download, use, and redistribute") and analyse them in a same-origin canvas. Either way the sound itself is generated live. Details: 06-web-audio-live-sonification.md.
- **A Play button is mandatory**, which is also the right accessible control: one labelled button per visualization.
- **Python on this machine**: numpy plus `wave` works today (tested: 14.4 s mono WAV = 1,270,124 bytes). `tinysoundfont` 0.3.7 (MIT) has Windows wheels only up to Python 3.12, and `pyfluidsynth` needs the FluidSynth program, so SoundFont rendering needs another interpreter or machine. `MIDIUtil` 1.2.1 (MIT, pure Python) can write `.mid` files anywhere. For an offline WAV straight from the browser engine, smplr has `renderOffline(...)` with `result.downloadWav16()`.

GitHub Pages limits are far above this need: sites "may be no larger than 1 GB", with a soft 100 GB per month bandwidth limit.

## 5. Recommended sound-source strategy

**Primary.** Tone.js in the browser. Layer A (events): `Tone.Sampler` with self-hosted FluidR3_GM marimba and glockenspiel, timbre chosen by data category. Layer B (fields): one or two synthesized voices (oscillator or pink noise through a low-pass filter) whose pitch, cutoff and gain follow frame statistics. Layer C (context, optional): one public-domain NPS loop per visualization at low level. Reverb on the master for cohesion (`Reverb` and `Freeverb` exist in Tone.js).

**Fallback.** (1) Same engine with the sampler swapped for `PluckSynth`/`FMSynth`, so the page works with no sample downloads. (2) One pre-rendered MP3 per visualization, linked from the page and used in the video.

**Starting palette per visualization** (a proposal to audition, not a tested design; mappings belong to 03-sonification-mapping-and-synthesis.md and 04-making-it-musical.md):

| Visualization (SVS id) | Voice | Source type |
|---|---|---|
| Lightning from the ISS (5011) | one short FM bell or noise click per flash; optional distant thunder | synthesis; NPS thunder clip |
| GEOS Aerosols (5669) | one instrument per aerosol type | FluidR3_GM samples |
| Sea surface currents and temperature (3912), Perpetual Ocean 2 (5425) | filtered-noise water bed, brighter when warmer; marimba notes for strong currents | synthesis plus one sample set |
| Night lights change (5313) | glockenspiel notes for bright clusters over a low synthesized hum | sample plus synthesis |
| DYAMOND CO2 (5196) | slow drone whose pitch and brightness follow concentration | synthesis |
| Atmospheric river (4960) | rain texture whose density follows moisture | filtered noise, or NPS rain clip |
| GEDI forest height (4950) | pitch follows canopy height on a wooden timbre | marimba samples |
| Air quality (5533) | clean tone that roughens as pollution rises | synthesis (AM, noise) |

**Asset checklist.**

- [ ] `/audio/fluidr3/marimba/`, `/glockenspiel/`, `/choir_aahs/`: 17 notes each (every third semitone over four octaves: C, Eb, Gb, A in each octave, e.g. C2 to C6), copied from `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/<name>-mp3/<Note>.mp3`.
- [ ] `/audio/icons/`: at most one loop per visualization (ocean, rain, thunder), 10 to 30 s, mono MP3, source URL recorded.
- [ ] `/audio/renders/`: one exported track per visualization.
- [ ] `ATTRIBUTION.md` and a `LICENSE` (MIT or Apache-2.0) at the repo root; third-party licence texts next to the files they cover.
- [ ] Every `<video>` muted; no SVS soundtrack anywhere in the repo.
- [ ] Test once with samples blocked (offline) to prove the fallback.

**References / attribution template** (paste into the submission's references field and `ATTRIBUTION.md`; delete unused lines):

```
AUDIO SOURCES. All audio is either generated by our own code or listed here.
1. Synthesized sound: generated at run time by our code with the Web Audio API through
   Tone.js (MIT licence), https://github.com/Tonejs/Tone.js . No pre-existing recordings.
2. Instrument samples (marimba, glockenspiel, choir_aahs): Fluid (R3) General MIDI SoundFont
   by Frank Wen, copyright 2000-2002, 2008; pre-rendered MP3 notes from "MIDI.js Soundfonts"
   by Benjamin Gleitzman, https://github.com/gleitz/midi-js-soundfonts . Licence: Creative
   Commons Attribution 3.0, https://creativecommons.org/licenses/by/3.0/us/ (as stated by that
   repository; the soundfont author's README releases it under the MIT licence).
   Files used unmodified.
3. Environmental recording "<clip name>": U.S. National Park Service, public domain,
   <page URL>. Trimmed and looped by us.
4. "<sound name>" by <user>, https://freesound.org/s/<id>/ , licensed CC0 1.0.
NASA VISUALS. "<title>", NASA's Scientific Visualization Studio,
   https://svs.gsfc.nasa.gov/<id>/ (public domain). Original soundtracks of SVS videos are
   not used; videos are played muted.
USE OF AI. No AI-generated audio, images or video are used in the product.
   <Tool name> was used for <code assistance / proofreading>; all output was reviewed by the team.
```

## Open questions / unverified

- **Chandra production tools**: no source I read names the DAW, synthesizers or sample libraries behind the NASA releases. The Python -> MIDI -> DAW pipeline is inferred from SYSTEM Sounds' tutorial.
- **Caldwell 73**: scale, sweep direction and volume rule are not on the SVS page.
- **FluidR3_GM licence**: CC BY 3.0 (gleitz README) versus MIT (Frank Wen README inside MuseScore's licence file). The original FluidR3_GM package was not inspected.
- **Space Apps 2026 AI wording** was not read at source; the 2025 wording comes via the team's notes. Whether the OSI-licence requirement is meant to cover bundled third-party audio is my interpretation (I assume third-party assets keep their own licences and must be listed).
- **BBC RemArc** full licence text not read (page is JavaScript-rendered; I read the site's own strings). **Pixabay**: only the summary page was read.
- **tonejs-instruments**: the three Freesound-derived instruments' original licences not checked; README calls the sources "public domain" but licenses samples CC BY 3.0.
- **Freesound API**: original-file download "requires OAuth2"; whether preview MP3s are fetchable with a simple token is not stated.
- **NPS**: file formats and direct file URLs not checked.
- **AI services**: Stable Audio 3.0, Suno caps and Udio status come from a Stability AI comparison page and search summaries; Lyria RealTime details and the Copyright Office conclusion come from search summaries; Magenta RealTime 2 weights licence not checked.
- **Climate projects**: Twedt's dataset and performer not confirmed (her former site now redirects to an unrelated business); ClimateMusic's finer mappings (energy balance, ocean pH) appear only in secondary summaries; "From Data to Melody" is dated 7 Dec 2023 on the page but April 2023 in one search summary.
- **Untested here**: Tone.js offline rendering; `.ogg` variants on midi-js-soundfonts (one path returned 404); building `tinysoundfont` on Python 3.14; reading 24-bit WAVs with the standard library; SF3 using Ogg Vorbis specifically; GM numbers assume `names.json` is in GM order.
- **Measured on few files**: note durations (3.16 s) come from four FluidR3_GM files and one Salamander file; flat-named files were checked for marimba, glockenspiel and choir only. The Tone.js sampler pattern was run once, in one desktop browser (it loaded and triggered without errors); it was not tried on a phone, in Safari or with a screen reader.
- **Crawl audio**: the one audio item in the EIC crawl (`maria_360_audio.mov`, SVS 4685) was not opened. Page 4685 has no music credit of its own, but its produced-video page SVS 13079 ("Inside Hurricane Maria in 360") credits "The Answer" by Laurent Levesque [SACEM] from Killer Tracks, so treat that soundtrack as licensed music and do not use it.
- I could not listen to any candidate sound. Someone should audition FluidR3 marimba, glockenspiel and choir before committing.

## Sources

Space Apps and SVS
- Local copy of the challenge text - `C:\Users\alexl\code\hackathons\SpaceApps\spaceapps-2026\sources\jukebox.txt` - deliverable forms, "machine learning algorithms" allowed
- Local copy of the judging guide - `C:\Users\alexl\code\hackathons\SpaceApps\spaceapps-2026\sources\guide-judging.txt` - references and copyrighted-material checkbox
- Team rules notes - `C:\Users\alexl\code\hackathons\SpaceApps\spaceapps-2026\03-rules-and-deadline.md` - AI disclosure wording (2025), OSI licence requirement
- Local EIC crawl - `C:\Users\alexl\code\hackathons\spaceapps-eic-evidence\pages.json`, `media.json`, `svs_api/` - one audio item (a .mov), no .wav/.mp3; ten pages with production-music credits, each re-checked on the live page API (https://svs.gsfc.nasa.gov/api/<id>)
- Data Sonification: Caldwell 73 - https://svs.gsfc.nasa.gov/13786/ and https://svs.gsfc.nasa.gov/api/13786 - mapping text, credit, date, files
- SVS help - https://svs.gsfc.nasa.gov/help/ - public domain statement, licensed-music exception
- NASA images and media guidelines - https://www.nasa.gov/nasa-brand-center/images-and-media/ - copyright status, acknowledgement, insignia
- NASA audio and ringtones - https://www.nasa.gov/audio-and-ringtones/ - points to media guidelines; NASA SoundCloud https://soundcloud.com/nasa

Professional practice
- A Universe of Sound - https://chandra.si.edu/sound/ - team and roles
- Chandra blog, Sounds from Around the Milky Way - https://chandra.harvard.edu/blog/node/770 - Galactic Center mapping, credit line
- NASA Open Science Reveals Sounds of Space - https://science.nasa.gov/open-science/astronomy-data-sonification/ - instrument per wavelength, Cassiopeia A, layers quote
- Arcand et al. 2024, Frontiers in Communication - https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2024.1288896/full (preprint https://arxiv.org/abs/2403.18082) - 3,184 participants, instrument table
- SYSTEM Sounds sonification tutorials - https://github.com/SYSTEMSounds/sonification-tutorials - Python to MIDI to DAW workflow, libraries, TwoTone (https://twotone.io)
- Orinoco Communications, Matt Russo interview - https://www.orinococomms.com/research-comms-blog-podcast/matt-russo - "coding in Python"
- WNYC Studios, How NASA translates space data - https://www.wnycstudios.org/podcasts/universe-art/articles/how-nasa-translates-space-data-into-sparkly-and-haunting-songs - Russo and Arcand on method
- Astronomy.com, How sonification turns data into sound - https://www.astronomy.com/science/how-sonification-turns-data-into-sound/ - Malec quote
- NASA, Sounds of the Sea - https://www.nasa.gov/science-research/earth-science/sounds-of-the-sea - ocean-colour method, GarageBand, https://www.spektune.com/
- NASA Earthdata, From Data to Melody - https://www.earthdata.nasa.gov/news/blog/from-data-melody-data-sonification-its-role-open-science - NDVI mapping; code https://github.com/NASA-IMPACT/data_sonification
- MPR News on Daniel Crawford - https://www.mprnews.org/story/2013/07/09/how-a-university-of-minnesota-student-set-global-warming-to-music - cello mapping; video https://vimeo.com/69122809
- Ball of Wax on Judy Twedt - https://ballofwax.org/2018/07/ball-of-wax-53-songs-judy-twedt-arctic-sea-ice/ - note = month; Cascade PBS https://www.cascadepbs.org/environment/2018/12/when-turned-music-climate-change-sounds-alarmingly-beautiful - piano description, video; thesis record https://digital.lib.washington.edu/researchworks/items/bb9669f6-fca1-4614-b70e-347f3eebe30b/full
- KALW on the ClimateMusic Project - https://www.kalw.org/show/crosscurrents/2017-04-24/if-climate-change-were-a-song-what-would-it-sound-like - mappings, span; project site https://climatemusic.org/
- Ableton blog, Sound the Alarm - https://www.ableton.com/en/blog/sound-the-alarm-data-sonification-as-a-tool-for-climate-action/ - Loud Numbers, tools named
- The Sonification Handbook - https://sonification.de/handbook/ - chapters 9 (sound synthesis), 13 (auditory icons) https://sonification.de/handbook/index.php/chapters/chapter13 , 14 (earcons) https://sonification.de/handbook/index.php/chapters/chapter14 , 15 (parameter mapping)

Sound sources and licences
- MIDI.js Soundfonts - https://github.com/gleitz/midi-js-soundfonts - FluidR3_GM CC BY 3.0, MusyngKite and FatBoy CC BY-SA 3.0, URL prefix https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/
- MuseScore_General licence - https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General_License.md - MIT, Frank Wen README, notices
- GeneralUser GS - https://github.com/mrbumpy409/GeneralUser-GS (documentation/LICENSE.txt) and https://www.schristiancollins.com/generaluser - custom licence text, size
- Salamander Grand Piano - https://github.com/sfzinstruments/SalamanderGrandPiano and https://github.com/Tonejs/audio - CC BY 3.0, recording details
- VSCO-2 CE - https://github.com/sgossner/VSCO-2-CE - CC0; VCSL - https://github.com/sgossner/VCSL - CC0 wording; smplr-hosted VCSL index https://smpldsnds.github.io/sgossner-vcsl/instruments.json - 195 instrument names
- tonejs-instruments - https://github.com/nbrosowsky/tonejs-instruments - licences, instrument list, sample sources
- smplr - https://github.com/danigb/smplr - instruments, default kit, rate-limit note, offline render; hosted samples https://github.com/smpldsnds and https://github.com/danigb/samples ; Splendid Grand Piano https://github.com/sfzinstruments/SplendidGrandPiano
- WebAudioFont - https://github.com/surikov/webaudiofont - GPL-3.0
- University of Iowa MIS - https://theremin.music.uiowa.edu/MIS.html - "without restrictions"
- Freesound FAQ - https://freesound.org/help/faq/ - licences, attribution format, login; API https://freesound.org/docs/api/resources_apiv2.html and https://freesound.org/docs/api/authentication.html
- NPS Yellowstone sound library - https://www.nps.gov/yell/learn/photosmultimedia/soundlibrary.htm ; NPS Sound Gallery - https://www.nps.gov/subjects/sound/gallery.htm - public domain statements, categories
- BBC Sound Effects - https://sound-effects.bbcrewind.co.uk/licensing - RemArc, no commercial use
- Pixabay licence summary - https://pixabay.com/service/license-summary/ - standalone restriction
- OSI FAQ - https://opensource.org/faq - CC0 not recommended for software
- Creative Commons BY 3.0 - https://creativecommons.org/licenses/by/3.0/ - licence referenced by the sample sets

AI audio
- Stable Audio Open 1.0 model card - https://huggingface.co/stabilityai/stable-audio-open-1.0 - licence, 47 s, training data, limits
- Stability AI comparison page (vendor) - https://stability.ai/explainers/stable-audio-vs-competitors-licensing-export-rights-and-self-hosting-compared - Stable Audio 3.0, competitor claims
- AudioCraft - https://github.com/facebookresearch/audiocraft - MIT code, CC-BY-NC 4.0 weights
- Google music generation docs - https://aistudio.google.com/docs/music-generation - Lyria 3 models, SynthID; Lyria RealTime https://ai.google.dev/gemini-api/docs/realtime-music-generation (search result only)
- Magenta RealTime - https://github.com/magenta/magenta-realtime - open weights, Apple Silicon
- Suno help, free plan rights - https://help.suno.com/en/articles/9601601 - non-commercial only
- US Copyright Office, AI report part 2 - https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf (search result only)

Browser and Python tooling
- Tone.js - https://github.com/Tonejs/Tone.js and https://tonejs.github.io/docs/15.1.22/index.html - `Tone.start()`, `Tone.loaded()`, class list; Sampler https://tonejs.github.io/docs/15.1.22/classes/Sampler.html ; PluckSynth https://tonejs.github.io/docs/15.1.22/classes/PluckSynth.html ; GrainPlayer https://tonejs.github.io/docs/15.1.22/classes/GrainPlayer.html ; Noise https://tonejs.github.io/docs/15.1.22/classes/Noise.html
- Tone.js 15.1.22 source - https://raw.githubusercontent.com/Tonejs/Tone.js/15.1.22/Tone/instrument/Sampler.ts and https://raw.githubusercontent.com/Tonejs/Tone.js/15.1.22/Tone/core/util/TypeCheck.ts - accepted `urls` keys (note names with b or #, or MIDI numbers); browser build used in the test page https://unpkg.com/tone@15.1.22/build/Tone.js
- MDN OscillatorNode.type - https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/type - waveform types
- MDN autoplay guide - https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay - user-gesture rule
- SFZ format - https://sfzformat.com/ ; FluidSynth SoundFont wiki - https://www.fluidsynth.org/wiki/SoundFont/ ; MuseScore handbook - https://handbook.musescore.org/sound-and-playback/soundfonts - format definitions
- Package metadata - https://registry.npmjs.org/tone/latest , https://registry.npmjs.org/smplr/latest , https://pypi.org/pypi/tinysoundfont/json , https://pypi.org/pypi/MIDIUtil/json - versions and licences
- GitHub Pages limits - https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits - 1 GB site, 100 GB per month
