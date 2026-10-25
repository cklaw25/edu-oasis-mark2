// Learn-to-earn: finishing an island pays MOE, scaled by how well you did.
//   below 60%   nothing (pass mark not reached)
//   60%         the lowest reward: 20% of the island's maximum
//   100%        the island's maximum, which depends on the island's difficulty
// Each island pays out for its first 10 completions; after that it can still be played, for no MOE.
// Difficulty isn't set on worlds yet, so every island counts as "medium" until it is
// (see docs/REWARD_SYSTEM.md for the theory).
import type { Difficulty, Profile, WorldSummary } from "./types";

export const PASS_MARK = 0.6;
export const MIN_SHARE = 0.2;
export const MAX_REWARDED_PLAYS = 10;
export const DEFAULT_DIFFICULTY: Difficulty = "medium";

export const DIFFICULTY_MAX_MOE: Record<Difficulty, number> = {
  easy: 1_000,
  medium: 2_000,
  hard: 3_500,
  expert: 5_000,
};

export function difficultyOf(w: WorldSummary): Difficulty {
  return w.difficulty ?? DEFAULT_DIFFICULTY;
}

/** MOE for completing an island at this accuracy (0..1) and difficulty. */
export function sessionReward(accuracy: number, difficulty: Difficulty = DEFAULT_DIFFICULTY) {
  const a = Math.min(1, Math.max(0, accuracy));
  if (a < PASS_MARK) return 0;
  const max = DIFFICULTY_MAX_MOE[difficulty];
  const min = max * MIN_SHARE;
  const t = (a - PASS_MARK) / (1 - PASS_MARK);
  return Math.round((min + (max - min) * t) / 10) * 10;
}

/** How many more completions of this island can still earn MOE. */
export function rewardedPlaysLeft(p: Profile, worldId: string) {
  return Math.max(0, MAX_REWARDED_PLAYS - (p.rewardedPlays[worldId] ?? 0));
}

export interface RewardOutcome {
  amount: number;
  /** earning plays left on this island after this one */
  playsLeft: number;
  /** why nothing is paid: under the pass mark, or the island's earning plays are used up */
  why: "below" | "capped" | null;
}

/** What finishing this island at this accuracy pays: shown on the score screen, then paid on exit. */
export function rewardOutcome(p: Profile, world: WorldSummary | undefined, accuracy: number): RewardOutcome {
  if (!world) return { amount: 0, playsLeft: 0, why: "capped" };
  const left = rewardedPlaysLeft(p, world.id);
  if (left === 0) return { amount: 0, playsLeft: 0, why: "capped" };
  const amount = sessionReward(accuracy, difficultyOf(world));
  return amount > 0 ? { amount, playsLeft: left - 1, why: null } : { amount: 0, playsLeft: left, why: "below" };
}
