import { Stage } from "@/components/Stage";
import { TopLeft } from "@/components/TopLeft";
import { Mixtape } from "@/components/Mixtape";
import { LiveCaption } from "@/components/LiveCaption";
import { SotScrim, SotNowListening, YearsPlayer } from "@/components/sonification-over-time/Panel";

/* Figma 20:549 "Sonification over Time". */
export default function SonificationOverTime() {
  return (
    <Stage>
      <SotScrim />
      <LiveCaption text="Amazon finished. Next stop: Central Africa." />
      <YearsPlayer />
      <SotNowListening />
      <Mixtape />
      <TopLeft />
    </Stage>
  );
}
