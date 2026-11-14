import { Icon } from "@/components/Icon";
import s from "./NowListeningBar.module.css";

/* Now listening (Figma 38:583): no hide button in this state. */
export function NowListeningBar() {
  return (
    <div className={s.bar}>
      <Icon name="icon-speaker" size={18} />
      <p className={s.text}>Now listening: Amazon 2019</p>
    </div>
  );
}
