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
import { speak, stopSpeaking } from "@/lib/speech";
import { getPref } from "@/lib/prefs";
import { FLAGS } from "@/lib/flags";
import { canListen, listenOnce } from "@/lib/voice";
import { MicButton } from "@/components/voice/MicButton";
import { Confetti } from "./Confetti";
import s from "./Game.module.css";

const W = 1440, H = 900;
const GAP_MS = 550; // pause between sounds in a sequence

type Phase = "start" | "card" | "listen" | "choose" | "reveal" | "end";
type Step = { key: "demo0" | "demo1" | "mystery"; label: string; sub?: string; contour: Contour; hidden?: boolean };

/* What the voice says on a round card: the topic, what the sound means, and the order of the sounds (nothing is spoken while they play). */
const cardSpeech = (r: Round) =>
  `${r.topic} ${r.learn.text} You will hear ${r.learn.demo.length === 1 ? "one example" : `${r.learn.demo.length} examples`}, then the mystery sound.`;

function stepsFor(r: Round, withLearn: boolean): Step[] {
  const mystery = r.options[r.answer];
  const steps: Step[] = [];
  if (withLearn) r.learn.demo.forEach((d, i) => steps.push({ key: i === 0 ? "demo0" : "demo1", label: "How it sounds", sub: d.label, contour: contourFor(r, d.value) }));
  steps.push({ key: "mystery", label: "Mystery", sub: "?", contour: contourFor(r, mystery.value), hidden: true });
  return steps;
}

