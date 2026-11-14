# Current idea: "Earthsound" (working title), for the challenge "The Earth Information Jukebox"

Team: 5 people (4 technical, 1 business), Chicago local event. Deadline Sun Nov 15 2026 11:59 PM CT. Stack undecided; leaning static web app (Web Audio), no backend.

## Pitch
A daily listening game that teaches Earth science by ear. You hear a soundscape generated from a NASA Earth Information Center (EIC) visualization for a hidden place, explore it by moving, guess which place it is, then get a reveal explaining what the data shows there and why it matters. Built audio-first so blind and low-vision players can play; still fun for sighted players.

## Design
- Sound engine: EIC frames/animations (NASA SVS: night lights 2012-2023, sea surface currents+temperature, GEDI forest height, ISS lightning 2017-2023, aerosols, CO2 ...) are pre-processed offline into value grids (colorbar decoded to physical values where possible). In the browser, values at a location drive Web Audio synthesis. Each data layer has its own instrument/sound signature (forest, ocean, city lights, storms). Animations make the sound evolve over time.
- Explore ("jukebox") mode: pick a visualization from a list, move a "listening cursor" over the map and hear the data change. Laptop: arrow keys. Phone (same website): tilt the phone (DeviceOrientation), intended to work with VoiceOver on. Drag as fallback.
- Guess mode: 5 rounds per day (date-seeded, same for everyone). Each round: hear a place, choose 1 of 4 spoken/keyboard-selectable places. Difficulty rises by making the 4 choices more similar. Hints cost points (isolate one layer with its name spoken; spoken text clue; show/describe the image). 1000 pts per round, half credit for a same-environment-type miss. Optional bonus: guess the year from night lights. End: tier name + share line. No leaderboard, no timer.
- Reveal card per round: place, the data behind each sound layer, the environmental story and why it matters.
- Accessibility: screen reader labels, keyboard, captions/visual mirror of the sound, published data-to-sound mapping table.
- Validity evidence planned: in-game accuracy vs 25% chance; small blindfolded listener test (about 5 people).
- Target awards: Global Connection (primary), Art & Technology (secondary).
- Cut: AirPods head tracking, live "ambient watch", 3D globe, leaderboard, native app, free-form voice commands.

## Known facts
- svs.gsfc.nasa.gov images are not CORS-readable from other origins, hence offline preprocessing and self-hosting.
- At least 3 visuals have flat world-map versions (night lights 5313, sea surface 3912, GEDI 4950). Several others are globe/3D renders.
- The challenge is believed to be the most crowded of 2026 (roughly 100+ GitHub repos by day 1, noisy count).
