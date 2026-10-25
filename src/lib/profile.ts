import { resetBounties } from "./bounty";
import { STARTING_MOE, roundMoe } from "./moe";
import type { Profile, WorldSummary } from "./types";

const KEY = "eo2.profile";
/** bump when MOE amounts change scale (see rescaleMoe) */
const MOE_VERSION = 2;

// The hand-built Bobo world (BoboFlow). Sold in the World Market like the generated sample worlds.
export const DEMO_WORLD: WorldSummary = {
  id: "demo-bobo",
  title: "Bobo Doll Experiment",
  topic: "IB Psychology — Bandura, Ross & Ross (1961)",
  creator: "EduOasis",
  createdAt: 0,
  lastVisitedAt: 0,
  recall: 1,
  gameType: "rpg-experiment",
};

/** A brand-new learner: 3 empty islands, 2 free generations and 30 MOE to buy a world. */
export function defaultProfile(): Profile {
  return {
    name: "Learner",
    generationsLeft: 2,
    worlds: [null, null, null],
    library: [],
    moe: STARTING_MOE,
    moeVersion: MOE_VERSION,
    listings: [],
    cosmetics: {},
    rewardedPlays: {},
    // free Rapid Fire Market starter look
    ownedItems: [],
    avatar: { shirt: "shirt-blue", hat: "hat-none" },
    pip: "pip-classic",
    theme: "theme-classic",
    font: "font-mono",
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      // profiles saved before the MOE market: give them a balance and an empty library
      const p = JSON.parse(raw) as Partial<Profile>;
      if (p.moe !== undefined && p.moeVersion !== MOE_VERSION) return rescaleMoe(p);
      return { ...defaultProfile(), ...p, library: p.library ?? [], moe: p.moe ?? STARTING_MOE, listings: p.listings ?? [] };
    }
  } catch {}
  return defaultProfile();
}

/** Saves from before MOE was cut 1,000× (30,000 → 30 to start): scale the balance and listings down to match. */
function rescaleMoe(p: Partial<Profile>): Profile {
  resetBounties(); // their stakes and pools were on the old scale too; the demo pools reseed
  const next: Profile = {
    ...defaultProfile(),
    ...p,
    library: p.library ?? [],
    moe: roundMoe((p.moe ?? 0) / 1000),
    listings: (p.listings ?? []).map((l) => ({ ...l, price: roundMoe(l.price / 1000) })),
    moeVersion: MOE_VERSION,
  };
  saveProfile(next);
  return next;
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

/** Every world the player owns: the 3 islands first, then the library. */
export function allWorlds(p: Profile): WorldSummary[] {
  return [...p.worlds.filter((w): w is WorldSummary => !!w), ...p.library];
}

export function ownsWorld(p: Profile, id: string) {
  return allWorlds(p).some((w) => w.id === id);
}

/** Put a new world on the given island (or the first empty one); with every island full it goes to the library. */
export function addWorld(p: Profile, world: WorldSummary, slot?: number): { profile: Profile; slot: number } {
  const at = slot !== undefined && !p.worlds[slot] ? slot : p.worlds.indexOf(null);
  if (at < 0) return { profile: { ...p, library: [world, ...p.library] }, slot: -1 };
  const worlds = [...p.worlds];
  worlds[at] = world;
  return { profile: { ...p, worlds }, slot: at };
}

/** Show a library world on an island; whatever was there goes back to the library. */
export function showOnIsland(p: Profile, id: string, slot: number): Profile {
  const world = p.library.find((w) => w.id === id);
  if (!world) return p;
  const worlds = [...p.worlds];
  const old = worlds[slot];
  worlds[slot] = world;
  return { ...p, worlds, library: [...(old ? [old] : []), ...p.library.filter((w) => w.id !== id)] };
}

/** Move an island's world into the library, freeing the island. */
export function storeWorld(p: Profile, slot: number): Profile {
  const old = p.worlds[slot];
  if (!old) return p;
  const worlds = [...p.worlds];
  worlds[slot] = null;
  return { ...p, worlds, library: [old, ...p.library] };
}

/** Remove a world entirely (it was sold). */
export function removeWorld(p: Profile, id: string): Profile {
  return {
    ...p,
    worlds: p.worlds.map((w) => (w?.id === id ? null : w)),
    library: p.library.filter((w) => w.id !== id),
    listings: p.listings.filter((l) => l.worldId !== id),
  };
}

/** Apply a change to an owned world wherever it lives (island or library). */
export function updateWorld(p: Profile, id: string, fn: (w: WorldSummary) => WorldSummary): Profile {
  return {
    ...p,
    worlds: p.worlds.map((w) => (w?.id === id ? fn(w) : w)),
    library: p.library.map((w) => (w.id === id ? fn(w) : w)),
  };
}
