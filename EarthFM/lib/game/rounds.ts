/* The three pitch-day rounds (spec section 11). Values were measured from the NASA SVS frames in
   spaceapps-2026/notes/R3-guessing-recon.md (night lights) and R4-eic-datasets.md (sea level, Arctic heat).
   Round 2-3 labels are read off NASA's charts (+-0.3 units); re-check against published numbers before submitting. */

export type Timbre = "bell" | "water" | "warm" | "fire";

export type Option = { label: string; value: number; display: string; img?: [string, string] };

export type Round = {
  id: string;
  title: string;
  topic: string; // one line shown on the round card
  question: string;
  unit: string;
  timbre: Timbre;
  /* How a value becomes sound: "change" = glide whose size is the % change; "level" = steady tone whose pitch is the value. */
  mapping: { kind: "change" } | { kind: "level"; semisPerUnit: number };
  learn: { text: string; demo: { label: string; value: number }[] }; // show-not-tell example before the question
  reference: { label: string; value: number; display: string };
  options: Option[];
  answer: number; // index into options
  reveal: { frames: { src: string; label: string }[]; brighten?: boolean };
  takeaway: string;
  source: { name: string; url: string };
};

export const ROUNDS: Round[] = [
  {
    id: "lights",
    title: "Lights On",
    topic: "Night lights show where people and power are growing.",
    question: "Which city is the mystery sound?",
    unit: "change in night lights, 2012 → 2023",
    timbre: "bell",
    mapping: { kind: "change" },
    learn: {
      text: "A tone that rises means the city got brighter. Flat means no change.",
      demo: [
        { label: "Dhaka · +116%", value: 116 },
        { label: "No change · 0%", value: 0 },
      ],
    },
    reference: { label: "Johannesburg", value: -2, display: "−2%" },
    options: [
      { label: "Nairobi", value: 170, display: "+170%", img: ["/game/lights-nairobi-2012.jpg", "/game/lights-nairobi-2023.jpg"] },
      { label: "Mumbai", value: 73, display: "+73%", img: ["/game/lights-mumbai-2012.jpg", "/game/lights-mumbai-2023.jpg"] },
      { label: "Shanghai", value: 52, display: "+52%", img: ["/game/lights-shanghai-2012.jpg", "/game/lights-shanghai-2023.jpg"] },
      { label: "Cairo", value: -3, display: "−3%", img: ["/game/lights-cairo-2012.jpg", "/game/lights-cairo-2023.jpg"] },
    ],
    answer: 0,
    reveal: { frames: [], brighten: true },
    takeaway: "Nairobi's night lights grew 170% between 2012 and 2023, the biggest jump of the four. Lights track people and power: new homes, roads and grid connections.",
    source: { name: "NASA SVS 5313 · Change in Night Lights 2012–2023 (EIC)", url: "https://svs.gsfc.nasa.gov/5313/" },
  },
  {
    id: "seas",
    title: "Rising Seas",
    topic: "The ocean is creeping up on every coastline.",
    question: "Which year is the mystery sea level?",
    unit: "cm above 1993 global mean sea level",
    timbre: "water",
    mapping: { kind: "level", semisPerUnit: 1.6 },
    learn: {
      text: "Higher water, higher tone. Listen to the sea step up.",
      demo: [
        { label: "Low · 0 cm", value: 0 },
        { label: "High · +11 cm", value: 11.3 },
      ],
    },
    reference: { label: "1993", value: 0, display: "0 cm" },
    options: [
      { label: "2003", value: 3.0, display: "+3.0 cm" },
      { label: "2013", value: 6.5, display: "+6.5 cm" },
      { label: "2018", value: 9.1, display: "+9.1 cm" },
      { label: "2023", value: 11.3, display: "+11.3 cm" },
    ],
    answer: 1,
    reveal: {
      frames: [
        { src: "/game/sea-1993.jpg", label: "1993 · 0 cm" },
        { src: "/game/sea-2003.jpg", label: "2003 · +3.0 cm" },
        { src: "/game/sea-2013.jpg", label: "2013 · +6.5 cm" },
        { src: "/game/sea-2018.jpg", label: "2018 · +9.1 cm" },
        { src: "/game/sea-2023.jpg", label: "2023 · +11.3 cm" },
      ],
    },
    takeaway: "Global sea level rose about 11 cm from 1993 to 2023, and it is speeding up: about 3 cm in the first decade, nearly 5 cm in the last.",
    source: { name: "NASA SVS 5235 · Sea Level Through a Porthole (EIC Climate Vital Signs)", url: "https://svs.gsfc.nasa.gov/5235/" },
  },
  {
    id: "arctic",
    title: "Arctic Heat",
    topic: "The far north is warming faster than anywhere else.",
    question: "Which year is the mystery Arctic temperature?",
    unit: "°C vs the 1951–80 average, Arctic band (65–80°N)",
    timbre: "warm",
    mapping: { kind: "level", semisPerUnit: 6 },
    learn: {
      text: "Warmer means a higher, brighter tone. Colder sounds low and dull.",
      demo: [
        { label: "Cold · −1 °C", value: -1 },
        { label: "Hot · +2 °C", value: 2 },
      ],
    },
    reference: { label: "1951–80 average", value: 0, display: "0 °C" },
    options: [
      { label: "1880s", value: -1.0, display: "−1.0 °C" },
      { label: "1986", value: 0.2, display: "+0.2 °C" },
      { label: "2001", value: 1.3, display: "+1.3 °C" },
      { label: "2016", value: 2.0, display: "+2.0 °C or more" },
    ],
    answer: 3,
    reveal: {
      frames: [
        { src: "/game/heat-1885.jpg", label: "1880s" },
        { src: "/game/heat-1956.jpg", label: "1956" },
        { src: "/game/heat-1986.jpg", label: "1986" },
        { src: "/game/heat-2001.jpg", label: "2001" },
        { src: "/game/heat-2016.jpg", label: "2016" },
        { src: "/game/heat-2023.jpg", label: "2023" },
      ],
    },
    takeaway: "By 2016 the Arctic band was 2 °C or more above its 1951–80 average, off the top of NASA's colour scale. The planet's top is warming fastest.",
    source: { name: "NASA SVS 5207 · GISTEMP Temperature Anomalies 1880–2023 (EIC Climate Vital Signs)", url: "https://svs.gsfc.nasa.gov/5207/" },
  },
];
