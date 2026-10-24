import { STARTING_MOE } from "./moe";
import type { Profile, WorldSummary } from "./types";

const KEY = "eo2.profile";

export const DEMO_WORLD: WorldSummary = {
  id: "demo-bobo",
  title: "Bobo Doll Experiment",
  topic: "IB Psychology — Bandura, Ross & Ross (1961)",
  creator: "EduOasis",
  createdAt: Date.now() - 3 * 86400_000,
  lastVisitedAt: Date.now() - 2 * 86400_000,
  halfLifeH: 48, // two days since the last visit → recall 50%
  recall: 0.5,
  gameType: "rpg-experiment",
};

/** Island slot every learner gets for free; the other slots are claimed by buying worlds. */
export const FREE_SLOT = 0;

/** A slot is yours if it's your free island or it holds a world you own. */
export function isClaimed(p: Profile, slot: number) {
  return slot === FREE_SLOT || p.worlds[slot] !== null;
}

/** Where the next bought world goes: the first unclaimed island, or -1 if every island is claimed. */
export function nextIslandSlot(p: Profile) {
  return p.worlds.findIndex((_, i) => !isClaimed(p, i));
}

/** A brand-new learner: one free empty island and 30,000 MOE to buy their first island. */
export function defaultProfile(): Profile {
  return {
    name: "Learner",
    generationsLeft: 2,
    worlds: [null, null, null],
    moe: STARTING_MOE,
    owned: [],
    listings: [],
    boughtListings: [],
  };
}

const DEMO_BOBO_NFT = "EO-BOBO01";

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      // profiles saved before the market existed: give them MOE and record Bobo as bought
      const p = JSON.parse(raw) as Profile;
      const owned = p.worlds?.some((w) => w?.id === DEMO_WORLD.id) ? ["bobo"] : [];
      const worlds = p.worlds.map((w) =>
        w?.id === DEMO_WORLD.id && !w.nftId ? { ...w, bought: true, nftId: DEMO_BOBO_NFT } : w,
      );
      return {
        ...p,
        worlds,
        moe: p.moe ?? STARTING_MOE,
        owned: p.owned ?? owned,
        listings: p.listings ?? [],
        boughtListings: p.boughtListings ?? [],
      };
    }
  } catch {}
  return defaultProfile();
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
