// Solana interface used by the game. ⚠ SIMULATED for now (state in localStorage, fake signatures) so the
// market UI can be built and demoed. Corey: replace each function body with the real devnet call
// (wallet adapter + Metaplex Core + SPL); keep the signatures and return shapes the same.
import type { WorldSpec } from "../worldSpec";

export const SIMULATED = true;
export const ROYALTY_BPS = 1000; // 10% to the original creator on every resale
export const MEMBERSHIP_PRICE = 0.2;

export interface Listing {
  assetId: string;
  title: string;
  topic: string;
  subject: string; // emoji
  creator: string; // wallet address
  creatorName: string;
  price: number; // SOL
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
  kind: "airdrop" | "mint-world" | "buy-access" | "buy-membership" | "mint-badge";
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
}

interface ChainState {
  wallet: { pubkey: string; sol: number } | null;
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

export function getWallet() {
  return load().wallet;
}

export async function connectWallet(): Promise<string> {
  await latency();
  const s = load();
  if (!s.wallet) {
    s.wallet = { pubkey: rand(44), sol: 2 };
    record(s, { kind: "airdrop", summary: "Devnet airdrop", amount: 2 });
  }
  save(s);
  return s.wallet.pubkey;
}

export function disconnectWallet() {
  const s = load();
  s.wallet = null;
  save(s);
}

/** Seed listings (other creators' worlds) once; idempotent. */
export function seedListings(seed: Listing[]) {
  const s = load();
  const have = new Set(s.listings.map((l) => l.assetId));
  const add = seed.filter((l) => !have.has(l.assetId));
  if (add.length) {
    s.listings.push(...add);
    save(s);
  }
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
  const s = load();
  if (!s.wallet) throw new Error("Connect a wallet first");
  await latency();
  const assetId = rand(44);
  s.listings.unshift({
    assetId,
    title: spec.title,
    topic: spec.topic,
    subject: meta.subject,
    creator: s.wallet.pubkey,
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
  const signature = record(s, { kind: "mint-world", summary: `Minted world NFT "${spec.title}"` });
  save(s);
  return { assetId, signature };
}

export async function buyAccess(assetId: string): Promise<string> {
  const s = load();
  if (!s.wallet) throw new Error("Connect a wallet first");
  const l = s.listings.find((x) => x.assetId === assetId);
  if (!l) throw new Error("World not found");
  if (s.wallet.sol < l.price) throw new Error("Not enough SOL");
  await latency();
  // one atomic transaction: pay the creator + mint an access pass to the buyer
  s.wallet.sol = +(s.wallet.sol - l.price).toFixed(4);
  s.passes.push(assetId);
  const sig = record(s, {
    kind: "buy-access",
    summary: `Access pass for "${l.title}" · ◎${l.price} paid to ${l.creatorName}`,
    amount: -l.price,
  });
  save(s);
  return sig;
}

export async function buyMembership(): Promise<string> {
  const s = load();
  if (!s.wallet) throw new Error("Connect a wallet first");
  if (s.wallet.sol < MEMBERSHIP_PRICE) throw new Error("Not enough SOL");
  await latency();
  s.wallet.sol = +(s.wallet.sol - MEMBERSHIP_PRICE).toFixed(4);
  s.membership = { assetId: rand(44), t: Date.now() };
  const sig = record(s, {
    kind: "buy-membership",
    summary: "Membership pass NFT (resellable) · fee goes to the creator pool",
    amount: -MEMBERSHIP_PRICE,
  });
  save(s);
  return sig;
}

export function hasAccess(assetId: string): boolean {
  const s = load();
  if (!s.wallet) return false;
  const l = s.listings.find((x) => x.assetId === assetId);
  return !!s.membership || s.passes.includes(assetId) || l?.creator === s.wallet.pubkey;
}

export function hasMembership() {
  return !!load().membership;
}

export async function mintBadge(worldId: string, title: string, score: number): Promise<Badge | null> {
  const s = load();
  if (!s.wallet) return null;
  await latency();
  const badge = { badgeId: rand(44), worldId, title, score, t: Date.now() };
  s.badges.unshift(badge);
  record(s, { kind: "mint-badge", summary: `Completion badge (non-transferable) · "${title}" · ${Math.round(score * 100)}%` });
  save(s);
  return badge;
}

export function badges() {
  return load().badges;
}

export function ledger() {
  return load().ledger;
}
