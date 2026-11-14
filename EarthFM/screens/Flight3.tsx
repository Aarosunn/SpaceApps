import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, Boat } from "@/components/MapLayer";
import { MapDot } from "@/components/MapDot";
import { TopLeft } from "@/components/TopLeft";
import { SoundPlayer } from "@/components/Player";
import { YearPicker } from "@/components/YearPicker";
import { ArrivedPlane, ArrivedMixtape, ArrivedRoute, ArrivedNowListening, ArrivedCaption } from "@/components/flight-3/Flight3Parts";

/* Figma 38:1050 "Flight 3 · Arrived". */
export default function Flight3() {
  return (
    <Stage>
      <MapLayer>
        <ArrivedRoute />
        <ArrivedPlane />
        <Boat left={964.76} top={557.96} />
        <MapDot n={1} kind="Queued" left={403} top={518} label="Stop 1: Amazon, fires, played" />
        <MapDot n={2} left={760} top={430} label="Stop 2: Central Africa, fires, playing" />
        <MapDot n={3} kind="Queued" left={990} top={610} label="Stop 3: Indian Ocean, sea heat" />
      </MapLayer>
      <Scrim />
      <YearPicker />
      <ArrivedCaption />
      <ArrivedNowListening />
      <SoundPlayer />
      <ArrivedMixtape />
      <TopLeft />
    </Stage>
  );
}
