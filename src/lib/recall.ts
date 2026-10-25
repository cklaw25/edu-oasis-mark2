// Half-life forgetting curve (as in Duolingo's half-life regression, simplified):
//   p(recall) = 2^(-Δt / h)
// h = how long until recall drops to 50%. Each review rescales h by how well you did, so strong
// sessions make a memory fade slower and weak ones make it fade faster.

import { now } from "./clock";
import type { WorldSummary } from "./types";

const HOUR = 3_600_000;
export const DEFAULT_HALF_LIFE_H = 24;
const MIN_H = 2;
const MAX_H = 24 * 60;

export function halfLifeH(w: WorldSummary) {
  return w.halfLifeH ?? DEFAULT_HALF_LIFE_H;
}

export function recallAt(w: WorldSummary, t = now()) {
  const dt = Math.max(0, t - w.lastVisitedAt);
  return Math.pow(2, -dt / (halfLifeH(w) * HOUR));
}

/** accuracy 0..1 → new half-life. 100% roughly triples it, 50% keeps it, 0% halves it. */
export function nextHalfLife(w: WorldSummary, accuracy: number) {
  const factor = accuracy >= 0.5 ? 1 + (accuracy - 0.5) * 4 : 0.5 + accuracy;
  return Math.min(MAX_H, Math.max(MIN_H, halfLifeH(w) * factor));
}

// ---- Lifespan: spaced-review schedule (2 → 4 → 6 → 8… days) ----
const DAY = 24 * HOUR;
export const GOOD_SESSION = 0.6;

export function intervalDays(w: WorldSummary) {
  return 2 * Math.max(1, w.streak ?? 0);
}

/** share of the current review interval left: 1 right after a review, 0 when the review is due */
export function lifespanAt(w: WorldSummary, t = now()) {
  const elapsed = Math.max(0, t - w.lastVisitedAt);
  return Math.max(0, 1 - elapsed / (intervalDays(w) * DAY));
}

export function daysUntilDue(w: WorldSummary, t = now()) {
  return Math.max(0, intervalDays(w) - Math.max(0, t - w.lastVisitedAt) / DAY);
}

/** a good session extends the schedule, a weak one resets it to 2 days */
export function nextStreak(w: WorldSummary, accuracy: number) {
  return accuracy >= GOOD_SESSION ? (w.streak ?? 0) + 1 : 0;
}

/** hours until recall falls to `target` */
export function hoursUntil(w: WorldSummary, target = 0.5, t = now()) {
  const h = halfLifeH(w);
  const elapsedH = Math.max(0, t - w.lastVisitedAt) / HOUR;
  return Math.max(0, -Math.log2(target) * h - elapsedH);
}
