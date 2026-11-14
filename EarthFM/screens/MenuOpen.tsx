import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, MainRoute } from "@/components/MapLayer";
import { Mixtape } from "@/components/Mixtape";
import { SoundPlayer } from "@/components/Player";
import { YearPicker } from "@/components/YearPicker";
import { LiveCaption } from "@/components/LiveCaption";
import { MenuPanel, TopLeftOpen, NowListeningBar } from "@/components/menu-open/MenuPanel";

/* Figma 38:76 "State · Menu open". */
export default function MenuOpen() {
  return (
    <Stage>
      <MapLayer>
        <MainRoute />
      </MapLayer>
      <Scrim />
      <YearPicker />
      <NowListeningBar />
      <SoundPlayer />
      <Mixtape />
      <MenuPanel />
      <LiveCaption text="Fast crackle, heavy fire. Bass rising." />
      <TopLeftOpen />
    </Stage>
  );
}
