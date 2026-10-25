"use client";

import { useEffect, useRef, useState } from "react";
import { btn, Card, Stat } from "./BoboFlow";
import { HowToArena, HowToBoard, HowToInspect, HowToRunner, HowToShooter, HowToShowdown } from "./HowToPlay";
import SlideScene from "./SlideScene";
import RewardCelebration from "./RewardCelebration";
import type { RewardOutcome } from "@/lib/rewards";
import { bus } from "@/game/bus";
import { layoutObjects } from "@/game/layout";
import { track } from "@/lib/telemetry";
import { gamesOf, type GameId, type WorldSpec } from "@/lib/worldSpec";

// Phases: "intro" → for each game i: "how:i" → "play:i" → "done:i" → "summary". (inspect goes straight to summary)
export type WorldPhase = "intro" | "summary" | `how:${number}` | `play:${number}` | `done:${number}`;

export function labClues(spec: WorldSpec) {
  return layoutObjects(spec.inspect.clues);
}

export function phaseGame(phase: string): number | null {
  const m = phase.match(/^(how|play|done):(\d+)$/);
  return m ? Number(m[2]) : null;
}

/** Which Phaser scene shows a game, and the data it needs. */
export function sceneFor(spec: WorldSpec, game: GameId, autoStart: boolean) {
  switch (game) {
    case "runner":
      return { key: "runner" as const, data: { sequence: spec.sequence, theme: spec.theme, autoStart } };
    case "shooter":
      return { key: "shooter" as const, data: { arena: spec.arena, theme: spec.theme, autoStart } };
    case "arena":
      return { key: "arena" as const, data: { arena: spec.arena, autoStart } };
    case "inspect":
      return { key: "lab" as const, data: { clues: labClues(spec), title: spec.inspect.room } };
    case "board":
      return { key: "board" as const, data: { board: spec.board, theme: spec.theme, autoStart } };
    case "showdown":
      return { key: "showdown" as const, data: { showdown: spec.showdown, theme: spec.theme, autoStart } };
  }
}

const GAME_NAMES: Record<GameId, string> = {
  runner: "Timeline Run",
  shooter: "Hold the Line",
  arena: "Sort Storm",
  inspect: "Inspect Room",
  board: "Squad Board",
  showdown: "Showdown",
};

type Result = { correct: number; mistakes: number; answers: { label: string; correct: boolean }[] };

