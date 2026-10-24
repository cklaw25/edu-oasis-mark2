"use client";

import { useState } from "react";
import MoeCoin from "@/components/MoeCoin";
import { formatMoe } from "@/lib/moe";
import {
  CATEGORIES,
  LABEL_FONTS,
  SHIRT_COLORS,
  SHOP_ITEMS,
  WORLD_THEMES,
  ownsItem,
  type ShopCategory,
  type ShopItem,
} from "@/lib/shop";
import type { Profile } from "@/lib/types";

export interface RapidActions {
  buy: (item: ShopItem) => void;
  equip: (item: ShopItem) => void;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

// Rapid Fire Market: cosmetics for your avatar, the world map, label fonts, islands and placeable objects.
export default function RapidMarketPanel({ profile, actions }: { profile: Profile; actions: RapidActions }) {
  const [cat, setCat] = useState<ShopCategory>("avatar");
  const items = SHOP_ITEMS.filter((i) => i.category === cat);
  const equipped = (i: ShopItem) =>
    (i.slot === "shirt" && profile.avatar.shirt === i.id) ||
    (i.slot === "hat" && profile.avatar.hat === i.id) ||
    (i.category === "pip" && profile.pip === i.id) ||
    (i.category === "world" && profile.theme === i.id) ||
    (i.category === "font" && profile.font === i.id);
  // island looks and objects are applied per island, not equipped globally
  const usedOnIslands = cat === "island" || cat === "object";

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-[#0b2a3d]/10 p-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold ${cat === c.id ? "bg-white shadow" : "opacity-60 hover:opacity-100"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {usedOnIslands && (
        <p className="mb-3 text-xs opacity-70">
          Use these on your islands: right-click an island to open its cosmetics page.
        </p>
      )}
      <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
        {items.map((i) => {
          const owned = ownsItem(profile, i.id);
          const on = equipped(i);
          return (
            <div key={i.id} className="flex flex-col rounded-xl border-2 border-[#0b2a3d]/15 bg-white p-3">
              <Preview item={i} />
              <div className="mt-2 text-sm font-bold">{i.name}</div>
              <div className="mt-1 flex items-center gap-1 text-xs font-bold">
                {i.price === 0 ? (
                  "Free"
                ) : (
                  <>
                    <MoeCoin size={16} />
                    {formatMoe(i.price)} MOE
                  </>
                )}
              </div>
              <div className="mt-2">
                {!owned ? (
                  <button
                    onClick={() => actions.buy(i)}
                    disabled={profile.moe < i.price}
                    className="w-full rounded-lg bg-[#e0a526] px-3 py-1.5 text-sm font-bold text-[#2b2118] hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Buy
                  </button>
                ) : usedOnIslands ? (
                  <span className="block rounded-lg bg-[#06d6a0]/20 px-3 py-1.5 text-center text-sm font-bold text-[#05785a]">
                    ✓ Owned
                  </span>
                ) : on ? (
                  <span className="block rounded-lg bg-[#06d6a0]/20 px-3 py-1.5 text-center text-sm font-bold text-[#05785a]">
                    ✓ Equipped
                  </span>
                ) : (
                  <button
                    onClick={() => actions.equip(i)}
                    className="w-full rounded-lg border-2 border-[#0b2a3d]/20 px-3 py-1.5 text-sm font-bold hover:bg-[#0b2a3d]/5"
                  >
                    Equip
                  </button>
                )}
              </div>
              {!owned && profile.moe < i.price && (
                <p className="mt-1 text-[10px] font-bold text-[#9b2226]">Need {formatMoe(i.price - profile.moe)} more</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Preview({ item }: { item: ShopItem }) {
  if (item.slot === "shirt") {
    return <div className="h-12 rounded-lg border-2 border-black/10" style={{ background: hex(SHIRT_COLORS[item.id]) }} />;
  }
  if (item.category === "pip") {
    return (
      <div className="flex h-12 items-center justify-center rounded-lg bg-[#2a6f97] text-3xl" title="Pip follows you around the map">
        {item.icon}
      </div>
    );
  }
  if (item.category === "world") {
    const t = WORLD_THEMES[item.id];
    return (
      <div className="relative h-12 overflow-hidden rounded-lg" style={{ background: hex(t.ocean) }}>
        <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: hex(t.shallows) }} />
      </div>
    );
  }
  if (item.category === "font") {
    return (
      <div className="flex h-12 items-center justify-center rounded-lg bg-[#2a6f97] text-lg text-white" style={{ fontFamily: LABEL_FONTS[item.id] }}>
        Home Island
      </div>
    );
  }
  return <div className="flex h-12 items-center justify-center rounded-lg bg-[#0b2a3d]/5 text-3xl">{item.icon}</div>;
}
