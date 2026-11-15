/* Feature switches for the final-stretch additions. Set one to false to turn that feature off everywhere
   (each feature is also its own git commit, so `git revert <hash>` removes its code). */
export const FLAGS = {
  instruments: true, // a different instrument and scale per data type (false = the single shared voice)
  visualFx: true, // map overlays that move with the sound: reading window, note ripples, aura, live waveform
  mapKeyboard: false, // focus the map and explore it with the arrow keys. Off: the audio navigation (Shift + arrows, H for help) covers this
  voiceControl: true, // microphone button: spoken commands ("add Amazon", "next", "wildfires")
  gameBand: true, // game: more instruments join as the value rises (bass, hi-hat, kick, sparkle)
  gameJuice: true, // game: spinning record, points and streak, confetti, fire round, "play my mix"
};
