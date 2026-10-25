"use client";

import { useMemo } from "react";
import MoeCoin from "@/components/MoeCoin";
import { formatMoe } from "@/lib/moe";
import { MAX_REWARDED_PLAYS, PASS_MARK, type RewardOutcome } from "@/lib/rewards";

// End-of-island reward + a celebration that grows with the score. Sits on the summary card under "how many you got right".
const TIERS = [
  { min: 1, title: "PERFECT!", emoji: "👑", line: "Every answer right. Legendary!", confetti: 60, bg: "from-[#ffd166] to-[#ff70a6]" },
  { min: 0.9, title: "Brilliant!", emoji: "🏆", line: "Nearly flawless. Top work!", confetti: 40, bg: "from-[#ffd166] to-[#06d6a0]" },
  { min: 0.75, title: "Great job!", emoji: "🌟", line: "You really know this.", confetti: 24, bg: "from-[#bff4ff] to-[#06d6a0]" },
  { min: PASS_MARK, title: "Passed!", emoji: "🎉", line: "Nice! A bit more practice and you'll ace it.", confetti: 10, bg: "from-[#bff4ff] to-[#d8ffd8]" },
  { min: 0, title: "Keep practising", emoji: "💪", line: "Not a pass yet, but every try helps you remember.", confetti: 0, bg: "from-[#f1e7d0] to-[#e8dcc0]" },
] as const;

const COLORS = ["#ffd166", "#ff70a6", "#06d6a0", "#3d5afe", "#e63946", "#9b5de5"];

export default function RewardCelebration({ accuracy, outcome }: { accuracy: number; outcome: RewardOutcome }) {
  const tier = TIERS.find((t) => accuracy >= t.min - 1e-9)!;
  const pieces = useMemo(
    () =>
      Array.from({ length: tier.confetti }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${((i * 53) % 100) / 100}s`,
        duration: `${1.6 + ((i * 29) % 10) / 10}s`,
        color: COLORS[i % COLORS.length],
        rotate: `${(i * 47) % 360}deg`,
      })),
    [tier.confetti],
  );

  return (
    <div className={`relative mt-4 overflow-hidden rounded-xl bg-gradient-to-br ${tier.bg} p-4 text-center text-[#2b2118]`}>
      {/* confetti */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{ left: p.left, background: p.color, animationDelay: p.delay, animationDuration: p.duration, rotate: p.rotate }}
          />
        ))}
      </div>

      <div className={`relative text-4xl ${tier.confetti >= 40 ? "celebrate-bounce" : ""}`}>{tier.emoji}</div>
      <div className="relative text-2xl font-black">{tier.title}</div>
      <div className="relative text-sm">
        {Math.round(accuracy * 100)}% correct · {tier.line}
      </div>

      <div className="relative mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-[#0b2a3d] px-4 py-2 text-white">
        <MoeCoin size={26} />
        {outcome.why === null ? (
          <span className="text-lg font-bold text-[#ffd166]">+{formatMoe(outcome.amount)} MOE</span>
        ) : (
          <span className="text-sm font-bold">No MOE this time</span>
        )}
      </div>
      <div className="relative mt-2 text-xs opacity-80">
        {outcome.why === "capped"
          ? `You've already earned from this Kata ${MAX_REWARDED_PLAYS} times. Play on for practice!`
          : outcome.why === "below"
            ? `Score ${Math.round(PASS_MARK * 100)}% or more to earn MOE.`
            : `${outcome.playsLeft} of ${MAX_REWARDED_PLAYS} earning plays left on this Kata.`}
      </div>
    </div>
  );
}
