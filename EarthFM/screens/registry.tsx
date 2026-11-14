import type { Slug } from "./index";
import Main from "./Main";

/* Screens not built yet fall back to Main so every route renders. Builders replace entries as they go. */
export const REGISTRY: Record<Slug, () => React.ReactElement> = {
  main: Main,
  "menu-open": Main,
  "mixtape-shared": Main,
  "controls-hidden": Main,
  "playlist-hidden": Main,
  "flight-1": Main,
  "flight-2": Main,
  "flight-3": Main,
  "sonification-over-time": Main,
};
