import { Icon } from "./Icon";
import s from "./LiveCaption.module.css";

/* Live caption (aria-live), Figma 28:176: text mirror of the sound for deaf/hard-of-hearing users. */
export function LiveCaption({ text }: { text: string }) {
  return (
    <div className={s.caption} aria-live="polite">
      <Icon name="icon-caption" size={22} />
      <p className={s.text}>{text}</p>
    </div>
  );
}
