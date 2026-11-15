"use client";

import { Icon } from "@/components/Icon";
import s from "./SharePopover.module.css";

/* Share popover, Figma 38:609. */
export function SharePopover({ url = "earthjukebox.app/fires-south", copied = true, onCopy, onSave, saved }: { url?: string; copied?: boolean; onCopy?: () => void; onSave?: () => void; saved?: boolean }) {
  return (
    <section className={s.pop} aria-label="Share this mixtape">
      <p className={s.title}>Share this mixtape</p>
      <div className={s.field}>
        <Icon name="mixtape-shared/icon-link" size={16} />
        <p className={s.url}>{url}</p>
      </div>
      <div className={s.buttons}>
        <button className={`${s.btn} ${s.copied}`} aria-live="polite" onClick={onCopy}>
          {copied && <Icon name="mixtape-shared/icon-check" size={16} />}
          {copied ? "Link copied" : "Copy link"}
        </button>
        <button className={`${s.btn} ${s.save}`} onClick={onSave}>{saved ? "Saved" : "Save to my mixtapes"}</button>
      </div>
      <p className={s.note}>Anyone with the link can listen to this route, in the genre they choose. No account needed.</p>
    </section>
  );
}
