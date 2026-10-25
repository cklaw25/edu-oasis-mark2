// Bounty pools: a hard island becomes a shared study challenge.
//
// The owner locks a stake (others can join). The pool GROWS over time from existing MOE only:
// attempt fees (90 of each 100 MOE fee; the other 10 are burned) plus a daily drip from the learning pool.
// The first learner who isn't the owner or a staker to PASS the island (>= 60% in one run) settles it:
//   - every staker gets their full stake back,
//   - the growth G is split: 45% stakers by (stake x hours staked), 5% creator, up to 40% solver,
//     and the rest is burned (10% always, plus whatever the solver's score tier doesn't claim).
//   - the solver's share scales with the score: Bronze 60%+ (40% of the solver share), Silver 75%+ (65%),
//     Gold 90%+ (85%), Diamond 100% (all of it). The solver also earns a tiered bounty badge, which counts towards their rank.
// If nobody passes by the deadline: stakes come back, 70% of G to stakers (time-weighted), 30% burned.
//
// Anti-inflation: bounties never create MOE. Every payout comes from MOE that already exists (stakes, fees,
// the learning pool), and every settlement burns some, so the more bounties are played the scarcer MOE gets.
// Stakers can never lose principal and no return is promised: the bonus depends on how many attempts happen.
//
// ⚠ SIMULATED like the rest of the market (state in localStorage). Other learners' stakes and attempts are demo data,
// generated deterministically from the app clock so the "+1 day" button visibly grows the pool.
import { now } from "./clock";

export const PASS_SCORE = 0.6;
/** @deprecated use PASS_SCORE */
export const SOLVE_ACCURACY = PASS_SCORE;
export const ATTEMPT_FEE = 100;
/** part of every attempt fee that is burned instead of going into the pool */
export const ATTEMPT_BURN = 10;
export const MIN_STAKE = 1_000;
export const BOUNTY_DAYS = 7;
const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Shares of the growth G when someone passes. The solver share is multiplied by their tier; the rest is burned. */
export const SPLIT_SOLVED = { solver: 0.4, stakers: 0.45, creator: 0.05, burn: 0.1 };
export const SPLIT_EXPIRED = { stakers: 0.7, burn: 0.3 };

export interface Tier {
  id: "bronze" | "silver" | "gold" | "diamond";
  name: string;
  icon: string;
  /** lowest score for this tier */
  min: number;
  /** fraction of the solver share paid out (the rest is burned) */
  mult: number;
  /** rank points for the badge */
  points: number;
}

/** Best tier first. */
export const TIERS: Tier[] = [
  { id: "diamond", name: "Diamond", icon: "💎", min: 1, mult: 1, points: 5 },
  { id: "gold", name: "Gold", icon: "🥇", min: 0.9, mult: 0.85, points: 3 },
  { id: "silver", name: "Silver", icon: "🥈", min: 0.75, mult: 0.65, points: 2 },
  { id: "bronze", name: "Bronze", icon: "🥉", min: PASS_SCORE, mult: 0.4, points: 1 },
];

export const tierFor = (score: number): Tier | null => TIERS.find((t) => score >= t.min - 1e-9) ?? null;
export const tierById = (id: string | undefined) => TIERS.find((t) => t.id === id) ?? null;

export interface Position {
  who: string;
  me: boolean;
  stake: number;
  t: number;
}

