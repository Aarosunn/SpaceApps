import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, MainRoute } from "@/components/MapLayer";
import { TopLeft } from "@/components/TopLeft";
import { NowListening, SoundPlayer, ShowControls } from "@/components/Player";
import { YearPicker } from "@/components/YearPicker";
import { LiveCaption } from "@/components/LiveCaption";
import { ShowPlaylistTab } from "@/components/playlist-hidden/ShowPlaylistTab";

/* Figma 45:460 "State · Playlist hidden": mixtape panel collapsed to the "Show playlist" tab. */
export default function PlaylistHidden() {
  return (
    <Stage>
      <MapLayer>
        <MainRoute />
      </MapLayer>
      <Scrim />
      <YearPicker />
      <LiveCaption text="Fast crackle, heavy fire. Bass rising." />
      <NowListening />
      <SoundPlayer />
      <TopLeft />
      <ShowControls />
      <ShowPlaylistTab />
    </Stage>
  );
}
