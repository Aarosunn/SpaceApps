import { Icon } from "@/components/Icon";
import s from "./NowBar.module.css";

/* Flight 2 now-listening bar (38:1024): no hide button, top 722. */
export function NowBar({ text }: { text: string }) {
  return (
    <div className={s.bar}>
      <Icon name="icon-speaker" size={18} />
      <p className={s.text}>{text}</p>
    </div>
  );
}
