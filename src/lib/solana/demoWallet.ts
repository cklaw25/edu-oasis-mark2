// Client-side demo wallet for devnet: a keypair kept in this browser, so learners never handle seed phrases.
// Devnet only (play money). A real launch would use a proper wallet (Phantom, or an embedded-wallet service).
const KEY = "eo2.demoWallet";
export const PUB_KEY = "eo2.demoWallet.pub"; // read synchronously by the simulated market (src/lib/solana/index.ts)

export interface SentTx {
  signature: string;
  explorer: string;
  summary: string;
  t: number;
}

const web3 = () => import("@solana/web3.js");

async function keypair() {
  const { Keypair } = await web3();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {}
  const kp = Keypair.generate();
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(kp.secretKey)));
  } catch {}
  return kp;
}

export async function demoAddress() {
  const pub = (await keypair()).publicKey.toBase58();
  try {
    localStorage.setItem(PUB_KEY, pub);
  } catch {}
  return pub;
}

async function post<T>(body: object): Promise<T> {
  const res = await fetch("/api/solana/transfer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Solana request failed");
  return json as T;
}

/** On-chain MOE balance of this browser's wallet. */
export async function demoBalance(): Promise<number> {
  const res = await fetch(`/api/solana/moe?owner=${await demoAddress()}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Couldn't read the balance");
  return Number(json.balance);
}

/** Ask the server's treasury for the starter MOE. */
export async function claimStarter(): Promise<SentTx> {
  const r = await post<{ signature: string; explorer: string; amount: number }>({ action: "fund", owner: await demoAddress() });
  // the in-game balance already starts with the starter MOE, so the claim must not be added again
  try {
    const raw = localStorage.getItem(SYNC);
    if (raw !== null) localStorage.setItem(SYNC, String(Number(raw) + r.amount));
  } catch {}
  return remember({ signature: r.signature, explorer: r.explorer, summary: `Starter pack: +${r.amount.toLocaleString("en-US")} MOE from the treasury`, t: Date.now() });
}

/** Send MOE to another wallet: the server builds the transaction, this browser signs it, the server submits it. */
export async function sendMoe(to: string, amount: number, memo?: string): Promise<SentTx> {
  const { Transaction } = await web3();
  const kp = await keypair();
  const { tx } = await post<{ tx: string }>({ action: "build", from: kp.publicKey.toBase58(), to, amount, memo });
  const t = Transaction.from(Uint8Array.from(atob(tx), (c) => c.charCodeAt(0)));
  t.partialSign(kp);
  const signed = btoa(String.fromCharCode(...t.serialize()));
  const r = await post<{ signature: string; explorer: string }>({ action: "submit", tx: signed });
  await new Promise((ok) => setTimeout(ok, 1500)); // let the RPC node catch up before the balance is re-read
  return remember({ signature: r.signature, explorer: r.explorer, summary: `Sent ${amount.toLocaleString("en-US")} MOE to ${to.slice(0, 4)}…${to.slice(-4)}`, t: Date.now() });
}

const LOG = "eo2.demoWallet.log";
const SYNC = "eo2.demoWallet.synced"; // last on-chain balance already reflected in the in-game balance
const STARTER = 30_000; // matches STARTER_MOE in devnet.ts

/** Change in on-chain MOE since the last read that the in-game balance hasn't picked up yet (sends and receives). */
export function chainDelta(balance: number): number {
  try {
    const raw = localStorage.getItem(SYNC);
    const claimed = sentLog().some((t) => t.summary.startsWith("Starter pack"));
    const last = raw === null ? (claimed ? STARTER : 0) : Number(raw);
    localStorage.setItem(SYNC, String(balance));
    return Number.isFinite(last) ? balance - last : 0;
  } catch {
    return 0;
  }
}

function remember(tx: SentTx) {
  try {
    localStorage.setItem(LOG, JSON.stringify([tx, ...sentLog()].slice(0, 30)));
  } catch {}
  return tx;
}

export function sentLog(): SentTx[] {
  try {
    return JSON.parse(localStorage.getItem(LOG) ?? "[]") as SentTx[];
  } catch {
    return [];
  }
}
