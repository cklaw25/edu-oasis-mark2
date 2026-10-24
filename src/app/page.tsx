"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas from "@/components/GameCanvas";
import CreateWorldModal from "@/components/CreateWorldModal";
import BoboFlow, { type BoboPhase } from "@/components/BoboFlow";
import { bus } from "@/game/bus";
import { defaultProfile, loadProfile, saveProfile } from "@/lib/profile";
import type { PortalInfo, Profile } from "@/lib/types";

type Panel = { kind: "create"; slot: number } | { kind: "market" } | { kind: "world"; info: PortalInfo } | null;

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [near, setNear] = useState<PortalInfo | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [inWorld, setInWorld] = useState(false);
  const [phase, setPhaseState] = useState<BoboPhase>("intro");
  const phaseRef = useRef<BoboPhase>("intro");
  const [nonce, setNonce] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const setPhase = useCallback((p: BoboPhase) => {
    if (p === "experiment") {
      if (phaseRef.current === "intro") bus.emit("experiment:begin");
      else {
        setAutoStart(true);
        setNonce((n) => n + 1);
      }
    }
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const enterBobo = () => {
    setPanel(null);
    setAutoStart(false);
    phaseRef.current = "intro";
    setPhaseState("intro");
    setNonce((n) => n + 1);
    setInWorld(true);
  };

  useEffect(() => setProfile(loadProfile()), []);
  useEffect(() => {
    const offInspect = bus.on("lab:inspect", () => setReviewOpen(true));
    const offResolved = bus.on("lab:resolved", () => setReviewOpen(false));
    return () => {
      offInspect();
      offResolved();
    };
  }, []);
  useEffect(() => {
    const offNear = bus.on("portal:near", (p) => setNear(p as PortalInfo | null));
    const offEnter = bus.on("portal:enter", (p) => {
      const info = p as PortalInfo;
      if (info.kind === "empty") setPanel({ kind: "create", slot: info.slot! });
      else if (info.kind === "market") setPanel({ kind: "market" });
      else if (info.world?.id === "demo-bobo") enterBobo();
      else setPanel({ kind: "world", info });
    });
    return () => {
      offNear();
      offEnter();
    };
  }, []);

  if (!profile) return <main className="h-screen bg-[#2a6f97]" />;

  const scene = !inWorld ? "hub" : phase === "review" || phase === "summary" ? "lab" : "experiment";
  const paused =
    panel !== null || (inWorld && (phase === "intro" || phase === "results" || phase === "summary" || reviewOpen));

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
      <GameCanvas scene={scene} sceneData={{ autoStart }} nonce={nonce} profile={profile} paused={paused} />

      {inWorld && (
        <BoboFlow
          phase={phase}
          setPhase={setPhase}
          onExit={(accuracy) => {
            const worlds = profile.worlds.map((w) =>
              w?.id === "demo-bobo" ? { ...w, recall: 0.5 + 0.5 * accuracy, lastVisitedAt: Date.now() } : w,
            );
            const next = { ...profile, worlds };
            saveProfile(next);
            setProfile(next);
            setInWorld(false);
          }}
        />
      )}

      {/* profile card */}
      <div hidden={inWorld} className="absolute left-4 top-4 z-10 rounded-xl bg-[#0b2a3d]/80 px-4 py-3 text-white backdrop-blur">
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

      <div hidden={inWorld} className="absolute right-4 top-4 z-10 rounded-xl bg-[#0b2a3d]/80 px-3 py-2 text-xs text-white">
        WASD / arrows to move · E to interact
      </div>

      {prompt && !panel && !inWorld && (
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/90 px-5 py-2 text-sm font-bold text-[#0b2a3d] shadow-lg">
          {prompt}
        </div>
      )}

      {panel?.kind === "create" && (
        <CreateWorldModal
          generationsLeft={profile.generationsLeft}
          onClose={() => setPanel(null)}
          onSubmit={(req) => {
            // TODO: call /api/generate; for now plant a placeholder world so the hub loop works end to end
            const worlds = [...profile.worlds];
            worlds[panel.slot] = {
              id: crypto.randomUUID(),
              title: req.topic.slice(0, 28),
              topic: req.topic,
              creator: profile.name,
              createdAt: Date.now(),
              lastVisitedAt: Date.now(),
              recall: 1,
              gameType: req.gameType === "auto" ? "explore-collect" : req.gameType,
            };
            const next = { ...profile, worlds, generationsLeft: profile.generationsLeft - 1 };
            saveProfile(next);
            setProfile(next);
            setPanel(null);
          }}
        />
      )}

      {panel?.kind === "market" && (
        <Overlay title="World Market" onClose={() => setPanel(null)}>
          <p className="text-sm opacity-80">Browse and unlock worlds made by other learners. (Solana wiring: Correy)</p>
        </Overlay>
      )}

      {panel?.kind === "world" && (
        <Overlay title={panel.info.world!.title} onClose={() => setPanel(null)}>
          <p className="text-sm opacity-80">{panel.info.world!.topic}</p>
          <p className="mt-2 text-sm">World scene coming next.</p>
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
