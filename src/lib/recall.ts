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

/** hours until recall falls to `target` */
export function hoursUntil(w: WorldSummary, target = 0.5, t = now()) {
  const h = halfLifeH(w);
  const elapsedH = Math.max(0, t - w.lastVisitedAt) / HOUR;
  return Math.max(0, -Math.log2(target) * h - elapsedH);
}
