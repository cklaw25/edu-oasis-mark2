"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameCanvas, { type SceneKey } from "@/components/GameCanvas";
import CreateWorldModal from "@/components/CreateWorldModal";
import BoboFlow, { type BoboPhase } from "@/components/BoboFlow";
import WorldFlow, { labClues, type WorldPhase } from "@/components/WorldFlow";
import PipPanel from "@/components/PipPanel";
import MoeCoin from "@/components/MoeCoin";
import MarketPanel from "@/components/MarketPanel";
import RapidMarketPanel from "@/components/RapidMarketPanel";
import { ownsItem, type ShopItem } from "@/lib/shop";
import CosmeticsPanel from "@/components/CosmeticsPanel";
import { bus } from "@/game/bus";
import { now } from "@/lib/clock";
import { newNftId, topicForWorld, type MarketTopic, type PlayerListing } from "@/lib/market";
import { MEMBERSHIP_PRICE_MOE, WORLD_PRICE_MOE, formatMoe } from "@/lib/moe";
import { sessionReward } from "@/lib/rewards";
import { extendMembership, isMember, memberBonus, memberDaysLeft } from "@/lib/membership";
import { nextHalfLife, recallAt } from "@/lib/recall";
import { defaultProfile, isClaimed, loadProfile, nextIslandSlot, saveProfile } from "@/lib/profile";
import { loadSpec, saveSpec } from "@/lib/worldStore";
import type { WorldSpec } from "@/lib/worldSpec";
import type { PortalInfo, Profile, WorldSummary } from "@/lib/types";

type Panel =
  | { kind: "create"; slot: number }
  | { kind: "market" }
  | { kind: "rapid" }
  | { kind: "world"; info: PortalInfo }
  | { kind: "cosmetics"; slot: number }
  | null;
type Active = { kind: "bobo" } | { kind: "gen"; id: string; spec: WorldSpec } | null;
type Phase = BoboPhase | WorldPhase;

