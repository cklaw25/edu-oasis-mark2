import { PublicKey } from "@solana/web3.js";
import { getMoeBalance, getMoeInfo } from "@/lib/solana/moe";

export const runtime = "nodejs";

// GET /api/solana/moe            -> MOE token info
// GET /api/solana/moe?owner=<pk> -> token info + that wallet's MOE balance
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  let ownerKey: PublicKey | null = null;
  if (owner) {
    try {
      ownerKey = new PublicKey(owner);
    } catch {
      return Response.json({ error: "owner is not a valid Solana address" }, { status: 400 });
    }
  }

  try {
    const info = await getMoeInfo();
    if (!ownerKey) return Response.json(info);
    return Response.json({ ...info, owner: ownerKey.toBase58(), balance: await getMoeBalance(ownerKey) });
  } catch (e) {
    console.error("moe lookup failed", e);
    return Response.json({ error: e instanceof Error ? e.message : "Solana lookup failed" }, { status: 502 });
  }
}
