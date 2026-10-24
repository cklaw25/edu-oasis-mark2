// Bounty pools: a hard island becomes a shared study challenge.
//
// The owner locks a stake (others can join). The pool GROWS over time from real activity only:
// a small fee on every attempt plus a daily drip from the learning pool (Corey's 3% trading fee).
// When a learner who isn't the owner or a staker masters the island (>= 90% in one run):
//   - every staker gets their full stake back,
//   - the growth G is split: 40% solver, 50% stakers by (stake x hours staked), 10% creator.
// If nobody solves it by the deadline: stakes come back, 80% of G to stakers (time-weighted), 20% to the learning pool.
// Stakers can never lose principal and no return is promised: the bonus depends on how many attempts happen.
//
// ⚠ SIMULATED like the rest of the market (state in localStorage). Other learners' stakes and attempts are demo data,
// generated deterministically from the app clock so the "+1 day" button visibly grows the pool.
import { now } from "./clock";

export const SOLVE_ACCURACY = 0.9;
export const ATTEMPT_FEE = 100;
export const MIN_STAKE = 1_000;
export const BOUNTY_DAYS = 7;
const DAY = 86_400_000;
const HOUR = 3_600_000;

export const SPLIT_SOLVED = { solver: 0.4, stakers: 0.5, creator: 0.1 };
export const SPLIT_EXPIRED = { stakers: 0.8, learningPool: 0.2 };

export interface Position {
  who: string;
  me: boolean;
  stake: number;
  t: number;
}

export interface Payout {
  who: string;
  me: boolean;
  role: "solver" | "staker" | "creator" | "learning pool";
  principal: number;
  bonus: number;
  total: number;
}

export interface Bounty {
  id: string;
  worldId: string;
  title: string;
  icon: string;
  ownerName: string;
  ownerIsMe: boolean;
  creatorName: string;
  openedAt: number;
  deadline: number;
  positions: Position[];
  /** attempts by the player (each paid ATTEMPT_FEE) */
  myAttempts: { t: number; accuracy: number }[];
  /** demo: other learners' attempts already made when the pool was seeded, then this many per day */
  seededAttempts: number;
  attemptsPerDay: number;
  /** MOE per day from the learning pool while the bounty is open */
  dripPerDay: number;
  /** demo: best score other learners have reached so far, rising slowly per day */
  seededBest: number;
  bestPerDay: number;
  status: "open" | "solved" | "expired";
  settledAt?: number;
  solver?: { who: string; me: boolean };
  payouts?: Payout[];
}

/** End of the growth window: settlement time, the deadline, or now. */
const endTime = (b: Bounty, t: number) => b.settledAt ?? Math.min(t, b.deadline);
const daysOpen = (b: Bounty, t: number) => Math.max(0, (endTime(b, t) - b.openedAt) / DAY);

export function attemptCount(b: Bounty, t = now()) {
  return b.seededAttempts + Math.floor(b.attemptsPerDay * daysOpen(b, t)) + b.myAttempts.length;
}

export function principal(b: Bounty) {
  return b.positions.reduce((s, p) => s + p.stake, 0);
}

/** G: what the pool has earned on top of the stakes. Attempt fees + learning-pool drip, nothing else. */
export function growth(b: Bounty, t = now()) {
  return Math.round(attemptCount(b, t) * ATTEMPT_FEE + b.dripPerDay * daysOpen(b, t));
}

export function poolTotal(b: Bounty, t = now()) {
  return principal(b) + growth(b, t);
}

export function bestScore(b: Bounty, t = now()) {
  const others = Math.min(0.89, b.seededBest + b.bestPerDay * daysOpen(b, t));
  return Math.max(others, ...b.myAttempts.map((a) => a.accuracy));
}

/** Rough forecast from how fast the best score is climbing. An estimate for stakers, not a promise. */
export function predictedSolveDays(b: Bounty, t = now()): number | null {
  if (b.status !== "open") return null;
  const gap = SOLVE_ACCURACY - bestScore(b, t);
  if (gap <= 0) return 0;
  return b.bestPerDay > 0 ? Math.round((gap / b.bestPerDay) * 10) / 10 : null;
}

