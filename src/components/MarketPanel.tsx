"use client";

import { useCallback, useEffect, useState } from "react";
import { CATALOG } from "@/content/catalog";
import { sha256Json } from "@/lib/hash";
import { now } from "@/lib/clock";
import * as chain from "@/lib/solana";
import type { Listing } from "@/lib/solana";
import type { Profile, WorldSummary } from "@/lib/types";
import { loadSpec, saveSpec } from "@/lib/worldStore";
import { coverage, type WorldSpec } from "@/lib/worldSpec";

type Tab = "explore" | "sell" | "membership" | "wallet";

const TABS: { id: Tab; label: string }[] = [
  { id: "explore", label: "Explore worlds" },
  { id: "sell", label: "Sell my worlds" },
  { id: "membership", label: "Membership" },
  { id: "wallet", label: "Wallet & history" },
];

const marketWorldId = (assetId: string) => `market-${assetId.slice(0, 12)}`;

/** Fetch a listing's world file from off-chain storage (catalog bundle or this device for now). */
function fetchSpec(l: Listing): WorldSpec | null {
  const fromCatalog = CATALOG.find((c) => c.assetId === l.assetId)?.spec;
  if (fromCatalog) return fromCatalog;
  return l.specUri.startsWith("local:") ? loadSpec(l.specUri.slice(6)) : null;
}

export default function MarketPanel({
  profile,
  onProfile,
  onClose,
}: {
  profile: Profile;
  onProfile: (p: Profile) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("explore");
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const refresh = () => setTick((n) => n + 1);

  // put the community worlds "on chain" once, with their real file hashes
  useEffect(() => {
    (async () => {
      const seed = await Promise.all(
        CATALOG.map(async (c): Promise<Listing> => {
          const cov = coverage(c.spec);
          return {
            assetId: c.assetId,
            title: c.spec.title,
            topic: c.spec.topic,
            subject: c.subject,
            creator: c.creator,
            creatorName: c.creatorName,
            price: c.price,
            specHash: await sha256Json(c.spec),
            specUri: `eduoasis://worlds/${c.assetId}.json`,
            coverage: { covered: cov.covered, total: cov.total },
            learners: c.learners,
            avgRecallGain: c.avgRecallGain,
            parent: c.parent,
            mintedAt: Date.now() - 5 * 86400_000,
          };
        }),
      );
      chain.seedListings(seed);
      refresh();
    })();
  }, []);

  const run = useCallback(async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label);
    setToast(null);
    try {
      const msg = await fn();
      if (msg) setToast({ ok: true, text: msg });
    } catch (e) {
      setToast({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(null);
      refresh();
    }
  }, []);

  const wallet = chain.getWallet();
  void tick; // re-read chain state after every action

  const importWorld = (l: Listing) =>
    run(`import-${l.assetId}`, async () => {
      if (!chain.hasAccess(l.assetId)) throw new Error("You need an access pass or membership first");
      const spec = fetchSpec(l);
      if (!spec) throw new Error("Couldn't download this world file");
      // integrity: the downloaded file must match the hash stored in the NFT
      const hash = await sha256Json(spec);
      if (hash !== l.specHash) throw new Error("World file doesn't match its on-chain fingerprint — refusing to load it");
      const slot = profile.worlds.indexOf(null);
      if (slot < 0) throw new Error("All 3 islands are full — free one up below first");
      const id = marketWorldId(l.assetId);
      saveSpec(id, spec);
      const t = now();
      const world: WorldSummary = {
        id,
        title: spec.title.slice(0, 32),
        topic: spec.topic,
        creator: l.creatorName,
        createdAt: t,
        lastVisitedAt: t,
        recall: 1,
        streak: 0,
        gameType: "explore-collect",
        coverage: l.coverage,
      };
      const worlds = [...profile.worlds];
      worlds[slot] = world;
      onProfile({ ...profile, worlds });
      return `✔ Fingerprint verified (${hash.slice(0, 10)}…) — "${spec.title}" is now on island ${slot + 1}. No generation used.`;
    });

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-3">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[#fff8e7] text-[#2b2118] shadow-2xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e8d9b5] px-5 py-3">
          <div className="text-xl font-bold">🏪 World Market</div>
          <span className="rounded-full bg-[#ece2ff] px-2 py-0.5 text-[11px] text-[#5b3fa0]">
            Solana devnet{chain.SIMULATED ? " · simulated" : ""}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {wallet ? (
              <>
                <span className="rounded-full bg-white px-3 py-1 font-mono text-xs">
                  {chain.shortAddr(wallet.pubkey)} · ◎{wallet.sol.toFixed(2)}
                </span>
                <button
                  className="text-xs underline opacity-60"
                  onClick={() => {
                    chain.disconnectWallet();
                    refresh();
                  }}
                >
                  disconnect
                </button>
              </>
            ) : (
              <button
                className="rounded-full bg-[#7c5cff] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
                disabled={!!busy}
                onClick={() => run("connect", async () => `Connected ${chain.shortAddr(await chain.connectWallet())}`)}
              >
                {busy === "connect" ? "Connecting…" : "Connect wallet"}
              </button>
            )}
            <button onClick={onClose} className="ml-2 text-2xl leading-none opacity-60 hover:opacity-100" aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[#e8d9b5] px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-t-lg px-3 py-1.5 text-sm ${tab === t.id ? "bg-white font-bold" : "opacity-60 hover:opacity-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {toast && (
          <div className={`mx-5 mt-3 rounded-lg p-2 text-sm ${toast.ok ? "bg-emerald-100" : "bg-rose-100"}`}>{toast.text}</div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "explore" && (
            <Explore
              profile={profile}
              wallet={!!wallet}
              busy={busy}
              onBuy={(l) =>
                run(`buy-${l.assetId}`, async () => {
                  const sig = await chain.buyAccess(l.assetId);
                  return `Access pass minted · ◎${l.price} sent straight to ${l.creatorName} · tx ${sig.slice(0, 8)}…`;
                })
              }
              onImport={importWorld}
              onFree={(slot) => {
                const worlds = [...profile.worlds];
                worlds[slot] = null;
                onProfile({ ...profile, worlds });
              }}
            />
          )}
          {tab === "sell" && <Sell profile={profile} wallet={!!wallet} busy={busy} run={run} />}
          {tab === "membership" && <Membership wallet={!!wallet} busy={busy} run={run} />}
          {tab === "wallet" && <Wallet />}
        </div>
      </div>
    </div>
  );
}

