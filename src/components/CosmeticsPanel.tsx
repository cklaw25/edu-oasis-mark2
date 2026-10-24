"use client";

import { FLAG_COLORS, TREE_STYLES, cosmeticsFor } from "@/lib/cosmetics";
import { isClaimed } from "@/lib/profile";
import type { IslandCosmetics, Profile } from "@/lib/types";

// Cosmetics page for one outer island: opened by right-clicking it in the hub.
export default function CosmeticsPanel({
  profile,
  slot,
  onChange,
}: {
  profile: Profile;
  slot: number;
  onChange: (look: IslandCosmetics) => void;
}) {
  if (!isClaimed(profile, slot)) {
    return (
      <p className="text-sm opacity-80">
        This island isn&apos;t yours yet. Buy a world in the World Market to claim it, then come back to decorate it.
      </p>
    );
  }

  const look = cosmeticsFor(profile, slot);
  const hasWorld = profile.worlds[slot] !== null;
  const option = (selected: boolean) =>
    `flex flex-1 flex-col items-center gap-1 rounded-xl border-2 bg-white px-3 py-3 text-sm font-bold ${
      selected ? "border-[#e0a526] shadow" : "border-[#0b2a3d]/15 hover:border-[#0b2a3d]/40"
    }`;

  return (
    <>
      <p className="text-sm opacity-80">Change how this island looks. Changes show straight away.</p>

      <h3 className="mt-4 text-sm font-bold uppercase tracking-wide opacity-70">Trees</h3>
      <div className="mt-2 flex gap-2">
        {TREE_STYLES.map((t) => (
          <button key={t.id} onClick={() => onChange({ ...look, trees: t.id })} className={option(look.trees === t.id)}>
            <span className="text-2xl">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      {!hasWorld && <p className="mt-2 text-xs opacity-60">Trees appear once a world grows on this island.</p>}

      <h3 className="mt-4 text-sm font-bold uppercase tracking-wide opacity-70">Flag</h3>
      <div className="mt-2 flex gap-2">
        {FLAG_COLORS.map((f) => (
          <button key={f.id} onClick={() => onChange({ ...look, flag: f.id })} className={option(look.flag === f.id)}>
            <span
              className="h-6 w-6 rounded-full border-2 border-[#0b2a3d]/20"
              style={{ background: f.id === "none" ? "transparent" : `#${f.hex.toString(16).padStart(6, "0")}` }}
            />
            {f.label}
          </button>
        ))}
      </div>
    </>
  );
}
