import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, MainRoute } from "@/components/MapLayer";
import { TopLeft } from "@/components/TopLeft";
import { Mixtape, ShowPlaylistTab } from "@/components/Mixtape";
import { SoundPlayer, ShowControls } from "@/components/Player";
import { YearPicker } from "@/components/YearPicker";
import { LiveCaption } from "@/components/LiveCaption";
import { SharePopover } from "@/components/mixtape-shared/SharePopover";
import { NowListeningBar } from "@/components/mixtape-shared/NowListeningBar";

/* Figma 38:396 "State · Mixtape shared". */
export default function MixtapeShared() {
  return (
    <Stage>
      <MapLayer>
        <MainRoute />
      </MapLayer>
      <Scrim />
      <YearPicker />
      <LiveCaption text="Fast crackle, heavy fire. Bass rising." />
      <NowListeningBar />
      <SoundPlayer />
      <Mixtape />
      <TopLeft />
      <ShowControls />
      <ShowPlaylistTab />
      <SharePopover />
    </Stage>
  );
}
