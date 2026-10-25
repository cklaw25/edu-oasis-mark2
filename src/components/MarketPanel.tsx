"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MoeCoin from "@/components/MoeCoin";
import TradingPanel from "@/components/TradingPanel";
import { boboKnowledge } from "@/content/boboKnowledge";
import { CATALOG, PLAYER_LISTINGS, SUBJECTS, type CatalogEntry, type PlayerListing } from "@/content/catalog";
import { sha256Json } from "@/lib/hash";
import { now } from "@/lib/clock";
import { MARKET_PRICE_MOE, MEMBERSHIP_PRICE_MOE, formatMoe } from "@/lib/moe";
import { addWorld, allWorlds, ownsWorld, removeWorld, updateWorld } from "@/lib/profile";
import * as chain from "@/lib/solana";
import * as demo from "@/lib/solana/demoWallet";
import type { SentTx } from "@/lib/solana/demoWallet";
import type { Profile, WorldSummary } from "@/lib/types";
import { loadSpec, saveSpec } from "@/lib/worldStore";
import { coverage } from "@/lib/worldSpec";
import BountiesTab, { BountyGuard } from "@/components/BountiesTab";

// World Market: buy worlds by subject, buy worlds other players are reselling, sell your own, all in MOE.
// Every generated world is an NFT holding the SHA-256 fingerprint of its world file, re-checked on purchase.
type Tab = "shop" | "listings" | "bounties" | "trading" | "mine" | "membership" | "wallet";
type Run = (label: string, fn: () => Promise<string | void>) => void;

const TABS: { id: Tab; label: string }[] = [
  { id: "shop", label: "Shop" },
  { id: "listings", label: "Player listings" },
  { id: "bounties", label: "Bounties" },
  { id: "trading", label: "🐫 Trading" },
  { id: "mine", label: "My worlds" },
  { id: "membership", label: "Membership" },
  { id: "wallet", label: "Wallet & history" },
];

const BUILT_IN = "built-in";
const buyBtn =
  "rounded-lg bg-[#e0a526] px-4 py-2 text-sm font-bold text-[#2b2118] hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-40";

