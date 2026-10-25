"use client";

import { Component, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { CLUES } from "@/content/bobo";
import { track } from "@/lib/telemetry";
import RewardCelebration from "@/components/RewardCelebration";
import type { RewardOutcome } from "@/lib/rewards";
import { Card, Stat, btn } from "@/components/BoboFlow";

// three.js only loads when this Kata is opened, and never on the server
const Kata3D = dynamic(() => import("@/components/Kata3D"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b2a3d] text-white">Building the 3D room…</div>
  ),
});

export const KATA3D_WORLD = "demo-3d";
const CRYSTALS = CLUES.slice(0, 5);

// React side of the 3D test Kata: intro card → 3D crystals → summary with the usual reward.
export default function Kata3DFlow({
  onExit,
  onQuit,
  reward,
}: {
  onExit: (accuracy: number) => void;
  /** leave without a result (e.g. 3D failed to start) */
  onQuit: () => void;
  reward: (accuracy: number) => RewardOutcome;
}) {
  const [phase, setPhase] = useState<"intro" | "play" | "summary">("intro");
  const [score, setScore] = useState({ correct: 0, mistakes: 0 });

  if (phase === "intro") {
    return (
      <Card>
        <h2 className="text-xl font-bold">💎 3D Memory Crystals</h2>
        <p className="mt-2 leading-relaxed">
          Five crystals float around the Bobo doll lab. Each one holds a claim about Bandura&apos;s study. Drag to look around,
          click a crystal, and judge it: <b>strength</b> or <b>weakness</b>?
        </p>
        <p className="mt-2 text-xs opacity-60">A 3D preview Kata, built with React Three Fiber.</p>
        <button className={btn} onClick={() => setPhase("play")}>
          Enter the 3D room
        </button>
      </Card>
    );
  }

  if (phase === "play") {
    return (
      <Kata3DGuard onExit={onQuit}>
        <Kata3D
          worldId={KATA3D_WORLD}
          clues={CRYSTALS}
          onDone={(correct, mistakes) => {
            setScore({ correct, mistakes });
            setPhase("summary");
          }}
        />
      </Kata3DGuard>
    );
  }

  const accuracy = score.correct / CRYSTALS.length;
  return (
    <Card>
      <h2 className="text-xl font-bold">Crystals judged! 💎</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <Stat label="Correct" value={`${score.correct}/${CRYSTALS.length}`} />
        <Stat label="Mistakes" value={String(score.mistakes)} />
      </div>
      <RewardCelebration accuracy={accuracy} outcome={reward(accuracy)} />
      <p className="mt-3 text-sm opacity-80">Your oasis has been watered — this Kata&apos;s recall is restored.</p>
      <button
        className={btn}
        onClick={() => {
          track(KATA3D_WORLD, "world_complete", { accuracy });
          onExit(accuracy);
        }}
      >
        Back to the Katas
      </button>
    </Card>
  );
}

/** If WebGL or three.js fails on this device, show a way out instead of crashing the page. */
class Kata3DGuard extends Component<{ children: ReactNode; onExit: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error("3D Kata crashed", e);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Card>
        <h2 className="text-xl font-bold">3D isn&apos;t available on this device</h2>
        <p className="mt-2 text-sm">Your browser couldn&apos;t start the 3D scene. Everything else still works.</p>
        <button className={btn} onClick={this.props.onExit}>
          Back to the Katas
        </button>
      </Card>
    );
  }
}
