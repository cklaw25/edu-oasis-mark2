import type { Profile, WorldSummary } from "./types";

const KEY = "eo2.profile";

const DEMO_WORLD: WorldSummary = {
  id: "demo-bobo",
  title: "Bobo Doll Experiment",
  topic: "IB Psychology — Bandura, Ross & Ross (1961)",
  creator: "EduOasis",
  createdAt: Date.now() - 3 * 86400_000,
  lastVisitedAt: Date.now() - 2 * 86400_000,
  recall: 0.55,
  gameType: "rpg-experiment",
};

export function defaultProfile(): Profile {
  return { name: "Learner", generationsLeft: 2, worlds: [DEMO_WORLD, null, null] };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Profile;
  } catch {}
  return defaultProfile();
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
