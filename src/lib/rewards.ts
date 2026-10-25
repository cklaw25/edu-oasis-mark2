// Learn-to-earn: finishing a game on an island pays MOE, scaled by how well you did.
//   below 55%   nothing (pass mark not reached)
//   55%         the lowest reward: 20% of the island's maximum
//   100%        the island's maximum, which depends on the island's difficulty
// Each island pays out for its first 10 games; after that it can still be played, for no MOE.
// Difficulty isn't set on worlds yet, so every island counts as "medium" until it is
// (see docs/REWARD_SYSTEM.md for the theory).
import type { Difficulty, Profile, WorldSummary } from "./types";

export const PASS_MARK = 0.55;
export const MIN_SHARE = 0.2;
export const MAX_REWARDED_PLAYS = 10;
export const DEFAULT_DIFFICULTY: Difficulty = "medium";

export const DIFFICULTY_MAX_MOE: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3.5,
  expert: 5,
};

export function difficultyOf(w: WorldSummary): Difficulty {
  return w.difficulty ?? DEFAULT_DIFFICULTY;
}

/** MOE for one game at this accuracy (0..1) on an island of this difficulty, before membership bonus. */
export function sessionReward(accuracy: number, difficulty: Difficulty = DEFAULT_DIFFICULTY) {
  const a = Math.min(1, Math.max(0, accuracy));
  if (a < PASS_MARK) return 0;
  const max = DIFFICULTY_MAX_MOE[difficulty];
  const min = max * MIN_SHARE;
  const t = (a - PASS_MARK) / (1 - PASS_MARK);
  return Math.round((min + (max - min) * t) * 100) / 100; // nearest 0.01 MOE
}

/** How many more games on this island can still earn MOE. */
export function rewardedPlaysLeft(p: Profile, worldId: string) {
  return Math.max(0, MAX_REWARDED_PLAYS - (p.rewardedPlays[worldId] ?? 0));
}
