import { ShowControls } from "@/components/Player";
import s from "./ShowControlsPill.module.css";

/* Show controls (B) pill, Figma 41:303: horizontally centered at 50% + 0.5px, top 824. */
export function ShowControlsPill() {
  return (
    <div className={s.center}>
      <ShowControls left={0} top={0} />
    </div>
  );
}
