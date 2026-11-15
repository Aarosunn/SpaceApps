# EarthFM demo video (30 s)

Final file: `out/earthfm-demo.mp4` (1920x1080, 30 fps, H.264 + AAC, English captions burned in).

## How it is made
1. **Real footage.** `capture/capture.mjs` drives the running app (`http://localhost:3000`) in headless Chrome and records
   the screen (screencast frames to a 30 fps MP4) and the app's own Web Audio output (tapped before the speakers).
   Clips land in `public/clips/` with a JSON of event times.
2. **Sound effects.** `capture/make_sfx.py` synthesises whoosh, riser, impact, pop and the end chord with numpy.
   No samples and no downloaded music are used anywhere.
3. **Edit.** `src/Demo.tsx` (Remotion) cuts the clips, adds the hook, captions, wipes, zooms and the end card.

## Re-make it
```bash
# app running: (cd ../EarthFM && npm run dev)
node capture/capture.mjs globe && node capture/capture.mjs game && node capture/capture.mjs keys
python3 capture/make_sfx.py
for f in globe keys; do ffmpeg -y -i public/clips/$f.wav -af "volume=5dB,alimiter=limit=0.9" public/clips/$f-loud.wav; done
ffmpeg -y -i public/clips/game.wav -af "volume=13dB,alimiter=limit=0.9" public/clips/game-loud.wav
npm install && npm run render      # or: npm run studio  (to edit with a live preview)
```
If you re-capture, check the event times in `public/clips/*.json` against the `src:` values in `SHOTS` (`src/Demo.tsx`).

## Notes
- **Remotion licence.** Remotion is free for individuals and for teams of up to 3 people; larger for-profit
  companies need a licence (https://remotion.dev/license). Check that a 5-person student hackathon team is covered
  before using it beyond this submission.
- **AI disclosure.** The edit, captions and sound effects were made with AI assistance (noted on every frame).
  The app footage and its audio are real recordings of the app.
- The headless browser has no speech voices, so the app's text-to-speech is not heard in the video.
