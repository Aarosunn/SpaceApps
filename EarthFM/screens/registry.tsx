import type { Slug } from "./index";
import Main from "./Main";
import MenuOpen from "./MenuOpen";
import MixtapeShared from "./MixtapeShared";
import ControlsHidden from "./ControlsHidden";
import PlaylistHidden from "./PlaylistHidden";
import Flight1 from "./Flight1";
import Flight2 from "./Flight2";
import Flight3 from "./Flight3";
import SonificationOverTime from "./SonificationOverTime";

/* One screen component per Figma frame. Builders only edit their own screens/<Name>.tsx. */
export const REGISTRY: Record<Slug, () => React.ReactElement> = {
  "main": Main,
  "menu-open": MenuOpen,
  "mixtape-shared": MixtapeShared,
  "controls-hidden": ControlsHidden,
  "playlist-hidden": PlaylistHidden,
  "flight-1": Flight1,
  "flight-2": Flight2,
  "flight-3": Flight3,
  "sonification-over-time": SonificationOverTime,
};
