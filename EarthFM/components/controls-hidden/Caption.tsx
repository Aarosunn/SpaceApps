import { Icon } from "@/components/Icon";
import s from "./Caption.module.css";

/* Live caption (aria-live), Figma 41:153: 14px text in a fixed 398px column, top 838. */
export function Caption({ text }: { text: string }) {
  return (
    <div className={s.caption} aria-live="polite">
      <Icon name="icon-caption" size={22} />
      <p className={s.text}>{text}</p>
    </div>
  );
}

/* Bottom scrim (41:115): same gradient at 50% opacity. */
export function HalfScrim() {
  return <div className={s.scrim} aria-hidden="true" />;
}
