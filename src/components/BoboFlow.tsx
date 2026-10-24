"use client";

import { useEffect, useState } from "react";
import { AFTER_EXPERIMENT, CLUES, FINDINGS, INTRO, RESULTS, type Slide, type Verdict } from "@/content/bobo";
import type { ExperimentResult } from "@/game/ExperimentScene";
import { bus } from "@/game/bus";
import { track } from "@/lib/telemetry";

export type BoboPhase = "intro" | "experiment" | "results" | "review" | "summary";

const WORLD = "demo-bobo";

// React side of the Bobo world: story slides, results chart, review cards, summary.
export default function BoboFlow({
  phase,
  setPhase,
  onExit,
}: {
  phase: BoboPhase;
  setPhase: (p: BoboPhase) => void;
  onExit: (accuracy: number) => void;
}) {
  const [slide, setSlide] = useState(0);
  const [exp, setExp] = useState<ExperimentResult | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [hearts, setHearts] = useState(3);

  useEffect(() => {
    const offExp = bus.on("experiment:done", (r) => {
      const res = r as ExperimentResult;
      setExp(res);
      track(WORLD, "experiment_done", { ...res });
      setPhase("results");
    });
    const offInspect = bus.on("lab:inspect", (id) => setInspecting(id as string));
    const offDone = bus.on("lab:done", (p) => {
      setHearts((p as { hearts: number }).hearts);
      setPhase("summary");
    });
    return () => {
      offExp();
      offInspect();
      offDone();
    };
  }, [setPhase]);

  if (phase === "intro") {
    return (
      <SlideCard
        slide={INTRO[slide]}
        step={`${slide + 1}/${INTRO.length}`}
        cta={slide < INTRO.length - 1 ? "Next" : "Start the experiment"}
        onNext={() => (slide < INTRO.length - 1 ? setSlide(slide + 1) : setPhase("experiment"))}
        onBack={slide > 0 ? () => setSlide(slide - 1) : undefined}
      />
    );
  }

  if (phase === "results") {
    if (exp && !exp.passed) {
      return (
        <Card>
          <h2 className="text-xl font-bold">Experiment ruined</h2>
          <p className="mt-2 text-sm">
            A model who switches behaviour breaks the <b>standardised procedure</b> — the children wouldn&apos;t have seen
            one clear condition, so the IV is confounded.
          </p>
          <button className={btn} onClick={() => setPhase("experiment")}>
            Try again
          </button>
        </Card>
      );
    }
    return <Results exp={exp} onNext={() => setPhase("review")} />;
  }

  if (phase === "review" && inspecting) {
    const clue = CLUES.find((c) => c.id === inspecting)!;
    return (
      <ReviewCard
        key={clue.id}
        clue={clue}
        onDone={(correct, ms) => {
          track(WORLD, "review_answer", { id: clue.id, correct, ms });
          setAnswers((a) => ({ ...a, [clue.id]: correct }));
          setInspecting(null);
          bus.emit("lab:resolved", { id: clue.id, correct });
        }}
      />
    );
  }

  if (phase === "summary") {
    const correct = Object.values(answers).filter(Boolean).length;
    const accuracy = correct / CLUES.length;
    return (
      <Card>
        <h2 className="text-xl font-bold">Study reviewed! 🌴</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label="Evaluation" value={`${correct}/${CLUES.length}`} />
          <Stat label="Experiment" value={exp ? `${exp.strikes} strike${exp.strikes === 1 ? "" : "s"}` : "—"} />
          <Stat label="Hearts" value={"❤️".repeat(hearts) || "0"} />
        </div>
        <div className="mt-4 space-y-1 text-sm">
          {CLUES.map((c) => (
            <div key={c.id} className="flex justify-between gap-2">
              <span>
                {answers[c.id] ? "✔" : "✖"} {c.tag}
              </span>
              <span className={c.answer === "strength" ? "text-emerald-700" : "text-rose-700"}>{c.answer}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm opacity-80">Your oasis has been watered — this island&apos;s recall is restored.</p>
        <button
          className={btn}
          onClick={() => {
            track(WORLD, "world_complete", { accuracy, hearts });
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

const btn = "mt-5 w-full rounded-xl bg-[#2a6f97] py-3 font-bold text-white hover:bg-[#245f82]";

function Card({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-[#fff8e7] p-6 text-[#2b2118] shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-2">
      <div className="text-xs opacity-60">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function SlideCard({
  slide,
  step,
  cta,
  onNext,
  onBack,
}: {
  slide: Slide;
  step: string;
  cta: string;
  onNext: () => void;
  onBack?: () => void;
}) {
  return (
    <Card>
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#bff4ff] text-lg shadow-inner">✦</div>
        <div>
          <div className="text-xs opacity-60">
            {slide.speaker} · {step}
          </div>
          {slide.keyword && (
            <div className="inline-block rounded-full bg-[#ffd166] px-2 py-0.5 text-xs font-bold">{slide.keyword}</div>
          )}
        </div>
      </div>
      <p className="leading-relaxed">{slide.text}</p>
      {slide.visual === "matched-pairs" && <MatchedPairs />}
      {slide.visual === "conditions" && <Conditions />}
      <div className="flex gap-2">
        {onBack && (
          <button className={`${btn} bg-[#d9c9a3] text-[#2b2118] hover:bg-[#cdbb92]`} onClick={onBack}>
            Back
          </button>
        )}
        <button className={btn} onClick={onNext}>
          {cta}
        </button>
      </div>
    </Card>
  );
}

// Three children with matched aggression levels, one sent to each group
function MatchedPairs() {
  const levels = [0.8, 0.5, 0.25];
  const groups = ["Aggressive", "Non-aggr.", "Control"];
  return (
    <svg viewBox="0 0 360 150" className="mt-4 w-full" role="img" aria-label="Matched pairs: similar children split across groups">
      {groups.map((g, gi) => (
        <g key={g}>
          <text x={60 + gi * 120} y={14} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2b2118">
            {g}
          </text>
          {levels.map((lv, li) => {
            const x = 40 + gi * 120 + li * 20;
            return (
              <g key={li}>
                <circle cx={x} cy={40} r={8} fill="#ffd7b5" stroke="#5a3825" />
                <rect x={x - 4} y={60} width={8} height={70} fill="#eee" rx={2} />
                <rect x={x - 4} y={60 + 70 * (1 - lv)} width={8} height={70 * lv} fill="#e63946" rx={2} />
              </g>
            );
          })}
        </g>
      ))}
      <text x={180} y={146} textAnchor="middle" fontSize="11" fill="#2b2118" opacity={0.7}>
        same spread of aggression in every group
      </text>
    </svg>
  );
}

function Conditions() {
  const rows = [
    ["Aggressive model", "#e63946"],
    ["Non-aggressive model", "#2a9d8f"],
    ["No model (control)", "#8d99ae"],
  ];
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
      {rows.map(([label, color]) => (
        <div key={label} className="rounded-lg p-2 font-bold text-white" style={{ background: color }}>
          {label}
          <div className="mt-1 font-normal opacity-90">× same / opposite sex</div>
        </div>
      ))}
    </div>
  );
}

function Results({ exp, onNext }: { exp: ExperimentResult | null; onNext: () => void }) {
  const [step, setStep] = useState<"story" | "chart">("story");
  const [grow, setGrow] = useState(false);
  useEffect(() => {
    if (step === "chart") {
      const t = setTimeout(() => setGrow(true), 50);
      return () => clearTimeout(t);
    }
  }, [step]);

  if (step === "story") {
    return (
      <SlideCard
        slide={AFTER_EXPERIMENT}
        step={exp ? `you hit Bobo ${exp.hits}× · built ${exp.toys} tinker toys` : ""}
        cta="Show the results"
        onNext={() => setStep("chart")}
      />
    );
  }

  const max = 26;
  return (
    <Card wide>
      <h2 className="text-xl font-bold">Results</h2>
      <p className="text-sm opacity-70">Mean imitative physical aggression per child</p>
      <div className="mt-4 space-y-3">
        {RESULTS.map((r) => (
          <div key={r.label}>
            <div className="mb-1 text-xs font-semibold">{r.label}</div>
            {(["boys", "girls"] as const).map((k) => (
              <div key={k} className="mb-1 flex items-center gap-2 text-xs">
                <span className="w-10 opacity-70">{k}</span>
                <div className="h-4 flex-1 rounded bg-white">
                  <div
                    className="h-4 rounded transition-all duration-1000 ease-out"
                    style={{
                      width: grow ? `${(r[k] / max) * 100}%` : "0%",
                      background: k === "boys" ? "#2a6f97" : "#e76f51",
                    }}
                  />
                </div>
                <span className="w-10 text-right font-mono">{r[k].toFixed(1)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
        {FINDINGS.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <button className={btn} onClick={onNext}>
        Now peer review the study →
      </button>
    </Card>
  );
}

function ReviewCard({
  clue,
  onDone,
}: {
  clue: (typeof CLUES)[number];
  onDone: (correct: boolean, ms: number) => void;
}) {
  const [shownAt] = useState(() => Date.now());
  const [picked, setPicked] = useState<Verdict | null>(null);
  const correct = picked === clue.answer;
  return (
    <Card>
      <div className="text-4xl">{clue.icon}</div>
      <div className="mt-1 text-xs font-bold uppercase opacity-60">{clue.label}</div>
      <p className="mt-2 text-lg leading-snug">{clue.claim}</p>
      {!picked ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-xl bg-emerald-600 py-3 font-bold text-white" onClick={() => setPicked("strength")}>
            🛡 Strength
          </button>
          <button className="rounded-xl bg-rose-600 py-3 font-bold text-white" onClick={() => setPicked("weakness")}>
            ⚡ Weakness
          </button>
        </div>
      ) : (
        <>
          <div className={`mt-4 rounded-lg p-3 text-sm ${correct ? "bg-emerald-100" : "bg-rose-100"}`}>
            <b>{correct ? "Correct!" : `Not quite — it's a ${clue.answer}.`}</b> <span className="opacity-60">({clue.tag})</span>
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
