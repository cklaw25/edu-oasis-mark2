// Server-side reads of the MOE (Moe Done) Token-2022 mint on devnet.
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getTokenMetadata,
  TokenAccountNotFoundError,
} from "@solana/spl-token";

export const MOE_MINT = new PublicKey(process.env.MOE_MINT || "4BDLBADE7SE8wGc7d3X7BJL9TsNo5SQJ27GKHEbbCxGk");

export function connection() {
  return new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl("devnet"), "confirmed");
}

export type MoeInfo = {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  mintAuthority: string | null;
  explorer: string;
};

export async function getMoeInfo(conn = connection()): Promise<MoeInfo> {
  const [mint, metadata] = await Promise.all([
    getMint(conn, MOE_MINT, "confirmed", TOKEN_2022_PROGRAM_ID),
    getTokenMetadata(conn, MOE_MINT, "confirmed", TOKEN_2022_PROGRAM_ID),
  ]);
  return {
    mint: MOE_MINT.toBase58(),
    name: metadata?.name ?? "",
    symbol: metadata?.symbol ?? "",
    decimals: mint.decimals,
    supply: toUi(mint.supply, mint.decimals),
    mintAuthority: mint.mintAuthority?.toBase58() ?? null,
    explorer: `https://explorer.solana.com/address/${MOE_MINT.toBase58()}?cluster=devnet`,
  };
}

// MOE held by a wallet, in whole tokens ("0" if it has no MOE account yet).
export async function getMoeBalance(owner: PublicKey, conn = connection()): Promise<string> {
  const mint = await getMint(conn, MOE_MINT, "confirmed", TOKEN_2022_PROGRAM_ID);
  const ata = getAssociatedTokenAddressSync(MOE_MINT, owner, true, TOKEN_2022_PROGRAM_ID);
  try {
    const account = await getAccount(conn, ata, "confirmed", TOKEN_2022_PROGRAM_ID);
    return toUi(account.amount, mint.decimals);
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) return "0";
    throw e;
  }
}

function toUi(amount: bigint, decimals: number) {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = amount / base;
  const frac = (amount % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}