/** Each staker's weight = stake x hours staked (until settlement / deadline / now). */
function weights(b: Bounty, t: number) {
  const end = endTime(b, t);
  const w = b.positions.map((p) => p.stake * Math.max(0, (end - p.t) / HOUR));
  const sum = w.reduce((s, x) => s + x, 0);
  return { w, sum };
}

/** Split `amount` across stakers by weight, in whole MOE, giving any rounding remainder to the largest weight. */
function splitByWeight(b: Bounty, amount: number, t: number): number[] {
  const { w, sum } = weights(b, t);
  if (!b.positions.length) return [];
  const shares = w.map((x) => (sum > 0 ? Math.floor((amount * x) / sum) : Math.floor(amount / w.length)));
  const rest = amount - shares.reduce((s, x) => s + x, 0);
  const top = w.indexOf(Math.max(...w));
  shares[top] += rest;
  return shares;
}

/** What everyone would get if it were solved right now (for the "if solved now" preview). */
export function previewSolve(b: Bounty, t = now(), solver = { who: "Solver", me: false }): Payout[] {
  const g = growth(b, t);
  const solverPrize = Math.floor(g * SPLIT_SOLVED.solver);
  const creatorCut = Math.floor(g * SPLIT_SOLVED.creator);
  const stakerPool = g - solverPrize - creatorCut; // the 50%, plus rounding dust
  const shares = splitByWeight(b, stakerPool, t);
  return [
    { who: solver.who, me: solver.me, role: "solver", principal: 0, bonus: solverPrize, total: solverPrize },
    ...b.positions.map((p, i) => ({ who: p.who, me: p.me, role: "staker" as const, principal: p.stake, bonus: shares[i], total: p.stake + shares[i] })),
    { who: b.creatorName, me: false, role: "creator", principal: 0, bonus: creatorCut, total: creatorCut },
  ];
}

function previewExpire(b: Bounty, t: number): Payout[] {
  const g = growth(b, t);
  const toPool = Math.floor(g * SPLIT_EXPIRED.learningPool);
  const shares = splitByWeight(b, g - toPool, t);
  return [
    ...b.positions.map((p, i) => ({ who: p.who, me: p.me, role: "staker" as const, principal: p.stake, bonus: shares[i], total: p.stake + shares[i] })),
    { who: "Learning pool", me: false, role: "learning pool", principal: 0, bonus: toPool, total: toPool },
  ];
}

/** MOE that settlement pays to the player (their stakes back + bonuses + any solver prize). */
export const myTake = (payouts: Payout[]) => payouts.filter((p) => p.me).reduce((s, p) => s + p.total, 0);

// ---------------------------------------------------------------------------------------------------------------
// Storage + actions (simulated, same shape the on-chain escrow program would have)

const KEY = "eo2.bounties";

function seed(t: number): Bounty[] {
  const h = (n: number) => t - n * HOUR;
  return [
    {
      id: "bounty-milgram",
      worldId: "market-milgram",
      title: "Milgram (1963) Obedience",
      icon: "⚡",
      ownerName: "ana.studies",
      ownerIsMe: false,
      creatorName: "psych_with_priya",
      openedAt: h(96),
      deadline: h(96) + BOUNTY_DAYS * DAY,
      positions: [
        { who: "ana.studies", me: false, stake: 5_000, t: h(96) },
        { who: "ben_revises", me: false, stake: 2_000, t: h(48) },
      ],
      myAttempts: [],
      seededAttempts: 12,
      attemptsPerDay: 5,
      dripPerDay: 100,
      seededBest: 0.71,
      bestPerDay: 0.03,
      status: "open",
    },
    {
      id: "bounty-ww1",
      worldId: "market-ww1",
      title: "Causes of World War One",
      icon: "⚔️",
      ownerName: "historyhannah",
      ownerIsMe: false,
      creatorName: "historyhannah",
      openedAt: h(30),
      deadline: h(30) + BOUNTY_DAYS * DAY,
      positions: [{ who: "historyhannah", me: false, stake: 3_000, t: h(30) }],
      myAttempts: [],
      seededAttempts: 4,
      attemptsPerDay: 4,
      dripPerDay: 60,
      seededBest: 0.64,
      bestPerDay: 0.04,
      status: "open",
    },
  ];
}

