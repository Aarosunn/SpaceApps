import { Icon } from "@/components/Icon";
import s from "@/components/Player.module.css";

/* Figma 38:811: "Now listening" bar without the hide-controls button (differs from shared NowListening). */
export function NowBar({ text = "Now listening: Amazon 2019" }: { text?: string }) {
  return (
    <div className={s.nowBar} style={{ top: 722, padding: "10px 14px" }}>
      <Icon name="icon-speaker" size={18} />
      <p className={s.nowText}>{text}</p>
    </div>
  );
}
