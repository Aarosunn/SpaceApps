/* Feature switches for the final-stretch additions. Set one to false to turn that feature off everywhere
   (each feature is also its own git commit, so `git revert <hash>` removes its code). */
export const FLAGS = {
  instruments: true, // a different instrument and scale per data type (false = the single shared voice)
  visualFx: true, // map overlays that move with the sound: reading window, note ripples, aura, live waveform
  mapKeyboard: true, // focus the map and explore it with the arrow keys
  voiceControl: true, // microphone button + V key: spoken commands ("add Amazon", "next", "wildfires")
  gameJuice: true, // game: spinning record, points and streak, confetti, fire round, "play my mix"
};
