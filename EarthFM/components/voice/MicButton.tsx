"use client";

import s from "./MicButton.module.css";

/* Microphone button for voice commands (V key). Lime and pulsing while listening. */
export function MicButton({ listening, onClick, left, top }: { listening: boolean; onClick: () => void; left: number; top: number }) {
  return (
    <button
      className={`${s.mic} ${listening ? s.on : ""}`}
      style={{ left, top }}
      onClick={onClick}
      aria-pressed={listening}
      aria-label={listening ? "Listening. Press to stop (V)" : "Voice command (V)"}
      title='Voice command (V). Try "add Amazon", "next" or "wildfires".'
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
      {listening && <span className={s.ring} aria-hidden="true" />}
    </button>
  );
}
