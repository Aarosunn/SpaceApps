"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stage } from "@/components/Stage";
import { Icon } from "@/components/Icon";
import { asset } from "@/components/asset";
import { WordCaption } from "@/components/app/WordCaption";
import { ROUNDS, type Round } from "@/lib/game/rounds";
import { audio, contourFor, earcon, playContour, stopAll, type Contour } from "@/lib/game/audio";
import { ContourView } from "./ContourView";
import s from "./Game.module.css";

const W = 1440, H = 900;
const GAP_MS = 550; // pause between sounds in a sequence

type Phase = "start" | "card" | "listen" | "choose" | "reveal" | "end";
type Step = { key: "demo0" | "demo1" | "ref" | "mystery"; label: string; sub?: string; contour: Contour; hidden?: boolean };

function stepsFor(r: Round, withLearn: boolean): Step[] {
  const mystery = r.options[r.answer];
  const steps: Step[] = [];
  if (withLearn) r.learn.demo.forEach((d, i) => steps.push({ key: i === 0 ? "demo0" : "demo1", label: "How it sounds", sub: d.label, contour: contourFor(r, d.value) }));
  steps.push({ key: "ref", label: `Reference · ${r.reference.label}`, sub: r.reference.display, contour: contourFor(r, r.reference.value) });
  steps.push({ key: "mystery", label: "Mystery", sub: "?", contour: contourFor(r, mystery.value), hidden: true });
  return steps;
}

