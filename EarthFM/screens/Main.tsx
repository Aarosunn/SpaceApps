import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, MainRoute, PinCursor, HoverCard } from "@/components/MapLayer";
import { TopLeft } from "@/components/TopLeft";
import { Mixtape, ShowPlaylistTab } from "@/components/Mixtape";
import { NowListening, SoundPlayer, ShowControls } from "@/components/Player";
import { YearPicker } from "@/components/YearPicker";
import { LiveCaption } from "@/components/LiveCaption";

/* Figma 28:107 "EJ · Desktop v3 · Playlist route". */
export default function Main() {
  return (
    <Stage>
      <MapLayer>
        <MainRoute />
        <PinCursor left={70.34} top={423.25} />
        <HoverCard left={107} top={459} title="Pacific · Sea heat · 2019" hint="Click to play · + to add to mixtape" />
      </MapLayer>
      <Scrim />
      <YearPicker />
      <LiveCaption text="Fast crackle, heavy fire. Bass rising." />
      <NowListening />
      <SoundPlayer />
      <Mixtape />
      <TopLeft />
      <ShowControls />
      <ShowPlaylistTab />
    </Stage>
  );
}
