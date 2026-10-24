"use client";

import { useEffect, useRef } from "react";
import type { Profile } from "@/lib/types";

// Mounts Phaser on the client only (Phaser touches window at import time).
export default function GameCanvas({ profile, paused }: { profile: Profile; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<import("phaser").Game | null>(null);

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const Phaser = await import("phaser");
      const { HubScene } = await import("@/game/HubScene");
      if (destroyed || !host.current) return;
      game.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        backgroundColor: "#2a6f97",
        scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
        scene: [],
      });
      game.current.scene.add("hub", HubScene, true, { profile });
    })();
    return () => {
      destroyed = true;
      game.current?.destroy(true);
      game.current = null;
    };
    // the game is created once; profile changes restart the scene below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    game.current?.scene.getScene("hub")?.scene.restart({ profile });
  }, [profile]);

  useEffect(() => {
    const kb = game.current?.input.keyboard;
    if (!kb) return;
    // a disabled manager ignores key events entirely, so modal inputs can receive W/A/S/D/E/space
    kb.enabled = !paused;
  }, [paused]);

  return <div ref={host} className="absolute inset-0" />;
}