function useFitScale() {
  const [k, setK] = useState(1);
  useEffect(() => {
    const fit = () => setK(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return k;
}

type Result = { round: string; choice: string; correct: boolean; ms: number; replays: number };

export function GameApp() {
  const scale = useFitScale();
  const [phase, setPhase] = useState<Phase>("start");
  const [ri, setRi] = useState(0);
  const [stepIdx, setStepIdx] = useState(-1);
  const [playKey, setPlayKey] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [frame, setFrame] = useState(0);
  const [caption, setCaption] = useState("Put your headphones on. Each round: listen, then guess.");
  const shownAt = useRef(0);
  const replays = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const round = ROUNDS[ri];
  const steps = stepsFor(round, true);
  const current = stepIdx >= 0 ? steps[stepIdx] : null;
  const tester = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tester") : null;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => { clearTimers(); stopAll(); }, []);

  /* Play a list of steps back to back; each one draws its contour while it sounds. */
  const playSequence = useCallback((idxs: number[], after?: () => void) => {
    clearTimers();
    stopAll();
    let t = 0;
    idxs.forEach((i) => {
      const st = steps[i];
      timers.current.push(
        setTimeout(() => {
          setStepIdx(i);
          setPlayKey((k) => k + 1);
          setCaption(st.hidden ? "Now the mystery sound. Listen closely." : `${st.label}: ${st.sub}.`);
          playContour(st.contour, round.timbre);
        }, t),
      );
      t += st.contour.dur * 1000 + GAP_MS;
    });
    timers.current.push(setTimeout(() => { setStepIdx(-1); after?.(); }, t));
  }, [steps, round.timbre]);

  const startRound = () => {
    audio(); // unlock audio on this tap
    setPhase("listen");
    setCaption(round.learn.text);
    playSequence(steps.map((_, i) => i), () => {
      setPhase("choose");
      setCaption(`${round.question} Press 1 to 4, or Space to hear the mystery again.`);
      shownAt.current = performance.now();
    });
  };

  const replay = (key: Step["key"]) => {
    replays.current += 1;
    const i = steps.findIndex((st) => st.key === key);
    playSequence(key === "demo0" ? [0, 1] : [i]);
  };

  const choose = useCallback((i: number) => {
    if (phase !== "choose") return;
    clearTimers();
    stopAll();
    const correct = i === round.answer;
    earcon(correct ? "correct" : "wrong");
    setChoice(i);
    setResults((r) => [...r, { round: round.id, choice: round.options[i].label, correct, ms: Math.round(performance.now() - shownAt.current), replays: replays.current }]);
    replays.current = 0;
    setFrame(0);
    setPhase("reveal");
    setCaption(`${correct ? "Correct!" : `Not quite. It was ${round.options[round.answer].label}.`} ${round.takeaway}`);
  }, [phase, round]);

  const nextRound = () => {
    stopAll();
    setChoice(null);
    if (ri + 1 < ROUNDS.length) {
      setRi(ri + 1);
      setPhase("card");
      setCaption(ROUNDS[ri + 1].topic);
    } else {
      setPhase("end");
      setCaption("That's the set. See how your ear did.");
    }
  };

  const restart = () => {
    setRi(0);
    setResults([]);
    setChoice(null);
    setPhase("card");
    setCaption(ROUNDS[0].topic);
  };

  // Reveal: step through the NASA frames (sea level, Arctic) once, ending on the latest.
  useEffect(() => {
    if (phase !== "reveal" || !round.reveal.frames.length) return;
    const id = setInterval(() => setFrame((f) => (f + 1 < round.reveal.frames.length ? f + 1 : f)), 900);
    return () => clearInterval(id);
  }, [phase, round]);

  // Save results for listening tests (?tester=ID).
  useEffect(() => {
    if (phase !== "end" || !tester) return;
    try {
      const log = JSON.parse(localStorage.getItem("earthfm-game-log") || "[]");
      log.push({ tester, time: new Date().toISOString(), results });
      localStorage.setItem("earthfm-game-log", JSON.stringify(log));
    } catch {}
  }, [phase, tester, results]);

  const downloadLog = () => {
    let log: { tester: string; time: string; results: Result[] }[] = [];
    try { log = JSON.parse(localStorage.getItem("earthfm-game-log") || "[]"); } catch {}
    const rows = ["tester,time,round,choice,correct,ms,replays", ...log.flatMap((l) => l.results.map((r) => [l.tester, l.time, r.round, r.choice, r.correct, r.ms, r.replays].join(",")))];
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" })), download: "earthfm-listening-test.csv" });
    a.click();
  };

  const startOrCard = () => {
    if (phase !== "start") return startRound();
    audio(); // unlock audio on this tap
    setPhase("card");
    setCaption(round.topic);
  };

  // Keyboard: 1-4 answer, Space replays the mystery, Enter continues.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (phase === "choose" && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
      else if (phase === "choose" && e.key === " ") { e.preventDefault(); replay("mystery"); }
      else if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
        if (phase === "start" || phase === "card") startOrCard();
        else if (phase === "reveal") nextRound();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const score = results.filter((r) => r.correct).length;
  const share = `EarthFM · ${ROUNDS.map((r, i) => `${r.title} ${results[i]?.correct ? "✅" : "❌"}`).join(" · ")} · ${score}/${ROUNDS.length}`;
  const maxAbs = Math.max(...round.options.map((o) => Math.abs(o.value)), Math.abs(round.reference.value), 1);

  return (
    <div className={s.viewport}>
      <div className={s.scaler} style={{ width: W * scale, height: H * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: W, height: H }}>
          <Stage>
            <div className={s.dim} />

            <header className={s.top}>
              <Link href="/" className={s.back} aria-label="Back to Globe mode">
                <img alt="" width={18} height={18} src={asset("/figma/playlist-hidden/icon-chevron-left.svg")} />
                Globe
              </Link>
              <p className={s.brand}>EarthFM · Play</p>
            </header>
            <ol className={s.progress} aria-label="Rounds">
              {ROUNDS.map((r, i) => (
                <li key={r.id} className={`${s.dot} ${i === ri && phase !== "end" ? s.dotNow : ""} ${results[i] ? (results[i].correct ? s.dotWin : s.dotMiss) : ""}`}>
                  <span>{i + 1}</span> {r.title}
                </li>
              ))}
            </ol>
            <p className={s.score} aria-live="polite">Score {score}/{ROUNDS.length}</p>

            <section className={s.card} aria-live="polite">
              {phase === "start" && (
                <div className={s.center}>
                  <p className={s.kicker}>Hear NASA Earth data</p>
                  <h1 className={s.h1}>Can you read the planet by ear?</h1>
                  <p className={s.lead}>Three rounds. Each one plays a reference sound and a mystery sound made from NASA Earth Information Center data. Match the mystery to its value.</p>
                  <p className={s.hint}>🎧 Headphones on · keys 1–4 to answer · Space to replay</p>
                  <button className={s.primary} onClick={startOrCard}>Start</button>
                </div>
              )}

              {phase === "card" && (
                <div className={s.center}>
                  <p className={s.kicker}>Round {ri + 1} of {ROUNDS.length}</p>
                  <h1 className={s.h1}>{round.title}</h1>
                  <p className={s.lead}>{round.topic}</p>
                  <p className={s.hint}>{round.learn.text}</p>
                  <button className={s.primary} onClick={startRound}>
                    <Icon name="icon-play" size={20} /> Listen
                  </button>
                </div>
              )}

              {(phase === "listen" || phase === "choose") && (
                <div>
                  <p className={s.kicker}>Round {ri + 1} · {round.title}</p>
                  <h2 className={s.h2}>{round.question}</h2>
                  <p className={s.unit}>Values: {round.unit}</p>
                  <ol className={s.steps}>
                    {(["How it sounds", "Reference", "Mystery"] as const).map((t, i) => {
                      const on = current && (i === 0 ? current.key.startsWith("demo") : i === 1 ? current.key === "ref" : current.key === "mystery");
                      return <li key={t} className={on ? s.stepOn : ""}>{i + 1}. {t}</li>;
                    })}
                  </ol>
                  <div className={s.contours}>
                    <ContourView
                      contour={current && !current.hidden ? current.contour : steps.find((x) => x.key === "ref")!.contour}
                      label={current && !current.hidden ? current.label : `Reference · ${round.reference.label}`}
                      sub={current && !current.hidden ? current.sub : round.reference.display}
                      playKey={playKey}
                      active={!!current && !current.hidden}
                    />
                    <ContourView contour={steps[steps.length - 1].contour} label="Mystery" sub="?" hidden playKey={playKey} active={!!current?.hidden} />
                  </div>
                  <div className={s.replays}>
                    <button className={s.ghost} onClick={() => replay("demo0")} disabled={phase === "listen"}>How it sounds</button>
                    <button className={s.ghost} onClick={() => replay("ref")} disabled={phase === "listen"}>Replay reference</button>
                    <button className={s.ghostDark} onClick={() => replay("mystery")} disabled={phase === "listen"}>Replay mystery (Space)</button>
                  </div>
                  <div className={s.options} role="group" aria-label="Answers">
                    {round.options.map((o, i) => (
                      <button key={o.label} className={s.option} onClick={() => choose(i)} disabled={phase !== "choose"}>
                        <kbd className={s.key}>{i + 1}</kbd>
                        <span className={s.oLabel}>{o.label}</span>
                        <span className={s.oValue}>{o.display}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase === "reveal" && choice !== null && (
                <div>
                  <p className={`${s.verdict} ${choice === round.answer ? s.win : s.miss}`}>
                    {choice === round.answer ? "Correct!" : `Not quite: it was ${round.options[round.answer].label}`}
                  </p>
                  <h2 className={s.h2}>{round.title}</h2>
                  <div className={s.revealGrid}>
                    <div className={s.media}>
                      {round.options[0].img ? (
                        <div className={s.tiles}>
                          {round.options.map((o, i) => (
                            <figure key={o.label} className={`${s.tile} ${i === round.answer ? s.tileAnswer : ""}`}>
                              <img alt={`${o.label} at night, 2012`} src={asset(o.img![0])} className={round.reveal.brighten ? s.bright : ""} />
                              <img alt={`${o.label} at night, 2023`} src={asset(o.img![1])} className={`${s.fadeIn} ${round.reveal.brighten ? s.bright : ""}`} />
                              <figcaption>{o.label} <b>{o.display}</b></figcaption>
                            </figure>
                          ))}
                        </div>
                      ) : (
                        <figure className={s.frame}>
                          <img alt={round.reveal.frames[frame].label} src={asset(round.reveal.frames[frame].src)} />
                          <figcaption>{round.reveal.frames[frame].label}</figcaption>
                        </figure>
                      )}
                    </div>
                    <div className={s.bars}>
                      <p className={s.unit}>{round.unit}</p>
                      {[{ label: round.reference.label, value: round.reference.value, display: round.reference.display, ref: true }, ...round.options].map((o, i) => {
                        const isAns = i - 1 === round.answer, isPick = i - 1 === choice;
                        return (
                          <button key={o.label} className={`${s.bar} ${isAns ? s.barAns : ""} ${isPick && !isAns ? s.barPick : ""}`} onClick={() => playContour(contourFor(round, o.value), round.timbre)} aria-label={`Hear ${o.label}, ${o.display}`}>
                            <span className={s.bLabel}>{o.label}{"ref" in o ? " (ref)" : ""}</span>
                            <span className={s.bTrack}><span className={s.bFill} style={{ width: `${(Math.abs(o.value) / maxAbs) * 100}%`, opacity: o.value < 0 ? 0.5 : 1 }} /></span>
                            <span className={s.bValue}>{o.display}</span>
                          </button>
                        );
                      })}
                      <p className={s.tapHint}>Tap a row to hear it.</p>
                    </div>
                  </div>
                  <p className={s.takeaway}>{round.takeaway}</p>
                  <p className={s.source}>Data: <a href={round.source.url} target="_blank" rel="noreferrer">{round.source.name}</a></p>
                  <button className={s.primary} onClick={nextRound}>{ri + 1 < ROUNDS.length ? "Next round" : "See results"}</button>
                </div>
              )}

              {phase === "end" && (
                <div className={s.center}>
                  <p className={s.kicker}>Your ear</p>
                  <h1 className={s.h1}>{score}/{ROUNDS.length} {score === ROUNDS.length ? "· Earth Listener" : score >= 2 ? "· Sharp Ear" : "· Tuning In"}</h1>
                  <ul className={s.summary}>
                    {ROUNDS.map((r, i) => (
                      <li key={r.id}>{results[i]?.correct ? "✅" : "❌"} <b>{r.title}</b> · {r.options[r.answer].label} ({r.options[r.answer].display})</li>
                    ))}
                  </ul>
                  <p className={s.share}>{share}</p>
                  <div className={s.row}>
                    <button className={s.ghost} onClick={() => navigator.clipboard?.writeText(share)}>Copy result</button>
                    <button className={s.ghost} onClick={restart}>Play again</button>
                    {tester && <button className={s.ghost} onClick={downloadLog}>Download test results</button>}
                    <Link href="/" className={s.primary}>Explore the globe</Link>
                  </div>
                </div>
              )}
            </section>

            <WordCaption text={caption} />
          </Stage>
        </div>
      </div>
    </div>
  );
}
