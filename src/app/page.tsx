"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameCanvas, { type SceneKey } from "@/components/GameCanvas";
import CreateWorldModal from "@/components/CreateWorldModal";
import BoboFlow, { type BoboPhase } from "@/components/BoboFlow";
import WorldFlow, { phaseGame, sceneFor, type WorldPhase } from "@/components/WorldFlow";
import { gamesOf } from "@/lib/worldSpec";
import PipPanel from "@/components/PipPanel";
import MarketPanel from "@/components/MarketPanel";
import MoeCoin from "@/components/MoeCoin";
import { mintBadge, recordMoe, resetChain } from "@/lib/solana";
import { ATTEMPT_FEE, recordRun, resetBounties } from "@/lib/bounty";
import { bus } from "@/game/bus";
import { now } from "@/lib/clock";
import { track } from "@/lib/telemetry";
import { lifespanAt, nextHalfLife, nextStreak, recallAt } from "@/lib/recall";
import { GENERATE_PRICE_MOE, formatMoe } from "@/lib/moe";
import { addWorld, allWorlds, defaultProfile, loadProfile, saveProfile, showOnIsland, storeWorld, updateWorld } from "@/lib/profile";
import { loadSpec, saveSpec } from "@/lib/worldStore";
import type { WorldSpec } from "@/lib/worldSpec";
import type { PortalInfo, Profile } from "@/lib/types";

type Panel = { kind: "create"; slot: number } | { kind: "market" } | { kind: "world"; info: PortalInfo } | null;
type Active = { kind: "bobo" } | { kind: "gen"; id: string; spec: WorldSpec } | null;
type Phase = BoboPhase | WorldPhase;

