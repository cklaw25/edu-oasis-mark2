"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameCanvas, { type SceneKey } from "@/components/GameCanvas";
import CreateWorldModal from "@/components/CreateWorldModal";
import BoboFlow, { type BoboPhase } from "@/components/BoboFlow";
import WorldFlow, { labClues, type WorldPhase } from "@/components/WorldFlow";
import PipPanel from "@/components/PipPanel";
import MarketPanel from "@/components/MarketPanel";
import { getWallet, mintBadge } from "@/lib/solana";
import { bus } from "@/game/bus";
import { now } from "@/lib/clock";
import { track } from "@/lib/telemetry";
import { lifespanAt, nextHalfLife, nextStreak, recallAt } from "@/lib/recall";
import { defaultProfile, loadProfile, saveProfile } from "@/lib/profile";
import { loadSpec, saveSpec } from "@/lib/worldStore";
import type { WorldSpec } from "@/lib/worldSpec";
import type { PortalInfo, Profile } from "@/lib/types";

type Panel = { kind: "create"; slot: number } | { kind: "market" } | { kind: "world"; info: PortalInfo } | null;
type Active = { kind: "bobo" } | { kind: "gen"; id: string; spec: WorldSpec } | null;
type Phase = BoboPhase | WorldPhase;

// phases where the player reads a card instead of playing
const CARD_PHASES: Phase[] = ["intro", "howArena", "results", "summary", "arenaDone"];

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
    if (p === "arena") bus.emit("arena:begin");
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
    const inLab = phase === "inspect" || phase === "summary";
    scene = inLab ? "lab" : "arena";
    sceneData = inLab
      ? { clues: labClues(active.spec), title: active.spec.inspect.room }
      : { arena: active.spec.arena, autoStart };
  }
  const paused = pipOpen || panel !== null || (active !== null && (CARD_PHASES.includes(phase) || reviewOpen));

  const exitWorld = (id: string, accuracy: number) => {
    const t = now();
    const worlds = profile.worlds.map((w) =>
      w?.id === id
        ? {
            ...w,
            halfLifeH: nextHalfLife(w, accuracy),
            streak: nextStreak(w, accuracy),
            lastVisitedAt: t,
            recall: 1,
            sessions: [...(w.sessions ?? []), { t, accuracy }],
          }
        : w,
    );
    const next = { ...profile, worlds };
    saveProfile(next);
    setProfile(next);
    setActive(null);
    // proof-of-learning badge, if a wallet is connected
    const title = profile.worlds.find((w) => w?.id === id)?.title ?? id;
    if (getWallet()) void mintBadge(id, title, accuracy);
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

      <div
        hidden={active !== null}
        className="absolute right-4 top-4 z-10 rounded-xl bg-[#0b2a3d]/80 px-3 py-2 text-xs text-white"
      >
        WASD / arrows to move · E to interact
      </div>

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

      {panel?.kind === "market" && (
        <MarketPanel
          profile={profile}
          onProfile={(next) => {
            saveProfile(next);
            setProfile(next);
          }}
          onClose={() => setPanel(null)}
        />
      )}

      {panel?.kind === "world" && (
        <Overlay title={panel.info.world!.title} onClose={() => setPanel(null)}>
          <p className="text-sm opacity-80">{panel.info.world!.topic}</p>
          <p className="mt-2 text-sm">This world&apos;s file isn&apos;t on this device.</p>
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
