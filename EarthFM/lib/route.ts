/* Dotted route legs between mixtape stops: a quadratic arc bowing "up" (like the Figma legs). */

export type Pt = { x: number; y: number };

export function legControl(a: Pt, b: Pt): Pt {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular, flipped so the arc bows towards the top of the screen.
  let nx = -dy / len, ny = dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const bow = Math.min(120, len * 0.22);
  return { x: mx + nx * bow, y: my + ny * bow };
}

export function legPath(a: Pt, b: Pt) {
  const c = legControl(a, b);
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/* Position and heading (degrees, screen space, 0 = east) at t in [0,1] along the leg. */
export function pointOnLeg(a: Pt, b: Pt, t: number) {
  const c = legControl(a, b);
  const u = 1 - t;
  const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
  const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
  const tx = 2 * u * (c.x - a.x) + 2 * t * (b.x - c.x);
  const ty = 2 * u * (c.y - a.y) + 2 * t * (b.y - c.y);
  return { x, y, heading: (Math.atan2(ty, tx) * 180) / Math.PI };
}

export function selfCheck() {
  const a = { x: 0, y: 100 }, b = { x: 200, y: 100 };
  const start = pointOnLeg(a, b, 0), end = pointOnLeg(a, b, 1), mid = pointOnLeg(a, b, 0.5);
  console.assert(start.x === 0 && end.x === 200, "endpoints");
  console.assert(mid.y < 100, "arc bows upward");
  console.assert(Math.abs(mid.heading) < 1e-9, "heading flat at apex");
}
