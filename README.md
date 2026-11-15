# EarthFM

A web jukebox that turns NASA Earth Information Center pictures into music. Built for the
NASA Space Apps Challenge 2026, challenge "The Earth Information Jukebox", at the Chicago Local Event.

Click a place on the world map and EarthFM plays the NASA data around it as a song generated live
in the browser. Higher notes mean higher values. It is designed to be used without seeing the
screen: captions, spoken descriptions, keyboard control, voice commands and a spoken way to explore
the map. A four-round listening game is at `/play`.

## Run it

You need Node.js 20 or newer.

```bash
cd EarthFM
npm install
npm run dev
```

Open http://localhost:3000 for the map and http://localhost:3000/play for the game.
Sound starts after your first click or key press, because browsers block audio until then.

Other commands, all run inside `EarthFM`:

| Command | What it does |
|---|---|
| `npm run build` | Production build |
| `npx tsc --noEmit` | Type check |
| `npm run lint` | Lint |

The page `/selfcheck` runs the built-in checks of the place naming, the sound mapping, the command
parser and the share-link code, and lists any failure on the page.

## What is in this repository

| Folder | Contents |
|---|---|
| `EarthFM/` | The app (Next.js, React, TypeScript, Tone.js). Data files are in `EarthFM/public/sonify/`. |
| `spaceapps-2026/sonification/recipes-python/` | Python scripts that turn NASA frames into the data files |
| `spaceapps-2026/` | Research notes on the challenge, the NASA pages and sonification |
| `video/` | The 30-second demo video and the scripts that made it |
| `UI/` | Tooling used to build the screens from the Figma design |

## How the sound is made

1. **Pictures become numbers.** Python scripts read NASA's published frames. For sea temperature and
   global temperature they match each pixel's colour to NASA's colour bar to recover the value. For
   wildfires they count bright fire pixels. Values are averaged into 10-degree squares (18 rows by
   36 columns for the globe) and scaled to between 0 and 1.
2. **Numbers become notes.** In the browser, the app takes the 8 by 5 block of squares around a
   place. Each value picks a note on a musical scale: low value, low note. A square with no data is
   a rest.
3. **Notes become sound.** Tone.js synthesises every sound live. There are no recordings.

The app explains these steps itself: add a place and press `?`.

## NASA data

All data comes from visualizations published by the NASA/Goddard Space Flight Center Scientific
Visualization Studio (SVS), in the Earth Information Center collection. We used the images and
video frames as the data.

| Used for | NASA SVS page |
|---|---|
| Sea heat layer | [3912 Global Sea Surface Currents and Temperature](https://svs.gsfc.nasa.gov/3912/) |
| Wildfires layer | [5113 Active Fires As Observed by VIIRS](https://svs.gsfc.nasa.gov/5113/) |
| Global heat layer, Arctic round | [5207 Global Temperature Anomalies from 1880 to 2023](https://svs.gsfc.nasa.gov/5207/) |
| Night lights round | [5313 Change in Night Lights between 2012 and 2023](https://svs.gsfc.nasa.gov/5313/) |
| Sea level round | [5235 Sea Level Through a Porthole](https://svs.gsfc.nasa.gov/5235/) |
| Wildfire round | [5453 Annual Wildfire Burned Area in the United States](https://svs.gsfc.nasa.gov/5453/), [14606 NASA and Fire](https://svs.gsfc.nasa.gov/14606/) |

NASA does not endorse this project.

## Limits

- The data is a fixed set built from NASA's frames during the hackathon. The app does not fetch live data.
- Values are read from NASA's pictures through their colour bars, which is less precise than the original measurements.
- Each square is a 10-degree average, so the app shows broad patterns, not local detail.
- The sea temperature layer is a NASA ocean model for 2007 to 2008. The wildfire layer measures how
  much fire shows in the picture, not the area burned. The global temperature scale stops at plus or
  minus 2 °C.
- The numbers in the game are our own approximate readings of NASA's visualizations.
- Spoken descriptions and voice commands are in English. Voice commands need Chrome, Edge or Safari.
- Not yet tested with a screen reader, with blind users, or in a formal accessibility audit.

## AI use

This project was built with AI assistance. We state it here because the Space Apps rules ask for
AI-assisted code, audio and data to be acknowledged in the project itself.

- **Code.** Anthropic's Claude, through Claude Code (models Claude Fable 5.2, Claude Opus 5.5 and
  Claude Sonnet), helped write, review and test code in the app, the data scripts and the video
  scripts. Some commits carry a `Co-Authored-By: Claude` line and some AI-assisted commits do not,
  so the commit history alone does not show every AI-assisted change.
- **Interface.** AI helped build the screens from our Figma designs and compare screenshots with them.
- **Text.** The captions and explanations shown in the app, and the project's written submission,
  were drafted with AI assistance and checked by the team.
- **Research.** The notes in `spaceapps-2026/` on the challenge rules, past winners, NASA's pages,
  and sonification and accessibility research were compiled with AI agents. Those notes also include
  AI-written critiques and rankings of project ideas.
- **Data.** The data files are produced by our Python scripts from NASA's frames. The scripts were
  written with AI coding assistance. No machine-learning model generates or alters the data.
- **Audio.** All sound in the app is synthesised live from the data by fixed rules that the app
  shows. No machine-learning model generates audio, and no AI-generated music or voices are used.
  The spoken descriptions use the browser's built-in voice.
- **Video.** The demo video's capture script, edit, captions and end-card sound were made with AI
  assistance, and the video shows "Made with AI assistance" on every frame. The footage and its
  audio are real recordings of the app.

No AI-generated content uses or alters NASA logos or branding.

## Credits

Next.js, React, TypeScript, Tone.js, the Web Audio and Web Speech APIs, Python, NumPy, Pillow,
FFmpeg, Figma, Playwright, Remotion, and the fonts Geist and DM Mono. The OKLab colour conversion
follows Björn Ottosson, "A perceptual color space for image processing" (2020).
