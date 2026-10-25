import { PublicKey } from "@solana/web3.js";
import { getMoeBalance } from "@/lib/solana/moe";
import { STARTER_MOE, buildTransfer, ensureFeeSol, explorerTx, fundStarter, submitSigned, treasury } from "@/lib/solana/devnet";

export const runtime = "nodejs";

const key = (s: unknown) => {
  try {
    return new PublicKey(String(s));
  } catch {
    return null;
  }
};

// POST /api/solana/transfer
//   { action: "fund", owner }                 -> treasury sends the starter MOE (once per wallet)
//   { action: "build", from, to, amount, memo } -> unsigned transfer (base64) for the browser to sign
//   { action: "submit", tx }                   -> sends the signed transaction, returns its signature
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === "fund") {
      const owner = key(body.owner);
      if (!owner) return Response.json({ error: "Not a valid Solana address" }, { status: 400 });
      if (!treasury()) return Response.json({ error: "This server has no treasury key, so it can't hand out starter MOE" }, { status: 503 });
      // one starter pack per wallet: skip wallets that already hold MOE
      if (Number(await getMoeBalance(owner)) > 0) return Response.json({ error: "This wallet already has MOE" }, { status: 409 });
      const signature = await fundStarter(owner);
      return Response.json({ signature, explorer: explorerTx(signature), amount: STARTER_MOE });
    }
    if (body.action === "build") {
      const from = key(body.from);
      const to = key(body.to);
      const amount = Number(body.amount);
      if (!from || !to) return Response.json({ error: "Not a valid Solana address" }, { status: 400 });
      if (from.equals(to)) return Response.json({ error: "That's your own address" }, { status: 400 });
      if (!(amount > 0)) return Response.json({ error: "Enter an amount above 0" }, { status: 400 });
      if (Number(await getMoeBalance(from)) < amount) return Response.json({ error: "Not enough MOE in this wallet" }, { status: 400 });
      await ensureFeeSol(from); // e.g. a wallet that received MOE but never claimed the starter pack
      return Response.json({ tx: await buildTransfer(from, to, amount, typeof body.memo === "string" ? body.memo : undefined) });
    }
    if (body.action === "submit") {
      if (typeof body.tx !== "string") return Response.json({ error: "Missing transaction" }, { status: 400 });
      const signature = await submitSigned(body.tx);
      return Response.json({ signature, explorer: explorerTx(signature) });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("solana transfer failed", e);
    return Response.json({ error: e instanceof Error ? e.message : "Solana transaction failed" }, { status: 502 });
  }
}
