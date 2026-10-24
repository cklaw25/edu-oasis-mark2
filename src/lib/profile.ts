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

/** A brand-new learner: three free empty islands. */
export function newProfile(): Profile {
  return { name: "Learner", generationsLeft: 2, worlds: [null, null, null], moe: STARTING_MOE, owned: [] };
}

/** The demo learner has already bought the Bobo Doll world from the World Market. */
export function defaultProfile(): Profile {
  return { ...newProfile(), worlds: [DEMO_WORLD, null, null], owned: ["bobo"] };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      // profiles saved before the market existed: give them MOE and record Bobo as bought
      const p = JSON.parse(raw) as Profile;
      const owned = p.worlds?.some((w) => w?.id === DEMO_WORLD.id) ? ["bobo"] : [];
      return { ...p, moe: p.moe ?? STARTING_MOE, owned: p.owned ?? owned };
    }
  } catch {}
  return defaultProfile();
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
