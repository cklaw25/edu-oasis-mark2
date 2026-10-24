"use client";

import { useState } from "react";
import MoeCoin from "@/components/MoeCoin";
import { PLAYER_LISTINGS, SUBJECTS, type MarketTopic, type PlayerListing } from "@/lib/market";
import { MEMBERSHIP_BONUS, MEMBERSHIP_DAYS, MEMBERSHIP_PRICE_MOE, WORLD_PRICE_MOE, formatMoe } from "@/lib/moe";
import { isMember, memberDaysLeft } from "@/lib/membership";
import { nextIslandSlot } from "@/lib/profile";
import type { Profile } from "@/lib/types";

export interface MarketActions {
  buyTopic: (topic: MarketTopic) => void;
  buyListing: (listing: PlayerListing) => void;
  list: (worldId: string, price: number) => void;
  unlist: (worldId: string) => void;
  sell: (worldId: string) => void;
  buyMembership: () => void;
}

type Tab = "shop" | "listings" | "mine" | "membership";

// World Market: buy EduOasis worlds by subject, buy island NFTs other players listed, and list your own.
export default function MarketPanel({ profile, actions }: { profile: Profile; actions: MarketActions }) {
  const [tab, setTab] = useState<Tab>("shop");
  const tabs: [Tab, string][] = [
    ["shop", "Shop"],
    ["listings", "Player listings"],
    ["mine", "My islands"],
    ["membership", "★ Membership"],
  ];
  return (
    <>
      <div className="mb-4 flex gap-1 rounded-xl bg-[#0b2a3d]/10 p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold ${tab === id ? "bg-white shadow" : "opacity-60 hover:opacity-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="max-h-[60vh] overflow-y-auto pr-1">
        {tab === "shop" && <Shop profile={profile} actions={actions} />}
        {tab === "listings" && <Listings profile={profile} actions={actions} />}
        {tab === "mine" && <MyIslands profile={profile} actions={actions} />}
        {tab === "membership" && <Membership profile={profile} actions={actions} />}
      </div>
    </>
  );
}

function Membership({ profile, actions }: { profile: Profile; actions: MarketActions }) {
  const active = isMember(profile);
  const days = memberDaysLeft(profile);
  const short = profile.moe < MEMBERSHIP_PRICE_MOE;
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="text-lg font-bold">★ EduOasis Membership</div>
        {active && (
          <span className="rounded bg-[#06d6a0]/20 px-2 py-0.5 text-xs font-bold text-[#05785a]">
            Active · {days} {days === 1 ? "day" : "days"} left
          </span>
        )}
      </div>
      <p className="mt-2 text-sm opacity-80">
        For {MEMBERSHIP_DAYS} days, every game you finish pays <b>+{Math.round(MEMBERSHIP_BONUS * 100)}% extra MOE</b> on
        top of your normal learn-to-earn reward. The better you learn, the bigger the bonus.
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm opacity-80">
        <li>A 1,000 MOE game pays 1,500 MOE</li>
        <li>A 1,900 MOE review pays 2,850 MOE</li>
        <li>Buying again while active adds another {MEMBERSHIP_DAYS} days</li>
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Price amount={MEMBERSHIP_PRICE_MOE} />
        <button onClick={actions.buyMembership} disabled={short} className={buyBtn}>
          {active ? `Extend ${MEMBERSHIP_DAYS} days` : `Join for ${MEMBERSHIP_DAYS} days`}
        </button>
      </div>
      {short && (
        <p className="mt-2 text-xs font-bold text-[#9b2226]">
          You need {formatMoe(MEMBERSHIP_PRICE_MOE - profile.moe)} more MOE. Play games to earn it.
        </p>
      )}
    </Card>
  );
}

