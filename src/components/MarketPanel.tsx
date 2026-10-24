"use client";

import { useState } from "react";
import MoeCoin from "@/components/MoeCoin";
import { SUBJECTS, type MarketTopic } from "@/lib/market";
import { WORLD_PRICE_MOE, formatMoe } from "@/lib/moe";
import type { Profile } from "@/lib/types";

// World Market: pick a subject, then buy subtopic worlds for MOE. Bought worlds land on a free island.
export default function MarketPanel({ profile, onBuy }: { profile: Profile; onBuy: (topic: MarketTopic) => void }) {
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const hasFreeIsland = profile.worlds.some((w) => !w);

  if (!subject) {
    return (
      <>
        <p className="text-sm opacity-80">Pick a subject to see its worlds.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSubjectId(s.id)}
              className="rounded-xl border-2 border-[#0b2a3d]/15 bg-white px-4 py-5 text-left hover:border-[#e0a526]"
            >
              <div className="text-3xl">{s.icon}</div>
              <div className="mt-2 font-bold">{s.title}</div>
              <div className="text-xs opacity-60">{s.topics.length} worlds</div>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <button onClick={() => setSubjectId(null)} className="text-sm underline opacity-70 hover:opacity-100">
        ← All subjects
      </button>
      <h3 className="mt-2 text-lg font-bold">
        {subject.icon} {subject.title}
      </h3>
      <div className="mt-3 flex flex-col gap-3">
        {subject.topics.map((t) => {
          const owned = profile.owned.includes(t.id);
          const canAfford = profile.moe >= WORLD_PRICE_MOE;
          return (
            <div key={t.id} className="rounded-xl border-2 border-[#0b2a3d]/15 bg-white p-4">
              <div className="font-bold">{t.title}</div>
              <p className="mt-1 text-sm opacity-75">{t.blurb}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-bold">
                  <MoeCoin size={22} />
                  {formatMoe(WORLD_PRICE_MOE)} MOE
                </span>
                {owned ? (
                  <span className="rounded-lg bg-[#06d6a0]/20 px-3 py-2 text-sm font-bold text-[#05785a]">
                    ✓ Owned: on your island
                  </span>
                ) : (
                  <button
                    onClick={() => onBuy(t)}
                    disabled={!canAfford || !hasFreeIsland}
                    className="rounded-lg bg-[#e0a526] px-4 py-2 text-sm font-bold text-[#2b2118] hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Buy
                  </button>
                )}
              </div>
              {!owned && !canAfford && (
                <p className="mt-2 text-xs font-bold text-[#9b2226]">
                  You need {formatMoe(WORLD_PRICE_MOE - profile.moe)} more MOE.
                </p>
              )}
              {!owned && canAfford && !hasFreeIsland && (
                <p className="mt-2 text-xs font-bold text-[#9b2226]">All your islands are full.</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
