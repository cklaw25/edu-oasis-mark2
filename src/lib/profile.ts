import { STARTING_MOE } from "./moe";
import type { Profile, WorldSummary } from "./types";

const KEY = "eo2.profile";

const DEMO_WORLD: WorldSummary = {
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

export function defaultProfile(): Profile {
  return { name: "Learner", generationsLeft: 2, worlds: [DEMO_WORLD, null, null], moe: STARTING_MOE, unlockedSlots: [] };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    // profiles saved before MOE existed get the starting balance and no unlocks
    if (raw) return { moe: STARTING_MOE, unlockedSlots: [], ...JSON.parse(raw) } as Profile;
  } catch {}
  return defaultProfile();
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
