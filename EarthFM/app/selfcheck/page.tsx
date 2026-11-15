"use client";

/* Runs every module's selfCheck() in the browser and lists failures. Open /selfcheck after changing a mapping or parser. */
import { useEffect, useState } from "react";
import { selfCheck as geo } from "@/lib/geo";
import { selfCheck as route } from "@/lib/route";
import { selfCheck as speech } from "@/lib/speech";
import { selfCheck as voice } from "@/lib/voice";
import { selfCheck as instruments } from "@/lib/sonify/instruments";
import { selfCheck as gameAudio } from "@/lib/game/audio";

const CHECKS = { geo, route, speech, voice, instruments, gameAudio };

export default function SelfCheck() {
  const [lines, setLines] = useState<string[] | null>(null);
  useEffect(() => {
    const out: string[] = [], orig = console.assert;
    for (const [name, fn] of Object.entries(CHECKS)) {
      let fails = 0;
      console.assert = (ok?: boolean, ...msg: unknown[]) => {
        if (!ok) {
          fails++;
          out.push(`FAIL ${name}: ${msg.map((m) => (typeof m === "string" ? m : JSON.stringify(m))).join(" ")}`);
        }
      };
      try {
        fn();
      } catch (e) {
        fails++;
        out.push(`FAIL ${name}: threw ${(e as Error).message}`);
      }
      if (!fails) out.push(`ok   ${name}`);
    }
    console.assert = orig;
    const done = () => setLines(out);
    done();
  }, []);
  return (
    <main style={{ padding: 32, color: "#f4f1e8", fontFamily: "var(--mono)" }}>
      <h1>EarthFM self-checks</h1>
      <pre id="selfcheck">{lines ? lines.join("\n") : "running…"}</pre>
    </main>
  );
}
