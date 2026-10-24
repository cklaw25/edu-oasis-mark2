"use client";

import { useEffect, useRef } from "react";
import type { Profile } from "@/lib/types";

export type SceneKey = "hub" | "experiment" | "lab";

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
      const [{ HubScene }, { ExperimentScene }, { LabScene }] = await Promise.all([
        import("@/game/HubScene"),
        import("@/game/ExperimentScene"),
        import("@/game/LabScene"),
      ]);
      if (destroyed || !host.current) return;
      game.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        backgroundColor: "#2a6f97",
        scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
        scene: [],
      });
      // dev-only handle for automated play-testing
      if (process.env.NODE_ENV !== "production") (window as unknown as { __game: unknown }).__game = game.current;
      game.current.scene.add("hub", HubScene, false);
      game.current.scene.add("experiment", ExperimentScene, false);
      game.current.scene.add("lab", LabScene, false);
      startScene();
    })();
    return () => {
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
