// Server-only: real MOE transactions on devnet. The treasury key comes from TREASURY_SECRET_KEY in .env.local
// (a JSON byte array, as in Corey's treasury.json) and must never be committed or sent to the browser.
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { MOE_MINT, connection } from "./moe";

export const MOE_DECIMALS = 9;
export const STARTER_MOE = 30_000;
const STARTER_SOL = 0.02; // pays the player's network fees for many transfers
const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export function treasury(): Keypair | null {
  const raw = process.env.TREASURY_SECRET_KEY;
  if (!raw) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    return null;
  }
}

const units = (moe: number) => BigInt(Math.round(moe * 100)) * BigInt(10) ** BigInt(MOE_DECIMALS - 2);
const ata = (owner: PublicKey) => getAssociatedTokenAddressSync(MOE_MINT, owner, true, TOKEN_2022_PROGRAM_ID);

/** Instructions to move `amount` MOE from one wallet to another (creates the receiver's MOE account if needed). */
function moeTransfer(from: PublicKey, to: PublicKey, amount: number, payer: PublicKey, memo?: string) {
  const ix: TransactionInstruction[] = [
    createAssociatedTokenAccountIdempotentInstruction(payer, ata(to), to, MOE_MINT, TOKEN_2022_PROGRAM_ID),
    createTransferCheckedInstruction(ata(from), MOE_MINT, ata(to), from, units(amount), MOE_DECIMALS, [], TOKEN_2022_PROGRAM_ID),
  ];
  if (memo) ix.push(new TransactionInstruction({ programId: MEMO_PROGRAM, keys: [], data: Buffer.from(memo.slice(0, 200), "utf8") }));
  return ix;
}

/** Starter pack for a new demo wallet: 30,000 MOE + a little SOL for fees, paid by the treasury. */
export async function fundStarter(owner: PublicKey): Promise<string> {
  const t = treasury();
  if (!t) throw new Error("TREASURY_SECRET_KEY is not set on this server");
  const conn = connection();
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: t.publicKey, toPubkey: owner, lamports: Math.round(STARTER_SOL * LAMPORTS_PER_SOL) }),
    ...moeTransfer(t.publicKey, owner, STARTER_MOE, t.publicKey, "EduOasis starter MOE"),
  );
  return conn.sendTransaction(tx, [t], { preflightCommitment: "confirmed" }).then(async (sig) => {
    await conn.confirmTransaction(sig, "confirmed");
    return sig;
  });
}

/** Wallets that only ever received MOE have no SOL for fees: top them up from the treasury (devnet play money). */
export async function ensureFeeSol(owner: PublicKey): Promise<void> {
  const conn = connection();
  if ((await conn.getBalance(owner, "confirmed")) >= 0.005 * LAMPORTS_PER_SOL) return;
  const t = treasury();
  if (!t) throw new Error("This wallet has no SOL for fees and the server has no treasury key to top it up");
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: t.publicKey, toPubkey: owner, lamports: Math.round(0.01 * LAMPORTS_PER_SOL) }),
  );
  const sig = await conn.sendTransaction(tx, [t], { preflightCommitment: "confirmed" });
  await conn.confirmTransaction(sig, "confirmed");
}

/** An unsigned transfer the player's browser signs (the sender pays its own fee). */
export async function buildTransfer(from: PublicKey, to: PublicKey, amount: number, memo?: string): Promise<string> {
  const conn = connection();
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: from, recentBlockhash: blockhash }).add(...moeTransfer(from, to, amount, from, memo));
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

export async function submitSigned(b64: string): Promise<string> {
  const conn = connection();
  const sig = await conn.sendRawTransaction(Buffer.from(b64, "base64"), { preflightCommitment: "confirmed" });
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}

export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
