"use client";

import { useEffect, useState } from "react";
import { btn, Card, Stat } from "./BoboFlow";
import { HowToArena, HowToInspect } from "./HowToPlay";
import type { ArenaResult } from "@/game/ArenaScene";
import { bus } from "@/game/bus";
import { layoutObjects } from "@/game/layout";
import { track } from "@/lib/telemetry";
import type { WorldSpec } from "@/lib/worldSpec";

export type WorldPhase = "intro" | "howArena" | "arena" | "arenaDone" | "inspect" | "summary";

export function labClues(spec: WorldSpec) {
  return layoutObjects(spec.inspect.clues);
}

// React side of a generated world: intro slides, arena result, inspect cards, summary.
export default function WorldFlow({
  worldId,
  spec,
  phase,
  setPhase,
  onExit,
}: {
  worldId: string;
  spec: WorldSpec;
  phase: WorldPhase;
  setPhase: (p: WorldPhase) => void;
  onExit: (accuracy: number) => void;
}) {
  const [slide, setSlide] = useState(0);
  const [arena, setArena] = useState<ArenaResult | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [hearts, setHearts] = useState(3);
  const clues = labClues(spec);

  useEffect(() => {
    const offArena = bus.on("arena:done", (r) => {
      const res = r as ArenaResult;
      setArena(res);
      track(worldId, "arena_done", { correct: res.correct, mistakes: res.mistakes, answers: res.answers });
      setPhase("arenaDone");
    });
    const offInspect = bus.on("lab:inspect", (id) => setInspecting(id as string));
    const offDone = bus.on("lab:done", (p) => {
      setHearts((p as { hearts: number }).hearts);
      setPhase("summary");
    });
    return () => {
      offArena();
      offInspect();
      offDone();
    };
  }, [setPhase, worldId]);

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
        <p className="leading-relaxed">{s.text}</p>
        <div className="flex gap-2">
          {slide > 0 && (
            <button className={`${btn} bg-[#d9c9a3] text-[#2b2118] hover:bg-[#cdbb92]`} onClick={() => setSlide(slide - 1)}>
              Back
            </button>
          )}
          <button className={btn} onClick={() => (last ? setPhase("howArena") : setSlide(slide + 1))}>
            {last ? "How to play →" : "Next"}
          </button>
        </div>
      </Card>
    );
  }

  if (phase === "howArena") {
    return (
      <Card>
        <HowToArena spec={spec} />
        <button className={btn} onClick={() => setPhase("arena")}>
          Start sorting
        </button>
      </Card>
    );
  }

  if (phase === "arenaDone" && arena) {
    const missed = [...new Set(arena.answers.filter((a) => !a.correct).map((a) => a.label))];
    return (
      <Card>
        <h2 className="text-xl font-bold">All sorted!</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
          <Stat label="Sorted" value={String(arena.correct)} />
          <Stat label="Mistakes" value={String(arena.mistakes)} />
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
        <div className="mt-4 border-t border-[#e8d9b5] pt-4">
          <HowToInspect spec={spec} />
        </div>
        <button className={btn} onClick={() => setPhase("inspect")}>
          Enter {spec.inspect.room} →
        </button>
      </Card>
    );
  }

  if (phase === "inspect" && inspecting) {
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
    const correct = Object.values(answers).filter(Boolean).length;
    const arenaAcc = arena ? arena.correct / Math.max(1, arena.correct + arena.mistakes) : 1;
    const accuracy = (correct / Math.max(1, clues.length) + arenaAcc) / 2;
    return (
      <Card>
        <h2 className="text-xl font-bold">World complete! 🌴</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label="Sorting" value={`${Math.round(arenaAcc * 100)}%`} />
          <Stat label="Inspect" value={`${correct}/${clues.length}`} />
          <Stat label="Hearts" value={"❤️".repeat(hearts) || "0"} />
        </div>
        <p className="mt-3 text-sm opacity-80">Your oasis has been watered — this island&apos;s recall is restored.</p>
        <button
          className={btn}
          onClick={() => {
            track(worldId, "world_complete", { accuracy, hearts });
            onExit(accuracy);
          }}
        >
          Back to the islands
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