function Explore({
  profile,
  wallet,
  busy,
  onBuy,
  onImport,
  onFree,
}: {
  profile: Profile;
  wallet: boolean;
  busy: string | null;
  onBuy: (l: Listing) => void;
  onImport: (l: Listing) => void;
  onFree: (slot: number) => void;
}) {
  const listings = chain.listWorlds();
  const full = !profile.worlds.includes(null);
  return (
    <div>
      {!wallet && <p className="mb-3 text-sm opacity-70">Connect a wallet to buy access, or get a membership to unlock everything.</p>}
      {full && (
        <div className="mb-4 rounded-lg bg-white p-3 text-sm">
          <b>All 3 islands are in use.</b> Free one to add a new world (its file stays saved):
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.worlds.map((w, i) =>
              w ? (
                <button key={w.id} onClick={() => onFree(i)} className="rounded-full bg-[#f0e6cf] px-3 py-1 text-xs hover:bg-rose-100">
                  ✕ {w.title}
                </button>
              ) : null,
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {listings.map((l) => {
          const owned = profile.worlds.some((w) => w?.id === marketWorldId(l.assetId));
          const access = chain.hasAccess(l.assetId);
          const mine = chain.getWallet()?.pubkey === l.creator;
          return (
            <div key={l.assetId} className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{l.subject}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold leading-tight">{l.title}</div>
                  <div className="truncate text-xs opacity-70">{l.topic}</div>
                  <div className="mt-1 text-xs">
                    by <b>{l.creatorName}</b> <span className="font-mono opacity-50">{chain.shortAddr(l.creator)}</span>
                    {mine && <span className="ml-1 rounded bg-[#dff1fa] px-1">yours</span>}
                  </div>
                </div>
                <div className="font-bold">◎{l.price}</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px]">
                <div className="rounded bg-[#fff8e7] p-1">
                  <b>
                    {l.coverage.covered}/{l.coverage.total}
                  </b>
                  <div className="opacity-60">facts covered</div>
                </div>
                <div className="rounded bg-[#fff8e7] p-1">
                  <b>{l.learners}</b>
                  <div className="opacity-60">learners</div>
                </div>
                <div className="rounded bg-[#fff8e7] p-1">
                  <b>{l.learners ? `+${Math.round(l.avgRecallGain * 100)}%` : "—"}</b>
                  <div className="opacity-60">avg recall gain</div>
                </div>
              </div>
              <div className="mt-2 truncate font-mono text-[10px] opacity-50">fingerprint {l.specHash.slice(0, 24)}…</div>
              <div className="mt-3 flex gap-2">
                {owned ? (
                  <span className="flex-1 rounded-lg bg-emerald-100 py-2 text-center text-sm">🌴 On your island</span>
                ) : access ? (
                  <button
                    disabled={!!busy}
                    onClick={() => onImport(l)}
                    className="flex-1 rounded-lg bg-[#2a6f97] py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy === `import-${l.assetId}` ? "Verifying…" : "Add to an island"}
                  </button>
                ) : (
                  <button
                    disabled={!wallet || !!busy}
                    onClick={() => onBuy(l)}
                    className="flex-1 rounded-lg bg-[#7c5cff] py-2 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {busy === `buy-${l.assetId}` ? "Confirming…" : `Buy access ◎${l.price}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs opacity-60">
        Every world is an NFT holding its creator, price and the SHA-256 fingerprint of its world file. When you add a world,
        your browser re-checks the file against that fingerprint. Creators earn {chain.ROYALTY_BPS / 100}% on every resale.
      </p>
    </div>
  );
}

function Sell({
  profile,
  wallet,
  busy,
  run,
}: {
  profile: Profile;
  wallet: boolean;
  busy: string | null;
  run: (label: string, fn: () => Promise<string | void>) => void;
}) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const listings = chain.listWorlds();
  const mineAll = profile.worlds.filter(
    (w): w is WorldSummary => !!w && w.creator === profile.name && !!loadSpec(w.id),
  );

  if (!mineAll.length)
    return <p className="text-sm opacity-70">Generate a world on an empty island first — then you can mint and sell it here.</p>;

  return (
    <div className="space-y-3">
      {!wallet && <p className="text-sm opacity-70">Connect a wallet to mint your worlds.</p>}
      {mineAll.map((w) => {
        const listed = listings.find((l) => l.specUri === `local:${w.id}`);
        return (
          <div key={w.id} className="rounded-xl bg-white p-4">
            <div className="font-bold">{w.title}</div>
            <div className="text-xs opacity-70">{w.topic}</div>
            {listed ? (
              <div className="mt-2 space-y-1 text-xs">
                <div>
                  ✔ Listed at <b>◎{listed.price}</b> · NFT <span className="font-mono">{chain.shortAddr(listed.assetId)}</span>
                </div>
                <div className="font-mono opacity-60">fingerprint {listed.specHash.slice(0, 32)}…</div>
                <div className="opacity-70">You earn the full price on each sale and {chain.ROYALTY_BPS / 100}% on every resale.</div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm">◎</span>
                <input
                  className="w-20 rounded border border-[#d9c9a3] px-2 py-1 text-sm"
                  value={prices[w.id] ?? "0.05"}
                  onChange={(e) => setPrices({ ...prices, [w.id]: e.target.value })}
                />
                <button
                  disabled={!wallet || !!busy}
                  className="rounded-lg bg-[#7c5cff] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                  onClick={() =>
                    run(`mint-${w.id}`, async () => {
                      const spec = loadSpec(w.id)!;
                      const price = Number(prices[w.id] ?? "0.05");
                      if (!(price > 0)) throw new Error("Enter a price above 0");
                      const hash = await sha256Json(spec);
                      const cov = coverage(spec);
                      const { assetId } = await chain.mintWorld(spec, hash, price, {
                        subject: "✨",
                        creatorName: profile.name,
                        coverage: { covered: cov.covered, total: cov.total },
                        specUri: `local:${w.id}`,
                      });
                      return `Minted world NFT ${chain.shortAddr(assetId)} with fingerprint ${hash.slice(0, 10)}… and listed at ◎${price}`;
                    })
                  }
                >
                  {busy === `mint-${w.id}` ? "Minting…" : "Mint & list"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Membership({
  wallet,
  busy,
  run,
}: {
  wallet: boolean;
  busy: string | null;
  run: (label: string, fn: () => Promise<string | void>) => void;
}) {
  const member = chain.hasMembership();
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#2a6f97] p-6 text-white shadow-lg">
        <div className="text-sm opacity-80">EduOasis</div>
        <div className="text-2xl font-bold">Membership Pass</div>
        <div className="mt-1 text-sm opacity-90">Unlock every world in the market.</div>
        <div className="mt-4 text-3xl font-bold">◎{chain.MEMBERSHIP_PRICE}</div>
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
        <li>The pass is an NFT in your wallet — you own it and can <b>resell</b> it.</li>
        <li>Membership fees go into a <b>creator pool</b>, split by how much learning each world produces (measured recall gains).</li>
        <li>Creators still earn {chain.ROYALTY_BPS / 100}% royalties when single-world passes are resold.</li>
      </ul>
      {member ? (
        <div className="mt-5 rounded-xl bg-emerald-100 p-3 text-center font-bold">✔ You&apos;re a member — every world is unlocked</div>
      ) : (
        <button
          disabled={!wallet || !!busy}
          className="mt-5 w-full rounded-xl bg-[#7c5cff] py-3 font-bold text-white disabled:opacity-40"
          onClick={() => run("membership", async () => `Membership pass minted · tx ${(await chain.buyMembership()).slice(0, 8)}…`)}
        >
          {busy === "membership" ? "Confirming…" : wallet ? "Buy membership" : "Connect a wallet first"}
        </button>
      )}
    </div>
  );
}

function Wallet() {
  const w = chain.getWallet();
  if (!w) return <p className="text-sm opacity-70">No wallet connected.</p>;
  const bs = chain.badges();
  const txs = chain.ledger();
  return (
    <div className="space-y-5 text-sm">
      <div className="rounded-xl bg-white p-4">
        <div className="text-xs opacity-60">Address</div>
        <div className="break-all font-mono text-xs">{w.pubkey}</div>
        <div className="mt-2 text-2xl font-bold">◎{w.sol.toFixed(3)}</div>
        <div className="mt-1 text-xs">{chain.hasMembership() ? "🎟 Membership pass" : "No membership"}</div>
      </div>
      <section>
        <h3 className="mb-2 font-bold">Completion badges (non-transferable)</h3>
        {bs.length === 0 ? (
          <p className="text-xs opacity-70">Finish a world with your wallet connected to earn one.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bs.map((b) => (
              <div key={b.badgeId} className="rounded-xl bg-[#fff3c4] px-3 py-2 text-xs">
                🏅 <b>{b.title}</b> · {Math.round(b.score * 100)}% · {new Date(b.t).toLocaleDateString()}
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h3 className="mb-2 font-bold">Transaction history</h3>
        <p className="mb-2 text-xs opacity-60">Every purchase, mint and badge is a permanent, timestamped record on Solana.</p>
        <ul className="space-y-1">
          {txs.map((t) => (
            <li key={t.signature} className="flex items-center gap-2 rounded bg-white px-2 py-1.5 text-xs">
              <span className="w-28 shrink-0 opacity-60">{new Date(t.t).toLocaleTimeString()}</span>
              <span className="flex-1">{t.summary}</span>
              {t.amount !== undefined && (
                <span className={t.amount < 0 ? "text-rose-700" : "text-emerald-700"}>
                  {t.amount > 0 ? "+" : ""}◎{t.amount}
                </span>
              )}
              <span className="font-mono opacity-40">{t.signature.slice(0, 6)}…</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