function Price({ amount }: { amount: number }) {
  return (
    <span className="flex items-center gap-2 font-bold">
      <MoeCoin size={22} />
      {formatMoe(amount)} MOE
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border-2 border-[#0b2a3d]/15 bg-white p-4">{children}</div>;
}

const buyBtn =
  "rounded-lg bg-[#e0a526] px-4 py-2 text-sm font-bold text-[#2b2118] hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-40";

function whyNot(profile: Profile, price: number) {
  if (profile.moe < price) return `You need ${formatMoe(price - profile.moe)} more MOE.`;
  if (nextIslandSlot(profile) < 0) return "You've claimed every island. Sell one first.";
  return null;
}

function Shop({ profile, actions }: { profile: Profile; actions: MarketActions }) {
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const subject = SUBJECTS.find((s) => s.id === subjectId);

  if (!subject) {
    return (
      <>
        <p className="text-sm opacity-80">Pick a subject to see its worlds.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSubjectId(s.id)}
              className="rounded-xl border-2 border-[#0b2a3d]/15 bg-white px-4 py-5 text-left hover:border-[#e0a526]"
            >
              <div className="text-3xl">{s.icon}</div>
              <div className="mt-2 font-bold">{s.title}</div>
              <div className="text-xs opacity-60">{s.topics.length} worlds</div>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <button onClick={() => setSubjectId(null)} className="text-sm underline opacity-70 hover:opacity-100">
        ← All subjects
      </button>
      <h3 className="mt-2 text-lg font-bold">
        {subject.icon} {subject.title}
      </h3>
      <div className="mt-3 flex flex-col gap-3">
        {subject.topics.map((t) => {
          const owned = profile.owned.includes(t.id);
          const blocked = whyNot(profile, WORLD_PRICE_MOE);
          return (
            <Card key={t.id}>
              <div className="font-bold">{t.title}</div>
              <p className="mt-1 text-sm opacity-75">{t.blurb}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Price amount={WORLD_PRICE_MOE} />
                {owned ? (
                  <span className="rounded-lg bg-[#06d6a0]/20 px-3 py-2 text-sm font-bold text-[#05785a]">
                    ✓ Owned: on your island
                  </span>
                ) : (
                  <button onClick={() => actions.buyTopic(t)} disabled={!!blocked} className={buyBtn}>
                    Buy
                  </button>
                )}
              </div>
              {!owned && blocked && <p className="mt-2 text-xs font-bold text-[#9b2226]">{blocked}</p>}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Listings({ profile, actions }: { profile: Profile; actions: MarketActions }) {
  const open = PLAYER_LISTINGS.filter((l) => !profile.boughtListings.includes(l.id));
  return (
    <>
      <p className="text-sm opacity-80">Island NFTs other players have listed. Sellers set their own price.</p>
      <div className="mt-3 flex flex-col gap-3">
        {open.length === 0 && <p className="text-sm opacity-60">No islands for sale right now.</p>}
        {open.map((l) => {
          const blocked = whyNot(profile, l.price);
          return (
            <Card key={l.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold">{l.world.title}</div>
                <span className="rounded bg-[#0b2a3d]/10 px-2 py-0.5 text-[10px] font-bold">NFT {l.world.nftId}</span>
              </div>
              <p className="mt-1 text-sm opacity-75">
                {l.world.topic} · sold by {l.seller}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Price amount={l.price} />
                <button onClick={() => actions.buyListing(l)} disabled={!!blocked} className={buyBtn}>
                  Buy
                </button>
              </div>
              {blocked && <p className="mt-2 text-xs font-bold text-[#9b2226]">{blocked}</p>}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function MyIslands({ profile, actions }: { profile: Profile; actions: MarketActions }) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const islands = profile.worlds.filter((w) => w !== null);
  return (
    <>
      <p className="text-sm opacity-80">Each island is an NFT you own. List it at any price for other players to buy.</p>
      <div className="mt-3 flex flex-col gap-3">
        {islands.length === 0 && <p className="text-sm opacity-60">You don&apos;t own any islands with worlds yet.</p>}
        {islands.map((w) => {
          const listing = profile.listings.find((l) => l.worldId === w.id);
          const typed = prices[w.id] ?? "";
          const price = Math.floor(Number(typed.replace(/,/g, "")));
          const valid = Number.isFinite(price) && price > 0;
          return (
            <Card key={w.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold">{w.title}</div>
                {w.nftId && (
                  <span className="rounded bg-[#0b2a3d]/10 px-2 py-0.5 text-[10px] font-bold">NFT {w.nftId}</span>
                )}
              </div>
              {listing ? (
                <>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm">Listed for</span>
                    <Price amount={listing.price} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => actions.unlist(w.id)}
                      className="flex-1 rounded-lg border-2 border-[#0b2a3d]/20 px-3 py-2 text-sm font-bold hover:bg-[#0b2a3d]/5"
                    >
                      Cancel listing
                    </button>
                    <button onClick={() => actions.sell(w.id)} className={`flex-1 ${buyBtn}`}>
                      Demo: a buyer pays
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    placeholder="Your price in MOE"
                    value={typed}
                    onChange={(e) => setPrices({ ...prices, [w.id]: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border-2 border-[#0b2a3d]/20 px-3 py-2 text-sm"
                  />
                  <button onClick={() => actions.list(w.id, price)} disabled={!valid} className={buyBtn}>
                    List for sale
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
