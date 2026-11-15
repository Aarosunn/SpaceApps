import Link from "next/link";
import { SCREENS } from "@/screens";

/* Static Figma reference screens (kept for visual regression checks). */
export default function ScreensIndex() {
  return (
    <main style={{ padding: 32, color: "#f4f1e8", fontFamily: "var(--sans)" }}>
      <h1>EarthFM reference screens</h1>
      <p><Link style={{ color: "#d8f07a" }} href="/">Open the app</Link></p>
      <ul>
        {SCREENS.map((s) => (
          <li key={s.slug}>
            <Link style={{ color: "#d8f07a" }} href={`/screens/${s.slug}`}>{s.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
