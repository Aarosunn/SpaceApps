import { Icon } from "@/components/Icon";
import s from "./Caption.module.css";

/* Two-line live caption (38:901): fixed 398px text width, top 814. */
export function Caption({ text }: { text: string }) {
  return (
    <div className={s.caption} aria-live="polite">
      <Icon name="icon-caption" size={22} />
      <p className={s.text}>{text}</p>
    </div>
  );
}
