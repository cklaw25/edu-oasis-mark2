"use client";

import { useEffect, useRef } from "react";
import type { Profile } from "@/lib/types";

export type SceneKey = "hub" | "experiment" | "lab" | "arena" | "shooter" | "runner" | "board" | "showdown";

// Mounts Phaser on the client only (Phaser touches window at import time).
export default function GameCanvas({
  scene,
  sceneData,
  nonce = 0,
  profile,
  paused,
}: {
  scene: SceneKey;
  /** extra init data for the scene */
  sceneData?: Record<string, unknown>;
  /** bump to restart the current scene */
  nonce?: number;
  profile: Profile;
  paused: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<import("phaser").Game | null>(null);
  const latest = useRef({ scene, profile, paused, sceneData });
  latest.current = { scene, profile, paused, sceneData };

  const startScene = () => {
    const g = game.current;
    if (!g) return;
    const { scene: key, profile: p, sceneData: extra } = latest.current;
    // stop paused/sleeping scenes too, otherwise they keep running and render on top
    g.scene.getScenes(false).forEach((s) => {
      if (s.scene.key !== key && (s.scene.isActive() || s.scene.isPaused() || s.scene.isSleeping())) s.scene.stop();
    });
    g.scene.start(key, { profile: p, ...extra });
    // start is queued, so apply a pending pause once the scene exists
    g.scene.getScene(key)?.events.once("create", (sc: import("phaser").Scene) => {
      if (latest.current.paused) sc.scene.pause();
    });
  };

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const Phaser = await import("phaser");
      const [{ HubScene }, { ExperimentScene }, { LabScene }, { ArenaScene }, { ShooterScene }, { RunnerScene }, { BoardScene }, { ShowdownScene }] =
        await Promise.all([
          import("@/game/HubScene"),
          import("@/game/ExperimentScene"),
          import("@/game/LabScene"),
          import("@/game/ArenaScene"),
          import("@/game/ShooterScene"),
          import("@/game/RunnerScene"),
          import("@/game/BoardScene"),
          import("@/game/ShowdownScene"),
        ]);
      if (destroyed || !host.current) return;
      game.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        backgroundColor: "#2a6f97",
        scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
        scene: [],
        physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } }, // only the runner uses it
      });
      // dev-only handle for automated play-testing
      if (process.env.NODE_ENV !== "production") (window as unknown as { __game: unknown }).__game = game.current;
      game.current.scene.add("hub", HubScene, false);
      game.current.scene.add("experiment", ExperimentScene, false);
      game.current.scene.add("lab", LabScene, false);
      game.current.scene.add("arena", ArenaScene, false);
      game.current.scene.add("shooter", ShooterScene, false);
      game.current.scene.add("runner", RunnerScene, false);
      game.current.scene.add("board", BoardScene, false);
      game.current.scene.add("showdown", ShowdownScene, false);
      // a scene restarted while a panel is open (e.g. buying in a market) loses the pause applied before
      // the restart, so re-check every frame that the current scene's pause matches `paused`
      game.current.events.on("poststep", () => {
        const s = game.current?.scene.getScene(latest.current.scene);
        if (!s) return;
        if (latest.current.paused && s.scene.isActive()) s.scene.pause();
        else if (!latest.current.paused && s.scene.isPaused()) s.scene.resume();
      });
      startScene();
    })();

    // Phaser tracks keys by keyCode. With an input method (e.g. Chinese IME) a release can arrive as "Process"
    // (keyCode 229), or never arrive if focus moves away, so a key stays "held" forever (stuck on a wall).
    // Release keys by their physical code instead, and drop everything when the window loses focus.
    const codeToKeyCode = (code: string) => {
      if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
      return ({ Space: 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 } as Record<string, number>)[code];
    };
    const scenesWithKeys = () => game.current?.scene.getScenes(false).flatMap((sc) => (sc.input?.keyboard ? [sc.input.keyboard] : [])) ?? [];
    const onKeyUp = (e: KeyboardEvent) => {
      const kc = codeToKeyCode(e.code);
      if (kc === undefined || e.keyCode === kc) return; // Phaser handled a normal release itself
      scenesWithKeys().forEach((kb) => kb.keys[kc]?.reset());
    };
    const releaseAll = () => scenesWithKeys().forEach((kb) => kb.resetKeys());
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", releaseAll);

    return () => {
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", releaseAll);
      destroyed = true;
      game.current?.destroy(true);
      game.current = null;
    };
    // the game is created once; scene/profile changes are handled below
     
  }, []);

  // switching scene, or new profile data for the hub, restarts the scene
  useEffect(() => {
    startScene();
     
  }, [scene, profile, nonce]);

  useEffect(() => {
    const g = game.current;
    if (!g) return;
    // a disabled manager ignores key events entirely, so modal inputs can receive W/A/S/D/E/space
    g.input.keyboard!.enabled = !paused;
    // only touch the current scene: resuming one that was just told to stop revives it half torn down
    const s = g.scene.getScene(scene);
    if (!s) return;
    if (paused && s.scene.isActive()) s.scene.pause();
    else if (!paused && s.scene.isPaused()) s.scene.resume();
  }, [paused, scene]);

  return <div ref={host} className="absolute inset-0" />;
}
