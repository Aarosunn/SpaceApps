"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import s from "./WordCaption.module.css";

const WORD_MS = 110;

/* Live caption that types itself in word by word (Figma 28:176 look). Screen readers get the full sentence once. */
export function WordCaption({ text }: { text: string }) {
  const words = text.split(" ");
  const [shown, setShown] = useState({ text, n: 0 });
  const n = shown.text === text ? shown.n : 0; // new text restarts the reveal

  useEffect(() => {
    // Reduced motion: reveal everything on the first tick instead of word by word.
    const all = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    const id = setInterval(() => {
      i = all ? words.length : i + 1;
      setShown({ text, n: i });
      if (i >= words.length) clearInterval(id);
    }, all ? 0 : WORD_MS);
    return () => clearInterval(id);
  }, [text, words.length]);

  return (
    <div className={s.caption}>
      <Icon name="icon-caption" size={22} />
      <p className={s.text} aria-hidden="true">
        {words.map((w, i) => (
          <span key={i} className={i < n ? s.on : s.off}>
            {w}{i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
      <span className="sr-only" aria-live="polite">{text}</span>
    </div>
  );
}
