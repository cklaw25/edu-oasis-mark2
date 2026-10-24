"use client";

import { FLAG_COLORS, TREE_STYLES, cosmeticsFor } from "@/lib/cosmetics";
import { formatMoe } from "@/lib/moe";
import { isClaimed } from "@/lib/profile";
import { MAX_OBJECTS_PER_ISLAND, OBJECT_COLORS, OBJECT_SPOTS, SHOP_ITEMS, ownsItem, shopItem } from "@/lib/shop";
import type { IslandCosmetics, Profile } from "@/lib/types";

// Cosmetics page for one outer island: opened by right-clicking it in the hub.
// Tree styles, flags and objects come from the Rapid Fire Market; locked ones show their price there.
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
  const option = (selected: boolean, locked: boolean) =>
    `flex flex-1 flex-col items-center gap-1 rounded-xl border-2 bg-white px-3 py-3 text-sm font-bold ${
      locked
        ? "cursor-not-allowed opacity-50 border-[#0b2a3d]/15"
        : selected
          ? "border-[#e0a526] shadow"
          : "border-[#0b2a3d]/15 hover:border-[#0b2a3d]/40"
    }`;
  const lockNote = (id: string) => `🔒 ${formatMoe(shopItem(id)?.price ?? 0)}`;

  const ownedObjects = SHOP_ITEMS.filter((i) => i.category === "object" && ownsItem(profile, i.id));
  const freeSpot = () => {
    const used = new Set(look.objects.map((o) => o.spot));
    return [...Array(OBJECT_SPOTS).keys()].find((s) => !used.has(s)) ?? 0;
  };
  const setObject = (index: number, patch: Partial<IslandCosmetics["objects"][number]>) =>
    onChange({ ...look, objects: look.objects.map((o, i) => (i === index ? { ...o, ...patch } : o)) });

  return (
    <div className="max-h-[65vh] overflow-y-auto pr-1">
      <p className="text-sm opacity-80">
        Change how this island looks. Locked styles are sold in the ⚡ Rapid Fire Market.
      </p>

      <h3 className="mt-4 text-sm font-bold uppercase tracking-wide opacity-70">Trees</h3>
      <div className="mt-2 flex gap-2">
        {TREE_STYLES.map((t) => {
          const locked = !ownsItem(profile, `trees-${t.id}`);
          return (
            <button
              key={t.id}
              disabled={locked}
              onClick={() => onChange({ ...look, trees: t.id })}
              className={option(look.trees === t.id, locked)}
            >
              <span className="text-2xl">{t.icon}</span>
              {t.label}
              {locked && <span className="text-[10px]">{lockNote(`trees-${t.id}`)}</span>}
            </button>
          );
        })}
      </div>
      {!hasWorld && <p className="mt-2 text-xs opacity-60">Trees appear once a world grows on this island.</p>}

      <h3 className="mt-4 text-sm font-bold uppercase tracking-wide opacity-70">Flag</h3>
      <div className="mt-2 flex gap-2">
        {FLAG_COLORS.map((f) => {
          const locked = !ownsItem(profile, `flag-${f.id}`);
          return (
            <button
              key={f.id}
              disabled={locked}
              onClick={() => onChange({ ...look, flag: f.id })}
              className={option(look.flag === f.id, locked)}
            >
              <span
                className="h-6 w-6 rounded-full border-2 border-[#0b2a3d]/20"
                style={{ background: f.id === "none" ? "transparent" : `#${f.hex.toString(16).padStart(6, "0")}` }}
              />
              {f.label}
              {locked && <span className="text-[10px]">{lockNote(`flag-${f.id}`)}</span>}
            </button>
          );
        })}
      </div>

      <h3 className="mt-4 text-sm font-bold uppercase tracking-wide opacity-70">
        Objects ({look.objects.length}/{MAX_OBJECTS_PER_ISLAND})
      </h3>
      {ownedObjects.length === 0 ? (
        <p className="mt-2 text-xs opacity-60">Buy rocks, signs, lanterns, benches and statues in the ⚡ Rapid Fire Market.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {ownedObjects.map((i) => (
            <button
              key={i.id}
              disabled={look.objects.length >= MAX_OBJECTS_PER_ISLAND}
              onClick={() =>
                onChange({ ...look, objects: [...look.objects, { item: i.id, color: OBJECT_COLORS[0], spot: freeSpot() }] })
              }
              className="rounded-lg border-2 border-[#0b2a3d]/15 bg-white px-3 py-1.5 text-sm font-bold hover:border-[#0b2a3d]/40 disabled:opacity-40"
            >
              + {i.icon} {i.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {look.objects.map((o, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-[#0b2a3d]/15 bg-white p-2">
            <span className="w-24 text-sm font-bold">
              {shopItem(o.item)?.icon} {shopItem(o.item)?.name}
            </span>
            <div className="flex gap-1">
              {OBJECT_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Paint ${c}`}
                  onClick={() => setObject(idx, { color: c })}
                  className={`h-6 w-6 rounded-full border-2 ${o.color === c ? "border-[#0b2a3d]" : "border-[#0b2a3d]/20"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1 text-sm font-bold">
              <button
                aria-label="Move left"
                onClick={() => setObject(idx, { spot: (o.spot + OBJECT_SPOTS - 1) % OBJECT_SPOTS })}
                className="rounded-md border-2 border-[#0b2a3d]/20 px-2 hover:bg-[#0b2a3d]/5"
              >
                ⟲
              </button>
              <button
                aria-label="Move right"
                onClick={() => setObject(idx, { spot: (o.spot + 1) % OBJECT_SPOTS })}
                className="rounded-md border-2 border-[#0b2a3d]/20 px-2 hover:bg-[#0b2a3d]/5"
              >
                ⟳
              </button>
              <button
                onClick={() => onChange({ ...look, objects: look.objects.filter((_, i) => i !== idx) })}
                className="rounded-md border-2 border-[#9b2226]/30 px-2 text-[#9b2226] hover:bg-[#9b2226]/5"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
