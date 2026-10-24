// Solana interface used by the game. ⚠ SIMULATED for now (state in localStorage, fake signatures) so the
// market UI can be built and demoed. Prices are in MOE, our real Token-2022 token on devnet (see ./moe.ts); the
// learner's MOE balance lives in the profile until transfers go on-chain. Corey: replace each function body with
// the real devnet call (Metaplex Core + SPL); keep the signatures and return shapes the same.
import type { WorldSpec } from "../worldSpec";

export const SIMULATED = true;
export const ROYALTY_BPS = 1000; // 10% to the original creator on every resale

export interface Listing {
  assetId: string;
  title: string;
  topic: string;
  subject: string; // emoji
  creator: string; // wallet address
  creatorName: string;
  price: number; // MOE
  specHash: string; // sha256 of the world file, stored in the NFT metadata
  specUri: string; // where the world file lives off-chain
  coverage: { covered: number; total: number };
  learners: number;
  avgRecallGain: number; // average lifespan/recall gain measured for players (from completion badges)
  parent?: string; // remixed from
  mintedAt: number;
}

export interface Tx {
  signature: string;
  kind:
    | "wallet" | "mint-world" | "buy-access" | "buy-membership" | "mint-badge" | "list-world" | "sell-world" | "generate"
    | "open-bounty" | "join-bounty" | "bounty-attempt" | "bounty-payout";
  summary: string;
  amount?: number;
  t: number;
}

export interface Badge {
  badgeId: string;
  worldId: string;
  title: string;
  score: number;
  t: number;
  /** set for bounty badges: bronze | silver | gold | diamond */
  tier?: string;
}

interface ChainState {
  wallet: { pubkey: string } | null;
  listings: Listing[];
  passes: string[]; // assetIds the wallet holds access passes for
  membership: { assetId: string; t: number } | null;
  badges: Badge[];
  ledger: Tx[];
}

const KEY = "eo2.chain";
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const rand = (n: number) => Array.from({ length: n }, () => B58[Math.floor(Math.random() * B58.length)]).join("");
const latency = () => new Promise((r) => setTimeout(r, 700 + Math.random() * 500));

function load(): ChainState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ChainState;
  } catch {}
  return { wallet: null, listings: [], passes: [], membership: null, badges: [], ledger: [] };
}

function save(s: ChainState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

function record(s: ChainState, tx: Omit<Tx, "signature" | "t">): string {
  const signature = rand(88);
  s.ledger.unshift({ ...tx, signature, t: Date.now() });
  return signature;
}

export function shortAddr(a: string) {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

/** The learner's built-in devnet wallet, created on first use (no seed phrases to manage). */
export function getWallet(): { pubkey: string } {
  const s = load();
  if (!s.wallet) {
    s.wallet = { pubkey: rand(44) };
    record(s, { kind: "wallet", summary: "Created your EduOasis wallet" });
    save(s);
  }
  return s.wallet;
}

/** Log an in-app MOE payment (the balance itself lives in the profile). */
export function recordMoe(kind: Tx["kind"], summary: string, amount?: number) {
  const s = load();
  const sig = record(s, { kind, summary, amount });
  save(s);
  return sig;
}

/** Seed listings (other creators' worlds) once; idempotent. */
export function seedListings(seed: Listing[]) {
  const s = load();
  const fresh = new Map(seed.map((l) => [l.assetId, l]));
  // catalog worlds already listed keep their history but take the current file hash (the sample files get updated)
  s.listings = s.listings.map((l) => {
    const f = fresh.get(l.assetId);
    return f ? { ...l, specHash: f.specHash, coverage: f.coverage, title: f.title } : l;
  });
  const have = new Set(s.listings.map((l) => l.assetId));
  s.listings.push(...seed.filter((l) => !have.has(l.assetId)));
  save(s);
}

export function listWorlds(): Listing[] {
  return load().listings;
}

export async function mintWorld(
  spec: WorldSpec,
  specHash: string,
  price: number,
  meta: { subject: string; creatorName: string; coverage: Listing["coverage"]; specUri: string; parent?: string },
): Promise<{ assetId: string; signature: string }> {
  const me = getWallet();
  const s = load();
  await latency();
  const assetId = rand(44);
  s.listings.unshift({
    assetId,
    title: spec.title,
    topic: spec.topic,
    subject: meta.subject,
    creator: me.pubkey,
    creatorName: meta.creatorName,
    price,
    specHash,
    specUri: meta.specUri,
    coverage: meta.coverage,
    learners: 0,
    avgRecallGain: 0,
    parent: meta.parent,
    mintedAt: Date.now(),
  });
  const signature = record(s, { kind: "mint-world", summary: `Minted world NFT "${spec.title}" · listed at ${price.toLocaleString("en-US")} MOE` });
  save(s);
  return { assetId, signature };
}

/** Pay for a world (the caller checks and deducts the MOE balance) and mint an access pass to the buyer. */
export async function buyAccess(assetId: string, price: number, seller?: string): Promise<string> {
  getWallet();
  const s = load();
  const l = s.listings.find((x) => x.assetId === assetId);
  if (!l) throw new Error("World not found");
  await latency();
  // one atomic transaction: pay the seller (+ royalty to the creator on a resale) and mint an access pass
  if (!s.passes.includes(assetId)) s.passes.push(assetId);
  const to = seller ? `${seller} (${ROYALTY_BPS / 100}% royalty to ${l.creatorName})` : l.creatorName;
  const sig = record(s, { kind: "buy-access", summary: `Access pass for "${l.title}" · paid to ${to}`, amount: -price });
  save(s);
  return sig;
}

export async function buyMembership(price: number): Promise<string> {
  getWallet();
  const s = load();
  await latency();
  s.membership = { assetId: rand(44), t: Date.now() };
  const sig = record(s, {
    kind: "buy-membership",
    summary: "Membership pass NFT (resellable) · fee goes to the creator pool",
    amount: -price,
  });
  save(s);
  return sig;
}

export function hasAccess(assetId: string): boolean {
  const me = getWallet();
  const s = load();
  const l = s.listings.find((x) => x.assetId === assetId);
  return !!s.membership || s.passes.includes(assetId) || l?.creator === me.pubkey;
}

export function hasMembership() {
  return !!load().membership;
}

export async function mintBadge(worldId: string, title: string, score: number): Promise<Badge> {
  getWallet();
  const s = load();
  await latency();
  const badge = { badgeId: rand(44), worldId, title, score, t: Date.now() };
  s.badges.unshift(badge);
  record(s, { kind: "mint-badge", summary: `Completion badge (non-transferable) · "${title}" · ${Math.round(score * 100)}%` });
  save(s);
  return badge;
}

/** Bounty badge for passing an island's bounty pool; its tier counts towards the learner's rank. */
export async function mintBountyBadge(worldId: string, title: string, score: number, tier: { id: string; name: string; icon: string }): Promise<Badge> {
  getWallet();
  const s = load();
  await latency();
  const badge = { badgeId: rand(44), worldId, title, score, t: Date.now(), tier: tier.id };
  s.badges.unshift(badge);
  record(s, { kind: "mint-badge", summary: `${tier.icon} ${tier.name} bounty badge (non-transferable) · "${title}" · ${Math.round(score * 100)}%` });
  save(s);
  return badge;
}

export function badges() {
  return load().badges;
}

export function ledger() {
  return load().ledger;
}

/** "reset demo": forget the wallet, passes, badges and history (catalog listings are re-seeded by the market). */
export function resetChain() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
