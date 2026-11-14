import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, RouteLegs, Boat } from "@/components/MapLayer";
import { MapDot } from "@/components/MapDot";
import { TopLeft } from "@/components/TopLeft";
import { Mixtape } from "@/components/Mixtape";
import { SoundPlayer } from "@/components/Player";
import { YearPicker } from "@/components/YearPicker";
import { LiveCaption } from "@/components/LiveCaption";
import { ParkedPlane } from "@/components/flight-1/ParkedPlane";
import { NowBar } from "@/components/flight-1/NowBar";

/* Figma 38:624 "Flight 1 · Song ends": plane parked on stop 1, caption announces next stop. */
export default function Flight1() {
  return (
    <Stage>
      <MapLayer>
        <RouteLegs />
        <ParkedPlane />
        <Boat left={964.76} top={557.96} />
        <MapDot n={1} left={403} top={518} label="Stop 1: Amazon, fires, playing" />
        <MapDot n={2} kind="Queued" left={760} top={430} label="Stop 2: Central Africa, fires, next" />
        <MapDot n={3} kind="Queued" left={990} top={610} label="Stop 3: Indian Ocean, sea heat" />
      </MapLayer>
      <Scrim />
      <YearPicker />
      <LiveCaption text="Amazon finished. Next stop: Central Africa." />
      <NowBar />
      <SoundPlayer />
      <Mixtape />
      <TopLeft />
    </Stage>
  );
}
