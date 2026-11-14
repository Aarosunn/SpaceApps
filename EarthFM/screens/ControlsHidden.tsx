import { Stage } from "@/components/Stage";
import { MapLayer, MainRoute } from "@/components/MapLayer";
import { TopLeft } from "@/components/TopLeft";
import { Mixtape } from "@/components/Mixtape";
import { Caption, HalfScrim } from "@/components/controls-hidden/Caption";
import { ShowControlsPill } from "@/components/controls-hidden/ShowControlsPill";

/* Figma 41:89 "State · Controls hidden": sound player collapsed to the "Show controls" pill. */
export default function ControlsHidden() {
  return (
    <Stage>
      <MapLayer>
        <MainRoute />
      </MapLayer>
      <HalfScrim />
      <Caption text="Fast crackle, heavy fire. Bass rising." />
      <Mixtape />
      <TopLeft />
      <ShowControlsPill />
    </Stage>
  );
}
