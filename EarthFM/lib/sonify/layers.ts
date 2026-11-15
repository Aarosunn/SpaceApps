/* The data layers the globe can play. Each one is a global timeline (10-degree grid, one frame per date) plus one
   small picture per date, built offline from NASA SVS frames by the scripts in
   spaceapps-2026/sonification/recipes-python (fetch_*.py downloads and caches, build_*.py makes these files).
   In every timeline 0..1 maps onto valueRange, and 0 means "no data here" (real values start at 0.03). */

export type LayerId = "sst" | "fires" | "heat";
export type SonMode = "area" | "time";

export type Layer = {
  id: LayerId;
  label: string; // short name, used in captions and the mixtape
  menu: string; // name in the settings menu
  file: string; // timeline JSON under public/
  images: string; // folder of 0.jpg, 1.jpg, ... (one per date)
  unit: string;
  decimals: number;
  numbers: boolean; // false = describe this layer in words only (no figures in the caption, picture or pop-up)
  noData: string; // what a silent square is called in the readout
  higher: string; // what a higher note means, to finish "Higher notes are ..."
  words: [low: string, mid: string, high: string]; // short caption words for low, middle and high values
  picture: string; // pop-up step 1
  reading: string; // pop-up step 2
  silence: string; // pop-up: what a rest means
  limits: string;
  credit: string;
};

export const LAYERS: Record<LayerId, Layer> = {
  sst: {
    id: "sst", label: "Sea heat", menu: "Sea heat", file: "/sonify/sst-global.json", images: "/sonify/sst",
    unit: " °C", decimals: 1, numbers: true, noData: "Land", higher: "warmer water", words: ["cold water", "mild water", "warm water"],
    picture: "A sea-surface-temperature map from NASA's Scientific Visualization Studio (SVS 3912).",
    reading: "Each pixel's colour is matched to NASA's colour bar (blue 0 °C to red 32 °C) to read a temperature.",
    silence: "A square with no ocean plays nothing, so you can hear the coastline as gaps.",
    limits: "This is a NASA ocean model for 2007–2008, not today's sea. Only the ocean has data.",
    credit: "NASA Scientific Visualization Studio, svs.gsfc.nasa.gov/3912",
  },
  fires: {
    id: "fires", label: "Wildfires", menu: "Wildfires", file: "/sonify/fires-global.json", images: "/sonify/fires",
    unit: "", decimals: 1, numbers: false, noData: "No fire", higher: "more fire", words: ["a little fire", "steady fire", "heavy fire"],
    picture: "A map of active fires seen by the VIIRS satellite instruments, from NASA's Scientific Visualization Studio (SVS 5113).",
    reading: "Fires are drawn as bright red-to-yellow dots on a dark map. For each square we measure how much of it is lit up by fire.",
    silence: "A square with no fire plays nothing, so quiet stretches are places and seasons without burning.",
    limits: "This measures how much fire shows in NASA's picture, not the area burned, and each picture covers a five-day window. Small fires and fires under cloud are missed.",
    credit: "NASA Scientific Visualization Studio, svs.gsfc.nasa.gov/5113",
  },
  heat: {
    id: "heat", label: "Global heat", menu: "Global heat", file: "/sonify/heat-global.json", images: "/sonify/heat",
    unit: " °C vs 1951–80", decimals: 2, numbers: true, noData: "No data", higher: "hotter than the 1951–1980 average", words: ["cooler than normal", "near normal", "hotter than normal"],
    picture: "A map of surface temperature change (NASA GISTEMP) from NASA's Scientific Visualization Studio (SVS 5207).",
    reading: "Each pixel's colour is matched to NASA's colour bar (blue −2 °C, white 0, red +2 °C) to read how far that spot is from its 1951–1980 average.",
    silence: "A square with no measurements plays nothing.",
    limits: "Each picture is a 24-month average, and the colour bar stops at ±2 °C, so bigger changes all read as ±2.",
    credit: "NASA Scientific Visualization Studio, svs.gsfc.nasa.gov/5207",
  },
};

export const LAYER_ORDER: LayerId[] = ["sst", "fires", "heat"];