export interface Payout {
  who: string;
  me: boolean;
  role: "solver" | "staker" | "creator" | "burned";
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
  /** demo: best score other learners have reached so far, rising slowly per day (stays under the pass mark) */
  seededBest: number;
  bestPerDay: number;
  status: "open" | "solved" | "expired";
  settledAt?: number;
  solver?: { who: string; me: boolean; score: number; tier: Tier["id"] };
  payouts?: Payout[];
  burned?: number;
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

/** G: what the pool has earned on top of the stakes. Attempt fees (minus the burn) + learning-pool drip, nothing else. */
export function growth(b: Bounty, t = now()) {
  return Math.round(attemptCount(b, t) * (ATTEMPT_FEE - ATTEMPT_BURN) + b.dripPerDay * daysOpen(b, t));
}

export function poolTotal(b: Bounty, t = now()) {
  return principal(b) + growth(b, t);
}

export function bestScore(b: Bounty, t = now()) {
  const others = Math.min(PASS_SCORE - 0.01, b.seededBest + b.bestPerDay * daysOpen(b, t));
  return Math.max(others, ...b.myAttempts.map((a) => a.accuracy));
}

/** Rough forecast from how fast the best score is climbing. An estimate for stakers, not a promise. */
export function predictedSolveDays(b: Bounty, t = now()): number | null {
  if (b.status !== "open") return null;
  const gap = PASS_SCORE - bestScore(b, t);
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

/** Solver prize for a score right now (0 below the pass mark). */
export function solverPrize(b: Bounty, score: number, t = now()) {
  const tier = tierFor(score);
  return tier ? Math.floor(growth(b, t) * SPLIT_SOLVED.solver * tier.mult) : 0;
}

/** What everyone would get if someone passed with `score` right now. Conserves G exactly (solver + stakers + creator + burn). */
export function previewSolve(b: Bounty, t = now(), solver = { who: "Solver", me: false }, score = 0.9): Payout[] {
  const g = growth(b, t);
  const prize = solverPrize(b, score, t);
  const creatorCut = Math.floor(g * SPLIT_SOLVED.creator);
  const stakerPool = Math.floor(g * SPLIT_SOLVED.stakers);
  const burned = g - prize - creatorCut - stakerPool; // 10% + unclaimed solver share + rounding dust
  const shares = splitByWeight(b, stakerPool, t);
  return [
    { who: solver.who, me: solver.me, role: "solver", principal: 0, bonus: prize, total: prize },
    ...b.positions.map((p, i) => ({ who: p.who, me: p.me, role: "staker" as const, principal: p.stake, bonus: shares[i], total: p.stake + shares[i] })),
    { who: b.creatorName, me: false, role: "creator", principal: 0, bonus: creatorCut, total: creatorCut },
    { who: "🔥 Burned", me: false, role: "burned", principal: 0, bonus: burned, total: burned },
  ];
}

function previewExpire(b: Bounty, t: number): Payout[] {
  const g = growth(b, t);
  const stakerPool = Math.floor(g * SPLIT_EXPIRED.stakers);
  const shares = splitByWeight(b, stakerPool, t);
  return [
    ...b.positions.map((p, i) => ({ who: p.who, me: p.me, role: "staker" as const, principal: p.stake, bonus: shares[i], total: p.stake + shares[i] })),
    { who: "🔥 Burned", me: false, role: "burned", principal: 0, bonus: g - stakerPool, total: g - stakerPool },
  ];
}

/** MOE that settlement pays to the player (their stakes back + bonuses + any solver prize). */
export const myTake = (payouts: Payout[]) => payouts.filter((p) => p.me).reduce((s, p) => s + p.total, 0);
const burnedIn = (payouts: Payout[]) => payouts.filter((p) => p.role === "burned").reduce((s, p) => s + p.total, 0);

// ---------------------------------------------------------------------------------------------------------------
// MOE burned by bounties (simulated; on-chain this is a Token-2022 burn, which lowers total supply for good)

const BURN_KEY = "eo2.moe.burned";

export function totalBurned(): number {
  try {
    return Number(localStorage.getItem(BURN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function addBurn(n: number) {
  if (n <= 0) return;
  try {
    localStorage.setItem(BURN_KEY, String(totalBurned() + n));
  } catch {}
}

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
      seededBest: 0.46,
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
      seededBest: 0.41,
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
      b.burned = burnedIn(b.payouts);
      addBurn(b.burned);
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
  if (all.some((b) => b.worldId === world.id && b.status === "open")) throw new Error("This Kata already has an open bounty");
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
    seededBest: 0.35,
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

export interface RunResult {
  bounty: Bounty;
  /** MOE change for the player: -ATTEMPT_FEE, plus their payout if this run passed */
  delta: number;
  solved: boolean;
  tier: Tier | null;
  prize: number;
  burned: number;
}

/**
 * A finished run on an island with an open bounty. Owners and stakers can't attempt their own bounty.
 * A run at PASS_SCORE or better settles it; the score's tier decides how much of the solver share is paid out.
 */
export function recordRun(worldId: string, accuracy: number, myName: string): RunResult | null {
  const open = bountyFor(worldId);
  if (!open || open.ownerIsMe || isStaker(open)) return null;
  return mutate(open.id, (b) => {
    const t = now();
    b.myAttempts.push({ t, accuracy });
    addBurn(ATTEMPT_BURN);
    const tier = tierFor(accuracy);
    if (!tier) return { bounty: b, delta: -ATTEMPT_FEE, solved: false, tier: null, prize: 0, burned: ATTEMPT_BURN };
    b.payouts = previewSolve(b, t, { who: myName, me: true }, accuracy);
    b.burned = burnedIn(b.payouts);
    addBurn(b.burned);
    b.status = "solved";
    b.settledAt = t;
    b.solver = { who: myName, me: true, score: accuracy, tier: tier.id };
    const prize = b.payouts.find((p) => p.role === "solver")?.total ?? 0;
    return { bounty: b, delta: -ATTEMPT_FEE + myTake(b.payouts), solved: true, tier, prize, burned: b.burned + ATTEMPT_BURN };
  });
}

/** Demo control: another learner passes an island you staked on (with a Silver score). Returns your MOE back + bonus. */
export function simulateOtherSolver(id: string, score = 0.78): { bounty: Bounty; delta: number } {
  return mutate(id, (b) => {
    if (b.status !== "open") throw new Error("This bounty is closed");
    const t = now();
    b.payouts = previewSolve(b, t, { who: "maya_learns", me: false }, score);
    b.burned = burnedIn(b.payouts);
    addBurn(b.burned);
    b.status = "solved";
    b.settledAt = t;
    b.solver = { who: "maya_learns", me: false, score, tier: tierFor(score)?.id ?? "bronze" };
    return { bounty: b, delta: myTake(b.payouts) };
  });
}

export function resetBounties() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BURN_KEY);
  } catch {}
}

// ---------------------------------------------------------------------------------------------------------------
// Ranks: every bounty you pass mints a tiered badge; badge points add up to a rank.

export const RANKS = [
  { name: "Learner", icon: "🌱", min: 0 },
  { name: "Challenger", icon: "⚔️", min: 1 },
  { name: "Scholar", icon: "📜", min: 4 },
  { name: "Expert", icon: "🎓", min: 8 },
  { name: "Master", icon: "👑", min: 15 },
];

export function rankFor(points: number) {
  let i = 0;
  while (i + 1 < RANKS.length && points >= RANKS[i + 1].min) i++;
  return { ...RANKS[i], points, next: RANKS[i + 1] ?? null };
}

export const pointsFor = (tierIds: (string | undefined)[]) => tierIds.reduce((s, id) => s + (tierById(id)?.points ?? 0), 0);

/** Demo rivals for the leaderboard. */
export const RIVALS = [
  { name: "maya_learns", points: 9 },
  { name: "ana.studies", points: 5 },
  { name: "ben_revises", points: 3 },
  { name: "historyhannah", points: 2 },
];