function Price({ amount }: { amount: number }) {
  return (
    <span className="flex items-center gap-1.5 font-bold">
      <MoeCoin size={20} />
      {formatMoe(amount)} MOE
    </span>
  );
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
  const [tab, setTab] = useState<Tab>("shop");
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const refresh = () => setTick((n) => n + 1);

  // put the market's worlds "on chain" once, with their real file hashes
  useEffect(() => {
    void demo.demoAddress().then(refresh); // the market uses this browser's devnet wallet address
    (async () => {
      const seed = await Promise.all(
        CATALOG.map(async (c): Promise<chain.Listing> => {
          const cov = c.spec ? coverage(c.spec) : { covered: boboKnowledge().length, total: boboKnowledge().length };
          return {
            assetId: c.assetId,
            title: c.title,
            topic: c.topic,
            subject: c.icon,
            creator: c.creator,
            creatorName: c.creatorName,
            price: MARKET_PRICE_MOE,
            specHash: c.spec ? await sha256Json(c.spec) : BUILT_IN,
            specUri: `eduoasis://worlds/${c.assetId}.json`,
            coverage: { covered: cov.covered, total: cov.total },
            learners: c.learners,
            avgRecallGain: c.avgRecallGain,
            mintedAt: Date.now() - 5 * 86400_000,
          };
        }),
      );
      chain.seedListings(seed);
      refresh();
    })();
  }, []);

  const run: Run = useCallback(async (label, fn) => {
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

  void tick; // re-read chain state after every action
  const wallet = chain.getWallet();

  // buy from the shop (seller = creator) or from a player's resale listing
  const buy = (c: CatalogEntry, price: number, seller?: PlayerListing) =>
    run(`buy-${seller?.id ?? c.assetId}`, async () => {
      if (ownsWorld(profile, c.worldId)) throw new Error("You already own this world");
      if (profile.moe < price) throw new Error(`You need ${formatMoe(price - profile.moe)} more MOE`);
      const listing = chain.listWorlds().find((l) => l.assetId === c.assetId);
      if (!listing) throw new Error("World not found");
      let check = "Hand-built world, no file to download.";
      if (c.spec) {
        // integrity: the downloaded file must match the fingerprint stored in the NFT
        const hash = await sha256Json(c.spec);
        if (hash !== listing.specHash) throw new Error("World file doesn't match its on-chain fingerprint, so it won't be loaded");
        saveSpec(c.worldId, c.spec);
        check = `Fingerprint verified (${hash.slice(0, 10)}…).`;
      }
      await chain.buyAccess(c.assetId, price, seller?.seller);
      const t = now();
      const world: WorldSummary = {
        id: c.worldId,
        title: c.title.slice(0, 32),
        topic: c.topic,
        creator: c.creatorName,
        createdAt: t,
        lastVisitedAt: t,
        recall: 1,
        streak: 0,
        gameType: c.gameType,
        coverage: listing.coverage,
        bought: true,
        nftId: chain.shortAddr(c.assetId),
      };
      const placed = addWorld({ ...profile, moe: profile.moe - price }, world);
      onProfile(placed.profile);
      const where = placed.slot >= 0 ? `on Kata ${placed.slot + 1}` : "in your library (all 3 Katas are full)";
      return `✔ ${check} "${c.title}" is ${where}. −${formatMoe(price)} MOE.`;
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
            <span className="flex items-center gap-2 rounded-full bg-[#0b2a3d] py-1 pl-1 pr-3 text-sm font-bold text-[#ffd166]">
              <MoeCoin size={22} />
              {formatMoe(profile.moe)} MOE
            </span>
            <span className="hidden rounded-full bg-white px-3 py-1 font-mono text-xs sm:inline">{chain.shortAddr(wallet.pubkey)}</span>
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
          {tab === "shop" && <Shop profile={profile} busy={busy} onBuy={(c) => buy(c, MARKET_PRICE_MOE)} />}
          {tab === "listings" && (
            <Listings
              profile={profile}
              busy={busy}
              onBuy={(l) => {
                const c = CATALOG.find((x) => x.assetId === l.assetId)!;
                buy(c, l.price, l);
              }}
            />
          )}
          {tab === "bounties" && (
            <BountyGuard>
              <BountiesTab profile={profile} onProfile={onProfile} busy={busy} run={run} />
            </BountyGuard>
          )}
          {tab === "trading" && <TradingPanel profile={profile} />}
          {tab === "mine" && <Mine profile={profile} onProfile={onProfile} busy={busy} run={run} />}
          {tab === "membership" && <Membership profile={profile} onProfile={onProfile} busy={busy} run={run} />}
          {tab === "wallet" && <Wallet profile={profile} onProfile={onProfile} />}
        </div>
      </div>
    </div>
  );
}

function WorldCard({
  c,
  price,
  note,
  action,
}: {
  c: CatalogEntry;
  price: number;
  note?: React.ReactNode;
  action: React.ReactNode;
}) {
  const l = chain.listWorlds().find((x) => x.assetId === c.assetId);
  return (
    <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-3xl">{c.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-tight">{c.title}</div>
          <div className="text-xs opacity-70">{c.blurb}</div>
          <div className="mt-1 text-xs">
            by <b>{c.creatorName}</b> <span className="font-mono opacity-50">{chain.shortAddr(c.creator)}</span>
          </div>
          {note}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px]">
        <div className="rounded bg-[#fff8e7] p-1">
          <b>{l ? `${l.coverage.covered}/${l.coverage.total}` : "…"}</b>
          <div className="opacity-60">facts covered</div>
        </div>
        <div className="rounded bg-[#fff8e7] p-1">
          <b>{c.learners}</b>
          <div className="opacity-60">learners</div>
        </div>
        <div className="rounded bg-[#fff8e7] p-1">
          <b>+{Math.round(c.avgRecallGain * 100)}%</b>
          <div className="opacity-60">avg recall gain</div>
        </div>
      </div>
      <div className="mt-2 truncate font-mono text-[10px] opacity-50">
        {l?.specHash === BUILT_IN ? "hand-built world (ships with the app)" : `fingerprint ${l?.specHash.slice(0, 24) ?? "…"}…`}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Price amount={price} />
        {action}
      </div>
    </div>
  );
}

function Owned() {
  return <span className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-800">✓ Owned</span>;
}

function Shop({ profile, busy, onBuy }: { profile: Profile; busy: string | null; onBuy: (c: CatalogEntry) => void }) {
  const [subject, setSubject] = useState<string | null>(null);
  const s = SUBJECTS.find((x) => x.id === subject);

  if (!s)
    return (
      <>
        <p className="text-sm opacity-80">Pick a subject. Every world costs {formatMoe(MARKET_PRICE_MOE)} MOE; your starting MOE buys one.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUBJECTS.map((x) => (
            <button
              key={x.id}
              onClick={() => setSubject(x.id)}
              className="rounded-xl border-2 border-[#0b2a3d]/15 bg-white px-4 py-5 text-left hover:border-[#e0a526]"
            >
              <div className="text-3xl">{x.icon}</div>
              <div className="mt-2 font-bold">{x.title}</div>
              <div className="text-xs opacity-60">{CATALOG.filter((c) => c.subject === x.id).length} worlds</div>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs opacity-60">
          Every world is an NFT holding its creator, price and the SHA-256 fingerprint of its world file. When you buy one, your
          browser re-checks the file against that fingerprint. Creators earn {chain.ROYALTY_BPS / 100}% on every resale.
        </p>
      </>
    );

  return (
    <>
      <button onClick={() => setSubject(null)} className="text-sm underline opacity-70 hover:opacity-100">
        ← All subjects
      </button>
      <h3 className="mt-2 text-lg font-bold">
        {s.icon} {s.title}
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CATALOG.filter((c) => c.subject === s.id).map((c) => (
          <WorldCard
            key={c.assetId}
            c={c}
            price={MARKET_PRICE_MOE}
            action={
              ownsWorld(profile, c.worldId) ? (
                <Owned />
              ) : (
                <button disabled={!!busy || profile.moe < MARKET_PRICE_MOE} onClick={() => onBuy(c)} className={buyBtn}>
                  {busy === `buy-${c.assetId}` ? "Verifying…" : "Buy"}
                </button>
              )
            }
          />
        ))}
      </div>
      {profile.moe < MARKET_PRICE_MOE && (
        <p className="mt-3 text-xs font-bold text-[#9b2226]">You need {formatMoe(MARKET_PRICE_MOE - profile.moe)} more MOE for a shop world.</p>
      )}
    </>
  );
}

function Listings({ profile, busy, onBuy }: { profile: Profile; busy: string | null; onBuy: (l: PlayerListing) => void }) {
  return (
    <>
      <p className="text-sm opacity-80">
        Worlds other players are reselling. Sellers set their own price, and the original creator gets {chain.ROYALTY_BPS / 100}% of
        every resale.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLAYER_LISTINGS.map((l) => {
          const c = CATALOG.find((x) => x.assetId === l.assetId)!;
          return (
            <WorldCard
              key={l.id}
              c={c}
              price={l.price}
              note={<div className="mt-1 text-xs">resold by <b>{l.seller}</b></div>}
              action={
                ownsWorld(profile, c.worldId) ? (
                  <Owned />
                ) : (
                  <button disabled={!!busy || profile.moe < l.price} onClick={() => onBuy(l)} className={buyBtn}>
                    {busy === `buy-${l.id}` ? "Verifying…" : "Buy"}
                  </button>
                )
              }
            />
          );
        })}
      </div>
    </>
  );
}

function Mine({ profile, onProfile, busy, run }: { profile: Profile; onProfile: (p: Profile) => void; busy: string | null; run: Run }) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const worlds = allWorlds(profile);
  if (!worlds.length) return <p className="text-sm opacity-70">You don&apos;t own any worlds yet. Grow one on an empty Kata or buy one in the shop.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm opacity-80">
        Worlds you grew: sell copies and keep the original. Worlds you bought: resell them (the creator gets{" "}
        {chain.ROYALTY_BPS / 100}%).
      </p>
      {worlds.map((w) => {
        const mine = !w.bought && w.creator === profile.name && !!loadSpec(w.id);
        const listing = profile.listings.find((l) => l.worldId === w.id);
        const slot = profile.worlds.findIndex((x) => x?.id === w.id);
        const typed = prices[w.id] ?? "";
        const price = Math.floor(Number(typed.replace(/,/g, "")));
        const valid = Number.isFinite(price) && price > 0;
        return (
          <div key={w.id} className="rounded-xl bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{w.title}</div>
                <div className="text-xs opacity-70">
                  {slot >= 0 ? `On Kata ${slot + 1}` : "In your library"} · {mine ? "made by you" : `bought · by ${w.creator}`}
                </div>
              </div>
              {w.nftId && <span className="rounded bg-[#0b2a3d]/10 px-2 py-0.5 font-mono text-[10px] font-bold">NFT {w.nftId}</span>}
            </div>
            {listing ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm">Listed for</span>
                <Price amount={listing.price} />
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => onProfile({ ...profile, listings: profile.listings.filter((l) => l.worldId !== w.id) })}
                    className="rounded-lg border-2 border-[#0b2a3d]/20 px-3 py-2 text-sm font-bold hover:bg-[#0b2a3d]/5"
                  >
                    Cancel listing
                  </button>
                  <button
                    disabled={!!busy}
                    className={buyBtn}
                    onClick={() =>
                      run(`sell-${w.id}`, async () => {
                        if (mine) {
                          // a learner buys a copy: you keep your world and get the full price
                          chain.recordMoe("sell-world", `A learner bought a copy of "${w.title}"`, listing.price);
                          onProfile({ ...profile, moe: profile.moe + listing.price });
                          return `+${formatMoe(listing.price)} MOE. A learner bought a copy of "${w.title}" (you keep yours).`;
                        }
                        const cut = Math.round((listing.price * chain.ROYALTY_BPS) / 10_000);
                        chain.recordMoe("sell-world", `Resold "${w.title}" · ${formatMoe(cut)} MOE royalty to ${w.creator}`, listing.price - cut);
                        onProfile({ ...removeWorld(profile, w.id), moe: profile.moe + listing.price - cut });
                        return `+${formatMoe(listing.price - cut)} MOE. "${w.title}" went to its new owner (${formatMoe(cut)} MOE royalty to ${w.creator}).`;
                      })
                    }
                  >
                    {mine ? "Demo: a learner buys a copy" : "Demo: a buyer pays"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <input
                  inputMode="numeric"
                  placeholder="Your price in MOE"
                  value={typed}
                  onChange={(e) => setPrices({ ...prices, [w.id]: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border-2 border-[#0b2a3d]/20 px-3 py-2 text-sm"
                />
                <button
                  disabled={!valid || !!busy}
                  className={buyBtn}
                  onClick={() =>
                    run(`list-${w.id}`, async () => {
                      const listings = [...profile.listings, { worldId: w.id, price }];
                      if (mine && !w.nftId) {
                        // first listing mints the world NFT with its file fingerprint
                        const spec = loadSpec(w.id)!;
                        const hash = await sha256Json(spec);
                        const cov = coverage(spec);
                        const { assetId } = await chain.mintWorld(spec, hash, price, {
                          subject: "✨",
                          creatorName: profile.name,
                          coverage: { covered: cov.covered, total: cov.total },
                          specUri: `local:${w.id}`,
                        });
                        onProfile({ ...updateWorld(profile, w.id, (x) => ({ ...x, nftId: chain.shortAddr(assetId) })), listings });
                        return `Minted world NFT ${chain.shortAddr(assetId)} with fingerprint ${hash.slice(0, 10)}… and listed it at ${formatMoe(price)} MOE`;
                      }
                      chain.recordMoe("list-world", `Listed "${w.title}" at ${formatMoe(price)} MOE`);
                      onProfile({ ...profile, listings });
                      return `Listed "${w.title}" at ${formatMoe(price)} MOE`;
                    })
                  }
                >
                  {busy === `list-${w.id}` ? "Minting…" : mine && !w.nftId ? "Mint & list" : "List for sale"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Membership({ profile, onProfile, busy, run }: { profile: Profile; onProfile: (p: Profile) => void; busy: string | null; run: Run }) {
  const member = chain.hasMembership();
  const short = profile.moe < MEMBERSHIP_PRICE_MOE;
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#2a6f97] p-6 text-white shadow-lg">
        <div className="text-sm opacity-80">EduOasis</div>
        <div className="text-2xl font-bold">Membership Pass</div>
        <div className="mt-1 text-sm opacity-90">Unlock every world in the market.</div>
        <div className="mt-4 flex items-center gap-2 text-3xl font-bold">
          <MoeCoin size={30} />
          {formatMoe(MEMBERSHIP_PRICE_MOE)} MOE
        </div>
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
        <li>The pass is an NFT in your wallet: you own it and can <b>resell</b> it.</li>
        <li>Membership fees go into a <b>creator pool</b>, split by how much learning each world produces (measured recall gains).</li>
        <li>Creators still earn {chain.ROYALTY_BPS / 100}% royalties when single worlds are resold.</li>
      </ul>
      {member ? (
        <div className="mt-5 rounded-xl bg-emerald-100 p-3 text-center font-bold">✔ You&apos;re a member: every world is unlocked</div>
      ) : (
        <button
          disabled={short || !!busy}
          className="mt-5 w-full rounded-xl bg-[#7c5cff] py-3 font-bold text-white disabled:opacity-40"
          onClick={() =>
            run("membership", async () => {
              const sig = await chain.buyMembership(MEMBERSHIP_PRICE_MOE);
              onProfile({ ...profile, moe: profile.moe - MEMBERSHIP_PRICE_MOE });
              return `Membership pass minted · tx ${sig.slice(0, 8)}…`;
            })
          }
        >
          {busy === "membership" ? "Confirming…" : short ? `You need ${formatMoe(MEMBERSHIP_PRICE_MOE - profile.moe)} more MOE` : "Buy membership"}
        </button>
      )}
    </div>
  );
}

// A real wallet on Solana devnet, kept in this browser: claim starter MOE, send MOE to anyone (e.g. a teammate's laptop).
function DevnetWallet({ profile, onProfile }: { profile: Profile; onProfile: (p: Profile) => void }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [log, setLog] = useState<SentTx[]>([]);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("500");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; link?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const latest = useRef(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onProfileRef = useRef(onProfile);
  onProfileRef.current = onProfile;
  const refresh = useCallback(async () => {
    setLog(demo.sentLog());
    const id = ++latest.current; // an older, slower read must not overwrite a newer one
    const b = await demo.demoBalance().catch(() => null);
    if (id === latest.current) setBalance(b);
    if (b === null) return;
    // keep the in-game balance in step with real devnet sends/receives (the starter claim is already counted)
    const d = demo.chainDelta(b);
    if (d) {
      const p = profileRef.current;
      chain.recordMoe("wallet", d > 0 ? `Received ${formatMoe(d)} MOE on devnet` : `Sent ${formatMoe(-d)} MOE on devnet`, d);
      onProfileRef.current({ ...p, moe: p.moe + d });
    }
  }, []);
  useEffect(() => {
    demo.demoAddress().then(setAddress);
    void refresh();
  }, [refresh]);

  const act = async (label: string, fn: () => Promise<SentTx>) => {
    setBusy(label);
    setMsg(null);
    try {
      const tx = await fn();
      setMsg({ ok: true, text: `✔ ${tx.summary}. Confirmed on devnet.`, link: tx.explorer });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Transaction failed" });
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  return (
    <div className="rounded-xl border-2 border-[#7c5cff]/40 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="font-bold">Devnet wallet: real transactions</div>
        <span className="rounded-full bg-[#ece2ff] px-2 py-0.5 text-[10px] text-[#5b3fa0]">demo wallet in this browser</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="break-all font-mono text-xs">{address ?? "…"}</span>
        {address && (
          <button
            className="shrink-0 rounded bg-[#0b2a3d]/10 px-2 py-0.5 text-[11px] font-bold hover:bg-[#0b2a3d]/20"
            onClick={() => {
              void navigator.clipboard?.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "copied" : "copy"}
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xl font-bold">
        <MoeCoin size={24} />
        {balance === null ? "…" : formatMoe(balance)} MOE <span className="text-xs font-normal opacity-60">on-chain</span>
        <button onClick={() => void refresh()} className="ml-auto text-xs font-normal underline opacity-60">
          refresh
        </button>
      </div>
      {balance === 0 && (
        <button disabled={!!busy} onClick={() => act("fund", demo.claimStarter)} className={`mt-3 w-full ${buyBtn}`}>
          {busy === "fund" ? "Sending from the treasury…" : "Claim starter 30,000 MOE"}
        </button>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          placeholder="Send to (wallet address)"
          value={to}
          onChange={(e) => setTo(e.target.value.trim())}
          className="min-w-0 flex-[3] rounded-lg border-2 border-[#0b2a3d]/20 px-3 py-2 font-mono text-xs"
        />
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 rounded-lg border-2 border-[#0b2a3d]/20 px-3 py-2 text-sm"
        />
        <button
          disabled={!!busy || !to || !(Number(amount) > 0) || !balance}
          onClick={() => act("send", () => demo.sendMoe(to, Number(amount), "EduOasis MOE transfer"))}
          className={buyBtn}
        >
          {busy === "send" ? "Signing & sending…" : "Send MOE"}
        </button>
      </div>
      {msg && (
        <div className={`mt-3 rounded-lg p-2 text-xs ${msg.ok ? "bg-emerald-100" : "bg-rose-100"}`}>
          {msg.text}{" "}
          {msg.link && (
            <a href={msg.link} target="_blank" rel="noreferrer" className="font-bold underline">
              View on Solana Explorer ↗
            </a>
          )}
        </div>
      )}
      {log.length > 0 && (
        <ul className="mt-3 space-y-1">
          {log.map((t) => (
            <li key={t.signature} className="flex items-center gap-2 rounded bg-[#fff8e7] px-2 py-1 text-xs">
              <span className="w-20 shrink-0 opacity-60">{new Date(t.t).toLocaleTimeString()}</span>
              <span className="flex-1">{t.summary}</span>
              <a href={t.explorer} target="_blank" rel="noreferrer" className="font-mono underline opacity-70">
                {t.signature.slice(0, 8)}… ↗
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] opacity-60">
        Devnet only: play money. The key for this wallet lives in this browser; &quot;reset demo&quot; doesn&apos;t delete it.
      </p>
    </div>
  );
}

type MoeInfo = { mint: string; name: string; symbol: string; decimals: number; supply: string; explorer: string };

function Wallet({ profile, onProfile }: { profile: Profile; onProfile: (p: Profile) => void }) {
  const w = chain.getWallet();
  const bs = chain.badges();
  const txs = chain.ledger();
  // the MOE token itself is live on devnet: read it from the chain
  const [token, setToken] = useState<MoeInfo | "error" | null>(null);
  useEffect(() => {
    fetch("/api/solana/moe")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setToken)
      .catch(() => setToken("error"));
  }, []);
  return (
    <div className="space-y-5 text-sm">
      <div className="rounded-xl bg-white p-4">
        <div className="text-xs opacity-60">In-game balance (simulated) · wallet {chain.shortAddr(w.pubkey)}</div>
        <div className="mt-2 flex items-center gap-2 text-2xl font-bold">
          <MoeCoin size={28} />
          {formatMoe(profile.moe)} MOE
        </div>
        <div className="mt-1 text-xs">{chain.hasMembership() ? "🎟 Membership pass" : "No membership"}</div>
      </div>
      <div className="rounded-xl bg-white p-4">
        <div className="font-bold">The MOE token (live on Solana devnet)</div>
        {token === null && <p className="text-xs opacity-60">Reading the chain…</p>}
        {token === "error" && <p className="text-xs opacity-60">Couldn&apos;t reach Solana devnet right now.</p>}
        {token && token !== "error" && (
          <div className="mt-1 space-y-0.5 text-xs">
            <div>
              {token.name} ({token.symbol}) · Token-2022 · supply {Number(token.supply).toLocaleString("en-US")} · {token.decimals} decimals
            </div>
            <div className="break-all font-mono opacity-60">mint {token.mint}</div>
            <a href={token.explorer} target="_blank" rel="noreferrer" className="underline">
              View on Solana Explorer ↗
            </a>
          </div>
        )}
        <p className="mt-2 text-xs opacity-60">In-game balances and purchases are simulated for now; the token itself is real.</p>
      </div>
      <DevnetWallet profile={profile} onProfile={onProfile} />
      <section>
        <h3 className="mb-2 font-bold">Completion badges (non-transferable)</h3>
        {bs.length === 0 ? (
          <p className="text-xs opacity-70">Finish a world to earn one.</p>
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
                  {t.amount > 0 ? "+" : ""}
                  {formatMoe(t.amount)} MOE
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