// phases where the player reads a card instead of playing
const CARD_PHASES: Phase[] = ["intro", "results", "summary", "arenaDone"];

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [near, setNear] = useState<PortalInfo | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [active, setActive] = useState<Active>(null);
  const [phase, setPhaseState] = useState<Phase>("intro");
  const phaseRef = useRef<Phase>("intro");
  const [nonce, setNonce] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [earned, setEarned] = useState<{ amount: number; bonus: number; accuracy: number } | null>(null);

  // the reward toast fades after a few seconds
  useEffect(() => {
    if (!earned) return;
    const id = setTimeout(() => setEarned(null), 5000);
    return () => clearTimeout(id);
  }, [earned]);

  // recall is derived from the forgetting curve at the current (possibly time-travelled) clock
  const view = useMemo(
    () => profile && { ...profile, worlds: profile.worlds.map((w) => w && { ...w, recall: recallAt(w) }) },
    // clockTick: re-derive after a demo time jump
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, clockTick],
  );

  const setPhase = useCallback((p: Phase) => {
    if (p === "experiment") {
      if (phaseRef.current === "intro") bus.emit("experiment:begin");
      else {
        // retry after a ruined experiment
        setAutoStart(true);
        setNonce((n) => n + 1);
      }
    }
    if (p === "arena") bus.emit("arena:begin");
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const enter = useCallback((world: Active) => {
    setPanel(null);
    setAutoStart(false);
    phaseRef.current = "intro";
    setPhaseState("intro");
    setNonce((n) => n + 1);
    setActive(world);
  }, []);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);
  useEffect(() => {
    const offInspect = bus.on("lab:inspect", () => setReviewOpen(true));
    const offResolved = bus.on("lab:resolved", () => setReviewOpen(false));
    const offNear = bus.on("portal:near", (p) => setNear(p as PortalInfo | null));
    const offCosmetics = bus.on("island:cosmetics", (slot) => setPanel({ kind: "cosmetics", slot: slot as number }));
    const offEnter = bus.on("portal:enter", (p) => {
      const info = p as PortalInfo;
      if (info.kind === "empty") setPanel({ kind: "create", slot: info.slot! });
      else if (info.kind === "market") setPanel({ kind: "market" });
      else if (info.kind === "rapid") setPanel({ kind: "rapid" });
      else if (info.world?.id === "demo-bobo") enter({ kind: "bobo" });
      else {
        const spec = info.world && loadSpec(info.world.id);
        if (spec) enter({ kind: "gen", id: info.world!.id, spec });
        else setPanel({ kind: "world", info });
      }
    });
    return () => {
      offInspect();
      offResolved();
      offNear();
      offCosmetics();
      offEnter();
    };
  }, [enter]);

  if (!profile || !view) return <main className="h-screen bg-[#2a6f97]" />;

  let scene: SceneKey = "hub";
  let sceneData: Record<string, unknown> = { autoStart };
  if (active?.kind === "bobo") scene = phase === "review" || phase === "summary" ? "lab" : "experiment";
  if (active?.kind === "gen") {
    const inLab = phase === "inspect" || phase === "summary";
    scene = inLab ? "lab" : "arena";
    sceneData = inLab
      ? { clues: labClues(active.spec), title: active.spec.inspect.room }
      : { arena: active.spec.arena, autoStart };
  }
  const paused = pipOpen || panel !== null || (active !== null && (CARD_PHASES.includes(phase) || reviewOpen));

  const save = (next: Profile) => {
    saveProfile(next);
    setProfile(next);
  };

  const exitWorld = (id: string, accuracy: number) => {
    const t = now();
    const played = profile.worlds.find((w) => w?.id === id);
    const base = played ? sessionReward(accuracy, recallAt(played, t)) : 0;
    const bonus = memberBonus(profile, base, t);
    const reward = base + bonus;
    const worlds = profile.worlds.map((w) =>
      w?.id === id
        ? {
            ...w,
            halfLifeH: nextHalfLife(w, accuracy),
            lastVisitedAt: t,
            recall: 1,
            sessions: [...(w.sessions ?? []), { t, accuracy }],
          }
        : w,
    );
    save({ ...profile, worlds, moe: profile.moe + reward });
    setActive(null);
    if (reward) setEarned({ amount: reward, bonus, accuracy });
  };

  // a bought world claims the next unclaimed island as a fresh island NFT
  const place = (world: WorldSummary, price: number, extra: Partial<Profile>) => {
    const slot = nextIslandSlot(profile);
    if (slot < 0 || profile.moe < price) return;
    const worlds = [...profile.worlds];
    worlds[slot] = {
      ...world,
      bought: true,
      nftId: world.nftId ?? newNftId(),
      createdAt: Date.now(),
      lastVisitedAt: now(),
      recall: 1,
    };
    save({ ...profile, ...extra, worlds, moe: profile.moe - price });
  };

  const rapid = {
    buy: (item: ShopItem) => {
      if (ownsItem(profile, item.id) || profile.moe < item.price) return;
      save({ ...profile, moe: profile.moe - item.price, ownedItems: [...profile.ownedItems, item.id] });
    },
    equip: (item: ShopItem) => {
      if (!ownsItem(profile, item.id)) return;
      if (item.slot) save({ ...profile, avatar: { ...profile.avatar, [item.slot]: item.id } });
      else if (item.category === "world") save({ ...profile, theme: item.id });
      else if (item.category === "font") save({ ...profile, font: item.id });
    },
  };

  const market = {
    buyMembership: () => {
      if (profile.moe < MEMBERSHIP_PRICE_MOE) return;
      save({ ...profile, moe: profile.moe - MEMBERSHIP_PRICE_MOE, membershipUntil: extendMembership(profile) });
    },
    buyTopic: (topic: MarketTopic) => {
      if (profile.owned.includes(topic.id)) return;
      place(topic.world, WORLD_PRICE_MOE, { owned: [...profile.owned, topic.id] });
    },
    buyListing: (listing: PlayerListing) => {
      if (profile.boughtListings.includes(listing.id)) return;
      place(listing.world, listing.price, { boughtListings: [...profile.boughtListings, listing.id] });
    },
    list: (worldId: string, price: number) => {
      const worlds = profile.worlds.map((w) => (w?.id === worldId && !w.nftId ? { ...w, nftId: newNftId() } : w));
      const listings = [...profile.listings.filter((l) => l.worldId !== worldId), { worldId, price }];
      save({ ...profile, worlds, listings });
    },
    unlist: (worldId: string) => save({ ...profile, listings: profile.listings.filter((l) => l.worldId !== worldId) }),
    // demo stand-in for another player buying your listing: the island leaves, the MOE arrives
    sell: (worldId: string) => {
      const listing = profile.listings.find((l) => l.worldId === worldId);
      if (!listing) return;
      const topic = topicForWorld(worldId);
      save({
        ...profile,
        worlds: profile.worlds.map((w) => (w?.id === worldId ? null : w)),
        moe: profile.moe + listing.price,
        listings: profile.listings.filter((l) => l.worldId !== worldId),
        owned: topic ? profile.owned.filter((id) => id !== topic.id) : profile.owned,
      });
    },
  };

  const prompt =
    near?.kind === "empty"
      ? "E — grow a new world here"
      : near?.kind === "market"
        ? "E — enter the World Market"
        : near?.kind === "rapid"
          ? "E — enter the Rapid Fire Market"
          : near?.world
          ? `E — enter ${near.world.title}`
          : null;

  return (
    <main className="relative h-screen w-screen overflow-hidden font-mono">
      <GameCanvas scene={scene} sceneData={sceneData} nonce={nonce} profile={view} paused={paused} />

      {active?.kind === "bobo" && (
        <BoboFlow phase={phase as BoboPhase} setPhase={setPhase} onExit={(acc) => exitWorld("demo-bobo", acc)} />
      )}
      {active?.kind === "gen" && (
        <WorldFlow
          worldId={active.id}
          spec={active.spec}
          phase={phase as WorldPhase}
          setPhase={setPhase}
          onExit={(acc) => exitWorld(active.id, acc)}
        />
      )}

      {/* map zoom (also mouse wheel and +/- keys) */}
      {!active && !panel && (
        <div className="absolute bottom-24 right-6 z-[25] flex flex-col overflow-hidden rounded-xl bg-[#0b2a3d]/80 text-white shadow-lg">
          {[
            ["in", "＋", "Zoom in"],
            ["out", "－", "Zoom out"],
            ["reset", "⟲", "Reset zoom"],
          ].map(([dir, icon, label]) => (
            <button
              key={dir}
              aria-label={label}
              title={label}
              onClick={() => bus.emit("map:zoom", dir)}
              className="h-10 w-10 border-b border-white/15 text-lg font-bold last:border-b-0 hover:bg-white/15"
            >
              {icon}
            </button>
          ))}
        </div>
      )}

      {!pipOpen && (
        <button
          onClick={() => setPipOpen(true)}
          className="absolute bottom-6 right-6 z-[25] flex items-center gap-2 rounded-full bg-[#bff4ff] px-4 py-3 font-bold text-[#0b2a3d] shadow-lg hover:bg-white"
        >
          ✦ Pip
        </button>
      )}
      {pipOpen && (
        <PipPanel
          profile={view}
          focusId={active?.kind === "bobo" ? "demo-bobo" : active?.kind === "gen" ? active.id : null}
          onClose={() => setPipOpen(false)}
          onClockChange={() => setClockTick((n) => n + 1)}
        />
      )}

      {/* profile card */}
      <div
        hidden={active !== null}
        className="absolute left-4 top-4 z-10 rounded-xl bg-[#0b2a3d]/80 px-4 py-3 text-white backdrop-blur"
      >
        <div className="text-lg font-bold">EduOasis</div>
        <div className="text-xs opacity-80">{profile.name}</div>
        <div className="mt-1 text-xs">🌱 {profile.generationsLeft} free generations</div>
        <button
          className="mt-2 text-[10px] underline opacity-50"
          onClick={() => {
            const p = defaultProfile();
            saveProfile(p);
            setProfile(p);
          }}
        >
          reset demo
        </button>
      </div>

      <div hidden={active !== null} className="absolute right-4 top-4 z-10">
        <div className="flex flex-col items-end gap-2">
          <div
            className="flex items-center gap-2 rounded-full bg-[#0b2a3d]/80 py-1.5 pl-1.5 pr-4 text-white"
            title="Your MOE DONE balance"
          >
            <MoeCoin size={28} />
            <span className="text-base font-bold text-[#ffd166]">{formatMoe(profile.moe)}</span>
            <span className="text-xs opacity-70">MOE</span>
          </div>
          {isMember(profile) && (
            <div
              className="rounded-full bg-[#ffd166] px-3 py-1 text-xs font-bold text-[#2b2118]"
              title="Members earn +50% MOE from every game"
            >
              ★ Member · +50% MOE · {memberDaysLeft(profile)}d left
            </div>
          )}
          <div className="rounded-xl bg-[#0b2a3d]/80 px-3 py-2 text-xs text-white">
            WASD / arrows to move · E to interact
          </div>
        </div>
      </div>

      {earned && !active && (
        <div className="absolute left-1/2 top-36 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#0b2a3d]/90 px-5 py-3 text-white shadow-xl">
          <MoeCoin size={32} />
          <div>
            <div className="text-lg font-bold text-[#ffd166]">+{formatMoe(earned.amount)} MOE earned!</div>
            {earned.bonus > 0 && (
              <div className="text-xs font-bold text-[#ffd166]">
                ★ includes +{formatMoe(earned.bonus)} member bonus
              </div>
            )}
            <div className="text-xs opacity-80">
              {Math.round(earned.accuracy * 100)}% correct. The more you learn, the more you earn.
            </div>
          </div>
        </div>
      )}

      {prompt && !panel && !active && (
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/90 px-5 py-2 text-sm font-bold text-[#0b2a3d] shadow-lg">
          {prompt}
        </div>
      )}

      {panel?.kind === "create" && (
        <CreateWorldModal
          generationsLeft={profile.generationsLeft}
          onClose={() => setPanel(null)}
          onSubmit={async (req) => {
            const form = new FormData();
            form.set("topic", req.topic);
            form.set("description", req.description);
            form.set("requests", req.requests);
            form.set("gameType", req.gameType);
            req.files.forEach((f) => form.append("files", f));
            const res = await fetch("/api/generate", { method: "POST", body: form });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error ?? "Generation failed");
            const spec = body.spec as WorldSpec;

            const id = crypto.randomUUID();
            saveSpec(id, spec);
            const worlds = [...profile.worlds];
            worlds[panel.slot] = {
              id,
              title: spec.title.slice(0, 32),
              topic: spec.topic,
              creator: profile.name,
              createdAt: Date.now(),
              lastVisitedAt: now(),
              recall: 1,
              gameType: "explore-collect",
              coverage: body.coverage,
            };
            const next = { ...profile, worlds, generationsLeft: profile.generationsLeft - 1 };
            saveProfile(next);
            setProfile(next);
            setPanel(null);
          }}
        />
      )}

      {panel?.kind === "rapid" && (
        <Overlay title="⚡ Rapid Fire Market" onClose={() => setPanel(null)}>
          <RapidMarketPanel profile={profile} actions={rapid} />
        </Overlay>
      )}

      {panel?.kind === "market" && (
        <Overlay title="World Market" onClose={() => setPanel(null)}>
          <MarketPanel profile={profile} actions={market} />
        </Overlay>
      )}

      {panel?.kind === "cosmetics" && (
        <Overlay
          title={`🎨 ${profile.worlds[panel.slot]?.title ?? (isClaimed(profile, panel.slot) ? "Your free island" : "Unclaimed island")}`}
          onClose={() => setPanel(null)}
        >
          <CosmeticsPanel
            profile={profile}
            slot={panel.slot}
            onChange={(look) => save({ ...profile, cosmetics: { ...profile.cosmetics, [panel.slot]: look } })}
          />
        </Overlay>
      )}

      {panel?.kind === "world" && (
        <Overlay title={panel.info.world!.title} onClose={() => setPanel(null)}>
          <p className="text-sm opacity-80">{panel.info.world!.topic}</p>
          <p className="mt-2 text-sm">
            {panel.info.world!.bought
              ? "You own this world. Its game is still being built, so check back soon."
              : "This world's file isn't on this device."}
          </p>
        </Overlay>
      )}
    </main>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#fff8e7] p-6 text-[#2b2118] shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none opacity-60 hover:opacity-100">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