const MIN_SCALE = 0.7; // same floor as the globe: below it the page scrolls, so browser zoom works
function useFitScale() {
  const [k, setK] = useState(1);
  useEffect(() => {
    const fit = () => setK(Math.max(MIN_SCALE, Math.min(window.innerWidth / W, window.innerHeight / H)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return k;
}

type Result = { round: string; choice: string; correct: boolean; ms: number; replays: number; points: number };

/* Points: 100 for a correct answer, +50 if you got it on the first listen, +25 for each correct answer in a row before it. */
export const pointsFor = (correct: boolean, replays: number, streakBefore: number) => (correct ? 100 + (replays === 0 ? 50 : 0) + 25 * streakBefore : 0);

const NUMBER_WORDS: Record<string, number> = { one: 1, won: 1, first: 1, two: 2, to: 2, too: 2, second: 2, three: 3, third: 3, four: 4, for: 4, fourth: 4 };

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
  const [seeIt, setSeeIt] = useState(false); // draw the mystery sound as a line, for players who cannot hear it
  const [streak, setStreak] = useState(0); // correct answers in a row
  const [gained, setGained] = useState(0); // points from the last answer
  const [burst, setBurst] = useState(0); // confetti trigger
  const [shake, setShake] = useState(0); // wrong-answer shake trigger
  const [mixAt, setMixAt] = useState(-1); // "play my mix": which round's answer is sounding
  const [listening, setListening] = useState(false);
  const stopListening = useRef<() => void>(() => {});
  // The voice setting from the globe. It speaks between the sounds, never over them (the sounds are the question).
  const [voiceOn, setVoiceOn] = useState(false);
  const voice = useRef(false);
  useEffect(() => {
    const load = () => {
      voice.current = getPref("earthfm-voice") !== "0";
      setVoiceOn(voice.current);
    };
    load();
    return stopSpeaking;
  }, []);
  const tell = (text: string, say = text) => {
    setCaption(text);
    if (voice.current) speak(say);
  };
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
    stopSpeaking(); // the voice never talks over a sound
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
      tell(
        `${round.question} Press 1 to 4, or Space to hear the mystery again.`,
        `${round.question} ${round.options.map((o, i) => `${i + 1}: ${o.label}, ${o.display}`).join(". ")}. Press 1 to 4, or Space to hear the mystery again.`,
      );
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
    const pts = FLAGS.gameJuice ? pointsFor(correct, replays.current, streak) : 0;
    setResults((r) => [...r, { round: round.id, choice: round.options[i].label, correct, ms: Math.round(performance.now() - shownAt.current), replays: replays.current, points: pts }]);
    setGained(pts);
    setStreak(correct ? streak + 1 : 0);
    if (FLAGS.gameJuice) (correct ? setBurst : setShake)((k) => k + 1);
    replays.current = 0;
    setFrame(0);
    setPhase("reveal");
    tell(`${correct ? "Correct!" : `Not quite. It was ${round.options[round.answer].label}.`} ${round.takeaway}`);
  }, [phase, round, streak]);

  const nextRound = () => {
    stopAll();
    setChoice(null);
    if (ri + 1 < ROUNDS.length) {
      setRi(ri + 1);
      setPhase("card");
      tell(ROUNDS[ri + 1].topic, cardSpeech(ROUNDS[ri + 1]));
    } else {
      setPhase("end");
      tell("That's the set. See how your ear did.");
    }
  };

  const restart = () => {
    setRi(0);
    setStreak(0);
    setMixAt(-1);
    setResults([]);
    setChoice(null);
    setPhase("card");
    tell(ROUNDS[0].topic, cardSpeech(ROUNDS[0]));
  };

  // Reveal: step through the NASA frames (sea level, Arctic) once, ending on the latest.
  useEffect(() => {
    if (phase !== "reveal" || !round.reveal.frames.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const last = () => setFrame(round.reveal.frames.length - 1); // no slideshow: show the latest picture at once
      last();
      return;
    }
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
    tell(round.topic, cardSpeech(round));
  };

  // "Play my mix": the answers of all rounds back to back, each on its own instrument: the player's Earth mixtape.
  const playMix = () => {
    clearTimers();
    stopAll();
    stopSpeaking();
    let t = 0;
    ROUNDS.forEach((r, i) => {
      const k = contourFor(r, r.options[r.answer].value);
      timers.current.push(setTimeout(() => { setMixAt(i); setCaption(`${r.title}: ${r.options[r.answer].label}, ${r.options[r.answer].display}.`); playContour(k, r.timbre); }, t));
      t += k.dur * 1000 + 350;
    });
    timers.current.push(setTimeout(() => setMixAt(-1), t));
  };

  // Voice: say the number or the name of an answer, "again" to replay, "next" to go on (V key or the microphone button).
  const hear = (alts: string[]) => {
    for (const raw of alts) {
      const t = raw.toLowerCase().replace(/[.,!?]/g, "").trim();
      if (phase === "choose") {
        const n = Number(t.match(/\b([1-4])\b/)?.[1]) || t.split(" ").map((w) => NUMBER_WORDS[w]).find(Boolean);
        if (n && n <= round.options.length) return choose(n - 1);
        const byName = round.options.findIndex((o) => t.includes(o.label.toLowerCase()));
        if (byName >= 0) return choose(byName);
        if (/again|replay|repeat|mystery/.test(t)) return replay("mystery");
      }
      if (/next|continue|start|listen|go|play/.test(t)) {
        if (phase === "start" || phase === "card") return startOrCard();
        if (phase === "reveal") return nextRound();
        if (phase === "end") return restart();
      }
    }
    tell(phase === "choose" ? `I heard "${alts[0] ?? ""}". Say a number from 1 to ${round.options.length}, or "again".` : `I heard "${alts[0] ?? ""}". Say "next" to go on.`);
  };
  const toggleListening = () => {
    if (listening) {
      stopListening.current();
      return setListening(false);
    }
    if (!canListen()) return tell("Voice answers need Chrome, Edge or Safari. Use the keys 1 to 4 instead.");
    stopSpeaking();
    setListening(true);
    setCaption('Listening… say a number, "again" or "next".');
    stopListening.current = listenOnce(
      (text) => setCaption(`Heard: "${text}"`),
      (alts, error) => {
        setListening(false);
        if (error === "not-allowed" || error === "service-not-allowed") return tell("The microphone is blocked. Allow it in the address bar, or use the keys 1 to 4.");
        if (!alts.length) return tell("I didn't hear anything. Press V and try again.");
        hearRef.current(alts);
      },
    );
  };
  const hearRef = useRef<(alts: string[]) => void>(() => {});
  useEffect(() => {
    hearRef.current = hear;
  });
  useEffect(() => () => stopListening.current(), []);

  // Keyboard: 1-4 answer, Space replays the mystery, Enter continues.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      // Leave browser shortcuts (Ctrl+1 switches tabs) alone; Space and Enter on a focused button or link belong to it.
      if (e.ctrlKey || e.metaKey || e.altKey || t.tagName === "INPUT") return;
      if (FLAGS.voiceControl && e.key.toLowerCase() === "v") toggleListening();
      else if (phase === "choose" && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
      else if (phase === "choose" && e.key === " " && !t.closest("button, a")) { e.preventDefault(); replay("mystery"); }
      else if (e.key === "Enter" && !t.closest("button, a")) {
        if (phase === "start" || phase === "card") startOrCard();
        else if (phase === "reveal") nextRound();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const score = results.filter((r) => r.correct).length;
  const points = results.reduce((a, r) => a + (r.points ?? 0), 0);
  const share = `EarthFM · ${ROUNDS.map((r, i) => `${r.title} ${results[i]?.correct ? "✅" : "❌"}`).join(" · ")} · ${score}/${ROUNDS.length}${FLAGS.gameJuice ? ` · ${points} pts` : ""}`;
  const maxAbs = Math.max(...round.options.map((o) => Math.abs(o.value)), 1);

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
            <p className={s.score} aria-live="polite">
              Score {score}/{ROUNDS.length}
              {FLAGS.gameJuice && <> · {points} pts{streak > 1 && <span className={s.streak}> · 🔥 {streak} in a row</span>}</>}
            </p>
            {FLAGS.voiceControl && <MicButton listening={listening} onClick={toggleListening} left={262} top={24} />}
            {FLAGS.gameJuice && <Confetti burst={burst} />}

            <section key={`shake-${shake}`} className={`${s.card} ${shake ? s.shake : ""}`} aria-label="Game">
              {phase === "start" && (
                <div className={s.center}>
                  <p className={s.kicker}>Hear NASA Earth data</p>
                  <h1 className={s.h1}>Can you read the planet by ear?</h1>
                  <p className={s.lead}>{ROUNDS.length === 4 ? "Four" : "Three"} rounds. Each one shows you how the data sounds, then plays a mystery sound made from NASA Earth Information Center data. Match the mystery to its value.</p>
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
                  <button className={s.primary} onClick={startRound} autoFocus>
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
                    {(["How it sounds", "Mystery"] as const).map((t, i) => {
                      const on = current && (i === 0 ? current.key.startsWith("demo") : current.key === "mystery");
                      return <li key={t} className={on ? s.stepOn : ""}>{i + 1}. {t}</li>;
                    })}
                  </ol>
                  <div className={s.contours}>
                    <ContourView
                      contour={current && !current.hidden ? current.contour : steps[0].contour}
                      label="How it sounds"
                      sub={current && !current.hidden ? current.sub : steps[0].sub}
                      playKey={playKey}
                      active={!!current && !current.hidden}
                    />
                    <ContourView contour={steps[steps.length - 1].contour} label="Mystery" sub="?" hidden={!seeIt} playKey={playKey} active={!!current?.hidden} />
                  </div>
                  <div className={s.replays}>
                    <button className={s.ghost} onClick={() => replay("demo0")} disabled={phase === "listen"}>How it sounds</button>
                    <button className={s.ghostDark} onClick={() => replay("mystery")} disabled={phase === "listen"}>Replay mystery (Space)</button>
                    <button className={s.ghost} onClick={() => setSeeIt(!seeIt)}>{seeIt ? "Hide" : "Show"} the mystery as a line</button>
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
                  {FLAGS.gameJuice && gained > 0 && <span className={s.points}>+{gained} pts{results[results.length - 1]?.replays === 0 ? " · first listen" : ""}{streak > 1 ? ` · 🔥 ${streak} in a row` : ""}</span>}
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
                      {round.options.map((o, i) => {
                        const isAns = i === round.answer, isPick = i === choice;
                        return (
                          <button key={o.label} className={`${s.bar} ${isAns ? s.barAns : ""} ${isPick && !isAns ? s.barPick : ""}`} onClick={() => { stopSpeaking(); playContour(contourFor(round, o.value), round.timbre); }} aria-label={`Hear ${o.label}, ${o.display}${isAns ? ", the answer" : isPick ? ", your pick" : ""}`}>
                            <span className={s.bLabel}>{o.label}{isAns ? " ✓" : isPick ? " ✗" : ""}</span>
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
                  <button className={s.primary} onClick={nextRound} autoFocus>{ri + 1 < ROUNDS.length ? "Next round" : "See results"}</button>
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
                  {FLAGS.gameJuice && (
                    <>
                      <ol className={s.mixList} aria-label="Your Earth mix">
                        {ROUNDS.map((r, i) => <li key={r.id} className={i === mixAt ? s.mixOn : ""}>{r.title}</li>)}
                      </ol>
                      <button className={s.ghostDark} onClick={playMix}>▶ Play my Earth mix</button>
                    </>
                  )}
                  <p className={s.share}>{share}</p>
                  <div className={s.row}>
                    <button className={s.ghost} onClick={() => navigator.clipboard?.writeText(share)}>Copy result</button>
                    <button className={s.ghost} onClick={restart} autoFocus>Play again</button>
                    {tester && <button className={s.ghost} onClick={downloadLog}>Download test results</button>}
                    <Link href="/" className={s.primary}>Explore the globe</Link>
                  </div>
                </div>
              )}
            </section>

            <WordCaption text={caption} spoken={voiceOn} />
          </Stage>
        </div>
      </div>
    </div>
  );
}