// phases where the player reads a card instead of playing
const isCardPhase = (p: string) => ["intro", "results", "summary"].includes(p) || /^(how|done):/.test(p);

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
  const [bountyMsg, setBountyMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!bountyMsg) return;
    const id = setTimeout(() => setBountyMsg(null), 9000);
    return () => clearTimeout(id);
  }, [bountyMsg]);
  const [clockTick, setClockTick] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // recall is derived from the forgetting curve at the current (possibly time-travelled) clock
  const view = useMemo(
    () => profile && { ...profile, worlds: profile.worlds.map((w) => w && { ...w, recall: recallAt(w), lifespan: lifespanAt(w) }) },
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
    // generated worlds: a fresh, waiting scene for each how-to; start it when play begins
    if (p.startsWith("how:")) {
      setAutoStart(false);
      setNonce((n) => n + 1);
    }
    if (p.startsWith("play:")) ["runner", "shooter", "arena", "board", "showdown"].forEach((k) => bus.emit(`${k}:begin`));
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const enter = useCallback((world: Active) => {
    setPanel(null);
    setReviewOpen(false); // may be left set if the player quit mid-card
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
    const offEnter = bus.on("portal:enter", (p) => {
      const info = p as PortalInfo;
      if (info.kind === "empty") setPanel({ kind: "create", slot: info.slot! });
      else if (info.kind === "market") setPanel({ kind: "market" });
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
      offEnter();
    };
  }, [enter]);

  if (!profile || !view) return <main className="h-screen bg-[#2a6f97]" />;

  let scene: SceneKey = "hub";
  let sceneData: Record<string, unknown> = { autoStart };
  if (active?.kind === "bobo") scene = phase === "review" || phase === "summary" ? "lab" : "experiment";
  if (active?.kind === "gen") {
    const games = gamesOf(active.spec);
    const i = phaseGame(phase) ?? (phase === "summary" ? games.length - 1 : 0);
    const s = sceneFor(active.spec, games[i], autoStart);
    scene = s.key;
    sceneData = s.data;
  }
  const paused = pipOpen || panel !== null || (active !== null && (isCardPhase(phase) || reviewOpen));

  const save = (next: Profile) => {
    saveProfile(next);
    setProfile(next);
  };

  const exitWorld = (id: string, accuracy: number) => {
    const t = now();
    // bounty pool on this island? the run counts as an attempt, and a 90%+ run solves it
    const run = recordRun(id, accuracy, profile.name);
    if (run) {
      const b = run.bounty;
      if (run.solved) {
        recordMoe("bounty-payout", `Mastered "${b.title}": solver prize from its bounty pool`, run.delta + ATTEMPT_FEE);
        setBountyMsg(`🏆 You mastered "${b.title}" and won ${formatMoe(run.delta + ATTEMPT_FEE)} MOE from its bounty pool. Every staker got their stake back plus a bonus.`);
      } else {
        recordMoe("bounty-attempt", `Bounty attempt on "${b.title}" (${Math.round(accuracy * 100)}%)`, -ATTEMPT_FEE);
        setBountyMsg(`Bounty attempt on "${b.title}": ${Math.round(accuracy * 100)}%. You need 90% to win it. Your ${ATTEMPT_FEE} MOE fee grew the pool.`);
      }
    }
    const withMoe = run ? { ...profile, moe: profile.moe + run.delta } : profile;
    save(
      updateWorld(withMoe, id, (w) => ({
        ...w,
        halfLifeH: nextHalfLife(w, accuracy),
        streak: nextStreak(w, accuracy),
        lastVisitedAt: t,
        recall: 1,
        sessions: [...(w.sessions ?? []), { t, accuracy }],
      })),
    );
    setActive(null);
    // proof-of-learning badge in the learner's wallet
    const title = profile.worlds.find((w) => w?.id === id)?.title ?? id;
    void mintBadge(id, title, accuracy);
  };

  const prompt =
    near?.kind === "empty"
      ? "E — grow a new world here"
      : near?.kind === "market"
        ? "E — enter the World Market"
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

      {active && (
        <button
          onClick={() => {
            track(active.kind === "bobo" ? "demo-bobo" : active.id, "world_quit", { phase });
            setActive(null);
          }}
          className="absolute left-4 top-4 z-[26] rounded-full bg-[#0b2a3d]/85 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-[#0b2a3d]"
        >
          ← Back to islands
        </button>
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
        <div className="mt-1 text-xs">
          🌱 {profile.generationsLeft > 0 ? `${profile.generationsLeft} free generations` : `new worlds cost ${formatMoe(GENERATE_PRICE_MOE)} MOE`}
        </div>
        <Library
          profile={profile}
          open={libraryOpen}
          setOpen={setLibraryOpen}
          onShow={(id, slot) => save(showOnIsland(profile, id, slot))}
          onStore={(slot) => save(storeWorld(profile, slot))}
        />
        <button
          className="mt-2 block text-[10px] underline opacity-50"
          onClick={() => {
            resetChain();
            resetBounties();
            save(defaultProfile());
          }}
        >
          reset demo
        </button>
      </div>

      <div hidden={active !== null} className="absolute right-4 top-4 z-10">
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-full bg-[#0b2a3d]/80 py-1.5 pl-1.5 pr-4 text-white" title="Your MOE balance">
            <MoeCoin size={28} />
            <span className="text-base font-bold text-[#ffd166]">{formatMoe(profile.moe)}</span>
            <span className="text-xs opacity-70">MOE</span>
          </div>
          <div className="rounded-xl bg-[#0b2a3d]/80 px-3 py-2 text-xs text-white">WASD / arrows to move · E to interact</div>
        </div>
      </div>

      {prompt && !panel && !active && (
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/90 px-5 py-2 text-sm font-bold text-[#0b2a3d] shadow-lg">
          {prompt}
        </div>
      )}

      {panel?.kind === "create" && (
        <CreateWorldModal
          generationsLeft={profile.generationsLeft}
          price={GENERATE_PRICE_MOE}
          moe={profile.moe}
          onClose={() => setPanel(null)}
          onSubmit={async (req) => {
            const form = new FormData();
            form.set("topic", req.topic);
            form.set("description", req.description);
            form.set("requests", req.requests);
            form.set("gameType", req.gameType);
            // game mixes of my islands, so the new one plays differently
            const recent = allWorlds(profile).flatMap((w) => {
              const sp = loadSpec(w.id);
              return sp ? [gamesOf(sp)] : [];
            });
            form.set("recentGames", JSON.stringify(recent));
            req.files.forEach((f) => form.append("files", f));
            const res = await fetch("/api/generate", { method: "POST", body: form });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error ?? "Generation failed");
            const spec = body.spec as WorldSpec;

            const id = crypto.randomUUID();
            saveSpec(id, spec);
            const world = {
              id,
              title: spec.title.slice(0, 32),
              topic: spec.topic,
              creator: profile.name,
              createdAt: Date.now(),
              lastVisitedAt: now(),
              recall: 1,
              gameType: "explore-collect" as const,
              coverage: body.coverage,
            };
            // the first 2 worlds are free, then each one costs MOE
            const free = profile.generationsLeft > 0;
            if (!free) recordMoe("generate", `Grew a new world "${world.title}"`, -GENERATE_PRICE_MOE);
            const paid = free
              ? { ...profile, generationsLeft: profile.generationsLeft - 1 }
              : { ...profile, moe: profile.moe - GENERATE_PRICE_MOE };
            save(addWorld(paid, world, panel.slot).profile);
            setPanel(null);
          }}
        />
      )}

      {panel?.kind === "market" && (
        <MarketPanel
          profile={profile}
          onProfile={save}
          onClose={() => setPanel(null)}
        />
      )}

      {panel?.kind === "world" && (
        <Overlay title={panel.info.world!.title} onClose={() => setPanel(null)}>
          <p className="text-sm opacity-80">{panel.info.world!.topic}</p>
          <p className="mt-2 text-sm">This world&apos;s file isn&apos;t on this device. Buy it again in the World Market.</p>
        </Overlay>
      )}
      {bountyMsg && (
        <div
          role="status"
          onClick={() => setBountyMsg(null)}
          className="absolute bottom-6 left-1/2 z-30 max-w-lg -translate-x-1/2 cursor-pointer rounded-xl bg-[#fff8e7] px-4 py-3 text-sm text-[#2b2118] shadow-2xl"
        >
          {bountyMsg}
        </div>
      )}
    </main>
  );
}

// Every owned world, collapsed by default: choose which 3 sit on the islands.
function Library({
  profile,
  open,
  setOpen,
  onShow,
  onStore,
}: {
  profile: Profile;
  open: boolean;
  setOpen: (o: boolean) => void;
  onShow: (id: string, slot: number) => void;
  onStore: (slot: number) => void;
}) {
  const count = profile.worlds.filter(Boolean).length + profile.library.length;
  return (
    <div className="mt-2 text-xs">
      <button onClick={() => setOpen(!open)} className="rounded-full bg-white/15 px-2 py-0.5 font-bold hover:bg-white/25">
        📚 My worlds ({count}) {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="mt-2 max-h-[50vh] w-64 space-y-1 overflow-y-auto">
          {profile.worlds.map((w, i) => (
            <div key={`island-${i}`} className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1">
              <span className="opacity-60">🏝{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{w ? w.title : <i className="opacity-50">empty</i>}</span>
              {w && (
                <button onClick={() => onStore(i)} className="underline opacity-70 hover:opacity-100" title="Move to the library">
                  store
                </button>
              )}
            </div>
          ))}
          {profile.library.length > 0 && <div className="pt-1 opacity-60">Library: pick an island to show it on</div>}
          {profile.library.map((w) => (
            <div key={w.id} className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1">
              <span className="min-w-0 flex-1 truncate">{w.title}</span>
              {[0, 1, 2].map((slot) => (
                <button
                  key={slot}
                  onClick={() => onShow(w.id, slot)}
                  className="rounded bg-white/20 px-1.5 hover:bg-white/40"
                  title={profile.worlds[slot] ? `Swap with ${profile.worlds[slot]!.title}` : `Put on island ${slot + 1}`}
                >
                  {slot + 1}
                </button>
              ))}
            </div>
          ))}
          {count === 0 && <div className="opacity-60">No worlds yet: grow one on an island or buy one in the World Market.</div>}
        </div>
      )}
    </div>
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