export function loadBounties(t = now()): Bounty[] {
  let list: Bounty[] | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) list = JSON.parse(raw) as Bounty[];
  } catch {}
  if (!list) {
    list = seed(t);
    saveBounties(list);
  }
  // deadlines pass while nobody is looking: settle them lazily
  let changed = false;
  for (const b of list)
    if (b.status === "open" && t >= b.deadline) {
      b.payouts = previewExpire(b, t);
      b.status = "expired";
      b.settledAt = b.deadline;
      changed = true;
    }
  if (changed) saveBounties(list);
  return list;
}

function saveBounties(list: Bounty[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

function mutate<T>(id: string, fn: (b: Bounty, all: Bounty[]) => T): T {
  const all = loadBounties();
  const b = all.find((x) => x.id === id);
  if (!b) throw new Error("Bounty not found");
  const out = fn(b, all);
  saveBounties(all);
  return out;
}

export const bountyFor = (worldId: string, t = now()) => loadBounties(t).find((b) => b.worldId === worldId && b.status === "open") ?? null;
export const isStaker = (b: Bounty) => b.positions.some((p) => p.me);

/** Owner locks a stake on one of their islands. Returns the MOE to deduct from the player. */
export function openBounty(world: { id: string; title: string; icon: string; creatorName: string }, stake: number, myName: string): Bounty {
  if (stake < MIN_STAKE) throw new Error(`The minimum stake is ${MIN_STAKE.toLocaleString("en-US")} MOE`);
  const t = now();
  const all = loadBounties(t);
  if (all.some((b) => b.worldId === world.id && b.status === "open")) throw new Error("This island already has an open bounty");
  const b: Bounty = {
    id: `bounty-${world.id}-${t}`,
    worldId: world.id,
    title: world.title,
    icon: world.icon,
    ownerName: myName,
    ownerIsMe: true,
    creatorName: world.creatorName,
    openedAt: t,
    deadline: t + BOUNTY_DAYS * DAY,
    positions: [{ who: myName, me: true, stake, t }],
    myAttempts: [],
    seededAttempts: 0,
    attemptsPerDay: 3, // demo: other learners start trying it
    dripPerDay: 50,
    seededBest: 0.55,
    bestPerDay: 0.05,
    status: "open",
  };
  all.unshift(b);
  saveBounties(all);
  return b;
}

/** Anyone can add MOE to an open pool (not the solver, so stakers can't solve their own bounty). */
export function joinBounty(id: string, stake: number, myName: string) {
  if (stake < MIN_STAKE) throw new Error(`The minimum stake is ${MIN_STAKE.toLocaleString("en-US")} MOE`);
  return mutate(id, (b) => {
    if (b.status !== "open") throw new Error("This bounty is closed");
    b.positions.push({ who: myName, me: true, stake, t: now() });
    return b;
  });
}

/**
 * A finished run on an island with an open bounty. Owners and stakers can't attempt their own bounty.
 * Returns the MOE change for the player: -ATTEMPT_FEE, plus their payout if this run solved it.
 */
export function recordRun(worldId: string, accuracy: number, myName: string): { bounty: Bounty; delta: number; solved: boolean } | null {
  const open = bountyFor(worldId);
  if (!open || open.ownerIsMe || isStaker(open)) return null;
  return mutate(open.id, (b) => {
    const t = now();
    b.myAttempts.push({ t, accuracy });
    if (accuracy < SOLVE_ACCURACY) return { bounty: b, delta: -ATTEMPT_FEE, solved: false };
    b.payouts = previewSolve(b, t, { who: myName, me: true });
    b.status = "solved";
    b.settledAt = t;
    b.solver = { who: myName, me: true };
    return { bounty: b, delta: -ATTEMPT_FEE + myTake(b.payouts), solved: true };
  });
}

/** Demo control: another learner masters an island you staked on. Returns your MOE back + bonus. */
export function simulateOtherSolver(id: string): { bounty: Bounty; delta: number } {
  return mutate(id, (b) => {
    if (b.status !== "open") throw new Error("This bounty is closed");
    const t = now();
    b.payouts = previewSolve(b, t, { who: "maya_learns", me: false });
    b.status = "solved";
    b.settledAt = t;
    b.solver = { who: "maya_learns", me: false };
    return { bounty: b, delta: myTake(b.payouts) };
  });
}

export function resetBounties() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