// React side of a generated world: intro slides, how-to + result cards per game, inspect cards, summary.
export default function WorldFlow({
  worldId,
  spec,
  phase,
  setPhase,
  onExit,
  reward,
}: {
  worldId: string;
  spec: WorldSpec;
  phase: WorldPhase;
  setPhase: (p: WorldPhase) => void;
  onExit: (accuracy: number) => void;
  /** what finishing at this accuracy pays, shown with the score */
  reward: (accuracy: number) => RewardOutcome;
}) {
  const games = gamesOf(spec);
  const [slide, setSlide] = useState(0);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [hearts, setHearts] = useState(3);
  const clues = labClues(spec);
  const gi = phaseGame(phase);
  const phaseRef = useRef(phase); // latest phase for bus handlers registered once
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const finished = (game: GameId) => (r: unknown) => {
      const i = phaseGame(phaseRef.current);
      if (i === null || games[i] !== game) return;
      const res = r as Result;
      setResults((all) => ({ ...all, [i]: res }));
      track(worldId, `${game}_done`, { correct: res.correct, mistakes: res.mistakes, answers: res.answers });
      setPhase(`done:${i}`);
    };
    const offs = [
      bus.on("runner:done", finished("runner")),
      bus.on("shooter:done", finished("shooter")),
      bus.on("arena:done", finished("arena")),
      bus.on("board:done", finished("board")),
      bus.on("showdown:done", finished("showdown")),
      bus.on("lab:inspect", (id) => setInspecting(id as string)),
      bus.on("lab:done", (p) => {
        setHearts((p as { hearts: number }).hearts);
        setPhase("summary");
      }),
    ];
    return () => offs.forEach((off) => off());
    // games is derived from spec
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPhase, worldId, spec]);

  const next = (i: number) => (i + 1 < games.length ? setPhase(`how:${i + 1}`) : setPhase("summary"));

  if (phase === "intro") {
    const s = spec.intro[slide];
    const last = slide === spec.intro.length - 1;
    return (
      <Card>
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#bff4ff] text-lg shadow-inner">✦</div>
          <div>
            <div className="text-xs opacity-60">
              Pip · {slide + 1}/{spec.intro.length}
            </div>
            <div className="inline-block rounded-full bg-[#ffd166] px-2 py-0.5 text-xs font-bold">{s.keyword}</div>
          </div>
        </div>
        <SlideScene key={slide} scene={s.scene} theme={spec.theme} />
        <p className="text-lg leading-relaxed">{s.text}</p>
        {last && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {games.map((g, i) => (
              <span key={g + i} className="rounded-full bg-white px-3 py-1">
                {i + 1}. {GAME_NAMES[g]}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {slide > 0 && (
            <button className={`${btn} bg-[#d9c9a3] text-[#2b2118] hover:bg-[#cdbb92]`} onClick={() => setSlide(slide - 1)}>
              Back
            </button>
          )}
          <button className={btn} onClick={() => (last ? setPhase("how:0") : setSlide(slide + 1))}>
            {last ? "Let's play →" : "Next"}
          </button>
        </div>
      </Card>
    );
  }

  if (gi !== null && phase.startsWith("how:")) {
    const g = games[gi];
    return (
      <Card>
        <div className="mb-1 text-xs opacity-60">
          Game {gi + 1} of {games.length}
        </div>
        {g === "runner" && <HowToRunner spec={spec} />}
        {g === "shooter" && <HowToShooter spec={spec} />}
        {g === "arena" && <HowToArena spec={spec} />}
        {g === "inspect" && <HowToInspect spec={spec} />}
        {g === "board" && <HowToBoard spec={spec} />}
        {g === "showdown" && <HowToShowdown spec={spec} />}
        <button className={btn} onClick={() => setPhase(`play:${gi}`)}>
          Start {GAME_NAMES[g]}
        </button>
      </Card>
    );
  }

  if (gi !== null && phase.startsWith("done:")) {
    const r = results[gi];
    const missed = [...new Set((r?.answers ?? []).filter((a) => !a.correct).map((a) => a.label))];
    return (
      <Card>
        <h2 className="text-xl font-bold">{GAME_NAMES[games[gi]]} — done!</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
          <Stat label="Correct" value={String(r?.correct ?? 0)} />
          <Stat label="Mistakes" value={String(r?.mistakes ?? 0)} />
        </div>
        {missed.length > 0 && (
          <div className="mt-3 text-sm">
            <div className="font-semibold">Worth another look:</div>
            <ul className="list-disc pl-5">
              {missed.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <button className={btn} onClick={() => next(gi)}>
          {gi + 1 < games.length ? `Next: ${GAME_NAMES[games[gi + 1]]} →` : "Finish"}
        </button>
      </Card>
    );
  }

  if (gi !== null && phase.startsWith("play:") && games[gi] === "inspect" && inspecting) {
    const clue = clues.find((c) => c.id === inspecting)!;
    return (
      <InspectCard
        key={clue.id}
        clue={clue}
        choiceA={spec.inspect.choiceA}
        choiceB={spec.inspect.choiceB}
        onDone={(correct, ms) => {
          track(worldId, "inspect_answer", { label: clue.label, correct, ms });
          setAnswers((a) => ({ ...a, [clue.id]: correct }));
          setInspecting(null);
          bus.emit("lab:resolved", { id: clue.id, correct });
        }}
      />
    );
  }

  if (phase === "summary") {
    const scores = Object.values(results).map((r) => r.correct / Math.max(1, r.correct + r.mistakes));
    if (games.includes("inspect")) scores.push(Object.values(answers).filter(Boolean).length / Math.max(1, clues.length));
    const accuracy = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
    return (
      <Card>
        <h2 className="text-xl font-bold">World complete! 🌴</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-3">
          {games.map((g, i) => {
            const r = results[i];
            const value =
              g === "inspect"
                ? `${Object.values(answers).filter(Boolean).length}/${clues.length}`
                : r
                  ? `${Math.round((r.correct / Math.max(1, r.correct + r.mistakes)) * 100)}%`
                  : "—";
            return <Stat key={g + i} label={GAME_NAMES[g]} value={value} />;
          })}
          {games.includes("inspect") && <Stat label="Hearts" value={"❤️".repeat(hearts) || "0"} />}
        </div>
        <RewardCelebration accuracy={accuracy} outcome={reward(accuracy)} />
        <p className="mt-3 text-sm opacity-80">Your oasis has been watered — this Kata&apos;s lifespan is restored.</p>
        <button
          className={btn}
          onClick={() => {
            track(worldId, "world_complete", { accuracy, hearts });
            onExit(accuracy);
          }}
        >
          Back to the Katas
        </button>
      </Card>
    );
  }

  return null;
}

function InspectCard({
  clue,
  choiceA,
  choiceB,
  onDone,
}: {
  clue: WorldSpec["inspect"]["clues"][number];
  choiceA: string;
  choiceB: string;
  onDone: (correct: boolean, ms: number) => void;
}) {
  const [shownAt] = useState(() => Date.now());
  const [picked, setPicked] = useState<"A" | "B" | null>(null);
  const correct = picked === clue.answer;
  return (
    <Card>
      <div className="text-4xl">{clue.icon}</div>
      <div className="mt-1 text-xs font-bold uppercase opacity-60">{clue.label}</div>
      <p className="mt-2 text-lg leading-snug">{clue.claim}</p>
      {!picked ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-xl bg-emerald-600 py-3 font-bold text-white" onClick={() => setPicked("A")}>
            {choiceA}
          </button>
          <button className="rounded-xl bg-rose-600 py-3 font-bold text-white" onClick={() => setPicked("B")}>
            {choiceB}
          </button>
        </div>
      ) : (
        <>
          <div className={`mt-4 rounded-lg p-3 text-sm ${correct ? "bg-emerald-100" : "bg-rose-100"}`}>
            <b>{correct ? "Correct!" : `Not quite — it's ${clue.answer === "A" ? choiceA : choiceB}.`}</b>
            <p className="mt-1">{clue.why}</p>
          </div>
          <button className={btn} onClick={() => onDone(correct, Date.now() - shownAt)}>
            Continue
          </button>
        </>
      )}
    </Card>
  );
}
