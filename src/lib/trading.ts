// Player-to-player trading: worlds, MOE and Rapid Fire Market items for each other.
// UI only for now: the players and offers below are demo data, and nothing changes hands until a
// trading backend (escrow on Solana, see docs/TRADING_SYSTEM.md) is connected and TRADING_LIVE flips.
import { MARKET_PRICE_MOE } from "./moe";
import { shopItem } from "./shop";

export const TRADING_LIVE = false;

/** One side of a trade: what that player hands over. */
export interface TradeSide {
  worlds: string[]; // world titles
  moe: number;
  items: string[]; // Rapid Fire Market item ids
}

export interface Trader {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  /** what they have to trade */
  stock: TradeSide;
}

export interface TradeOffer {
  id: string;
  traderId: string;
  /** what they give you / what they want from you */
  give: TradeSide;
  want: TradeSide;
  t: number;
}

export const DEMO_TRADERS: Trader[] = [
  {
    id: "ava",
    name: "Ava",
    avatar: "🦊",
    online: true,
    stock: { worlds: ["Milgram (1963) Obedience", "Photosynthesis"], moe: 42_000, items: ["hat-crown", "pip-star", "theme-sunset"] },
  },
  {
    id: "sam",
    name: "Sam",
    avatar: "🐢",
    online: true,
    stock: { worlds: ["Loftus & Palmer (1974)"], moe: 18_500, items: ["shirt-gold", "obj-lantern", "trees-blossom"] },
  },
  {
    id: "priya",
    name: "psych_with_priya",
    avatar: "🦉",
    online: false,
    stock: {
      worlds: ["Causes of World War One", "Inventors Who Changed the World"],
      moe: 65_000,
      items: ["pip-robot", "font-serif", "theme-night"],
    },
  },
  {
    id: "leo",
    name: "Leo",
    avatar: "🐙",
    online: true,
    stock: { worlds: [], moe: 9_000, items: ["hat-wizard", "obj-statue", "flag-gold"] },
  },
];

export const DEMO_INCOMING: TradeOffer[] = [
  {
    id: "offer-ava-1",
    traderId: "ava",
    give: { worlds: ["Milgram (1963) Obedience"], moe: 0, items: [] },
    want: { worlds: [], moe: 25_000, items: [] },
    t: Date.now() - 12 * 60_000,
  },
  {
    id: "offer-leo-1",
    traderId: "leo",
    give: { worlds: [], moe: 0, items: ["hat-wizard"] },
    want: { worlds: [], moe: 3_000, items: [] },
    t: Date.now() - 55 * 60_000,
  },
];

export const emptySide = (): TradeSide => ({ worlds: [], moe: 0, items: [] });

export const isEmpty = (s: TradeSide) => s.worlds.length === 0 && s.moe === 0 && s.items.length === 0;

/** Rough MOE value of one side, so players can see if a trade is fair: worlds at the shop price, items at theirs. */
export function sideValue(s: TradeSide) {
  return s.worlds.length * MARKET_PRICE_MOE + s.moe + s.items.reduce((sum, id) => sum + (shopItem(id)?.price ?? 0), 0);
}

export function describeSide(s: TradeSide) {
  const parts = [
    ...s.worlds.map((w) => `🏝 ${w}`),
    ...(s.moe ? [`${s.moe.toLocaleString("en-US")} MOE`] : []),
    ...s.items.map((id) => `${shopItem(id)?.icon ?? "🎁"} ${shopItem(id)?.name ?? id}`),
  ];
  return parts.length ? parts.join(", ") : "nothing";
}
