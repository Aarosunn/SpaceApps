import Link from "next/link";
import { SCREENS } from "@/screens";

export default function Home() {
  return (
    <main style={{ padding: 32, color: "#f4f1e8", fontFamily: "var(--sans)" }}>
      <h1>EarthFM screens</h1>
      <ul>
        {SCREENS.map((s) => (
          <li key={s.slug}>
            <Link style={{ color: "#d8f07a" }} href={`/screens/${s.slug}`}>
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
