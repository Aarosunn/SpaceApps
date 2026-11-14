import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, RouteLegs, Plane, Boat } from "@/components/MapLayer";
import { MapDot } from "@/components/MapDot";
import { TopLeft } from "@/components/TopLeft";
import { Mixtape } from "@/components/Mixtape";
import { SoundPlayer } from "@/components/Player";
import { YearPicker } from "@/components/YearPicker";
import { Caption } from "@/components/flight-2/Caption";
import { NowBar } from "@/components/flight-2/NowBar";

/* Figma 38:837 "Flight 2 · In the air". */
export default function Flight2() {
  return (
    <Stage>
      <MapLayer>
        <RouteLegs />
        <Plane left={576.81} top={411.56} rotate={31.15} />
        <Boat left={964.76} top={557.96} />
        <MapDot n={1} left={403} top={518} label="Stop 1: Amazon, fires, playing" />
        <MapDot n={2} kind="Queued" left={760} top={430} label="Stop 2: Central Africa, fires, next" />
        <MapDot n={3} kind="Queued" left={990} top={610} label="Stop 3: Indian Ocean, sea heat" />
      </MapLayer>
      <Scrim />
      <YearPicker />
      <Caption text="Flying to Central Africa. Music crossfading, riser building." />
      <NowBar text="In flight to Central Africa" />
      <SoundPlayer />
      <Mixtape />
      <TopLeft />
    </Stage>
  );
}
