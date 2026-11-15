/* Screen (1440x900 artboard) <-> lat/lon for the Figma satellite map, plus coarse region naming.
   ponytail: linear fit from 3 landmarks (Cape of Good Hope 762,635; Cape Horn 370,735; Somali coast 905,395);
   good to a few degrees, enough for naming areas. Swap for the real projection when sonifying real data. */

const LON_PX = 4.57, X0 = 677.5;
const LAT_PX = 4.65, Y0 = 475;

export function xyToLatLon(x: number, y: number) {
  return { lat: (Y0 - y) / LAT_PX, lon: (x - X0) / LON_PX };
}

export type Surface = "water" | "ice" | "land";

type Box = [name: string, latMin: number, latMax: number, lonMin: number, lonMax: number];

// Order matters: first match wins (specific before broad).
const LAND: Box[] = [
  ["Greenland", 59, 90, -73, -11],
  ["Amazon", -15, 5, -75, -45],
  ["Central America", 7, 23, -118, -77],
  ["Alaska", 52, 72, -170, -130],
  ["Canada", 49, 84, -141, -52],
  ["United States", 24, 49, -125, -66],
  ["Mexico", 14, 33, -118, -86],
  ["Andes", -56, 12, -82, -66],
  ["South America", -56, 12, -66, -34],
  ["Sahara", 15, 35, -17, 35],
  ["Central Africa", -10, 10, 8, 32],
  ["East Africa", -12, 15, 32, 52],
  ["Southern Africa", -35, -10, 10, 41],
  ["Madagascar", -26, -12, 43, 51],
  ["West Africa", 4, 15, -18, 8],
  ["Europe", 36, 71, -10, 40],
  ["Middle East", 12, 42, 35, 63],
  ["India", 6, 35, 66, 92],
  ["Siberia", 50, 78, 60, 180],
  ["Central Asia", 35, 55, 46, 90],
  ["China", 20, 50, 90, 125],
  ["Japan", 30, 46, 128, 146],
  ["Southeast Asia", -11, 23, 92, 141],
  ["Australia", -44, -10, 112, 155],
];

function inBox(lat: number, lon: number, [, a, b, c, d]: Box) {
  return lat >= a && lat <= b && lon >= c && lon <= d;
}

function oceanName(lat: number, lon: number) {
  if (lat > 66) return "Arctic Ocean";
  if (lat < -60) return "Southern Ocean";
  if (lon >= 20 && lon <= 120 && lat < 30) return "Indian Ocean";
  if (lon > -70 && lon < 20) return lat >= 0 ? "North Atlantic" : "South Atlantic";
  if (lon >= 120 && lon <= 135 && lat > 0 && lat < 30) return "Philippine Sea";
  return "Pacific";
}

export function regionName(lat: number, lon: number, surface: Surface) {
  if (lat < -63) return "Antarctica";
  if (surface === "water") return oceanName(lat, lon);
  const box = LAND.find((b) => inBox(lat, lon, b));
  if (box) return box[0];
  return surface === "ice" ? (lat > 0 ? "Arctic ice" : "Antarctica") : "Land";
}

/* Which data layer an area plays, matching the Figma copy ("Pacific · Sea heat · 2019"). */
export function layerFor(surface: Surface, region: string, landLayer: string) {
  if (surface === "water") return "Sea heat";
  if (surface === "ice" || region === "Greenland" || region === "Antarctica") return "Sea ice";
  return landLayer;
}

/* Classify the map pixel under the cursor. rgb comes from the map image itself. */
export function surfaceOf([r, g, b]: [number, number, number]): Surface {
  if (r > 200 && g > 200 && b > 200) return "ice";
  if (b > r + 12 && b >= g - 12) return "water";
  return "land";
}

export function latLonToXy(lat: number, lon: number) {
  return { x: X0 + lon * LON_PX, y: Y0 - lat * LAT_PX };
}

const OCEANS: Box[] = [
  ["Pacific", -40, 40, -170, -110],
  ["North Atlantic", 10, 55, -60, -15],
  ["South Atlantic", -45, 0, -35, 10],
  ["Indian Ocean", -35, 10, 55, 100],
  ["Arctic Ocean", 72, 84, -60, 60],
  ["Southern Ocean", -66, -58, -60, 120],
];

/* Search: case-insensitive prefix/substring match on area names; returns the centre of its box. */
export function findArea(q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return null;
  const hit = [...LAND, ...OCEANS].find(([n]) => n.toLowerCase().startsWith(t)) ?? [...LAND, ...OCEANS].find(([n]) => n.toLowerCase().includes(t));
  if (!hit) return null;
  const [name, a, b, c, d] = hit;
  return { name, lat: (a + b) / 2, lon: (c + d) / 2, water: OCEANS.includes(hit) };
}

export function selfCheck() {
  // Landmarks used for the fit must round-trip, and named areas must resolve.
  const cape = xyToLatLon(762, 635);
  console.assert(Math.abs(cape.lat + 34.4) < 1 && Math.abs(cape.lon - 18.5) < 1, "Cape of Good Hope fit", cape);
  console.assert(regionName(-3, -60, "land") === "Amazon", "Amazon");
  console.assert(regionName(0, -150, "water") === "Pacific", "Pacific");
  console.assert(regionName(-10, 75, "water") === "Indian Ocean", "Indian Ocean");
  console.assert(layerFor("water", "Pacific", "Fires") === "Sea heat", "ocean layer");
  console.assert(findArea("ama")?.name === "Amazon" && findArea("indian")?.water === true, "search");
}
