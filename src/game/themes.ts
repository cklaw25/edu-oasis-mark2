import * as Phaser from "phaser";
import type { Theme } from "@/lib/worldSpec";

// Per-topic visual skins for the action games. All art is drawn in code.

export interface Palette {
  skyTop: number;
  skyBottom: number;
  far: number; // distant silhouettes
  ground: number;
  groundTop: number;
  accent: number;
  text: string;
  carrier: "biplane" | "ufo" | "bee" | "balloon" | "drone";
  helmet: number;
}

export const PALETTES: Record<Theme, Palette> = {
  war: { skyTop: 0x6b6f5e, skyBottom: 0xb3a98a, far: 0x4a4a3c, ground: 0x4e3b26, groundTop: 0x6b5a3e, accent: 0xc9a227, text: "#fff3c4", carrier: "biplane", helmet: 0x55603a },
  lab: { skyTop: 0xcfe0ee, skyBottom: 0xf3f7fb, far: 0xa9bccc, ground: 0x8e9aa6, groundTop: 0xb8c4cf, accent: 0x2a9d8f, text: "#0b2a3d", carrier: "drone", helmet: 0xffffff },
  nature: { skyTop: 0x7cc6ee, skyBottom: 0xd6f0ff, far: 0x6fae5d, ground: 0x6b4a2e, groundTop: 0x5c9e4a, accent: 0xffd166, text: "#ffffff", carrier: "bee", helmet: 0x2e7d32 },
  space: { skyTop: 0x050816, skyBottom: 0x1b2350, far: 0x2b3060, ground: 0x3b3f58, groundTop: 0x6c7192, accent: 0x7fe0ff, text: "#e0f7ff", carrier: "ufo", helmet: 0xe0e0e0 },
  ancient: { skyTop: 0xf0b56b, skyBottom: 0xfbe3b3, far: 0xd9a15b, ground: 0xa87a43, groundTop: 0xc49a5a, accent: 0x9b2226, text: "#3b1d0e", carrier: "balloon", helmet: 0xc9a227 },
  ocean: { skyTop: 0x5ab7e0, skyBottom: 0xc9ecf8, far: 0x2f86b3, ground: 0xc8a96b, groundTop: 0xe8d39a, accent: 0xff7f50, text: "#ffffff", carrier: "balloon", helmet: 0xff7f50 },
  city: { skyTop: 0x8fc3ec, skyBottom: 0xe2f1fb, far: 0x8292a8, ground: 0x55595f, groundTop: 0x7b8088, accent: 0xffd166, text: "#ffffff", carrier: "drone", helmet: 0x3d5afe },
};

export function palette(theme?: Theme) {
  return PALETTES[theme ?? "city"] ?? PALETTES.city;
}

/** Textures shared by the action games (idempotent). */
export function makeActionTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("spark")) return;
  const g = scene.make.graphics({}, false);

  g.fillStyle(0xffffff).fillCircle(4, 4, 4);
  g.generateTexture("spark", 8, 8);
  g.clear();

  g.fillStyle(0xfff3b0).fillRoundedRect(0, 0, 4, 14, 2);
  g.generateTexture("bullet", 4, 14);
  g.clear();

  // gunner (helmet tinted per theme at runtime): body, helmet, rifle pointing up
  g.fillStyle(0x000000, 0.25).fillEllipse(18, 50, 30, 8);
  g.fillStyle(0x6b5a3e).fillRoundedRect(8, 22, 20, 24, 6);
  g.fillStyle(0xffd7b5).fillCircle(18, 16, 9);
  g.fillStyle(0xffffff).fillEllipse(18, 10, 24, 12); // helmet (tinted)
  g.fillStyle(0x333333).fillRect(26, 0, 4, 30);
  g.fillStyle(0x7a5230).fillRect(25, 22, 6, 10);
  g.generateTexture("gunner", 36, 54);
  g.clear();

  // biplane
  g.fillStyle(0x8b5e3c).fillRoundedRect(4, 14, 56, 12, 6);
  g.fillStyle(0xa0522d).fillRect(16, 4, 30, 6).fillRect(16, 30, 30, 6);
  g.fillStyle(0x5a3a22).fillRect(20, 10, 3, 20).fillRect(40, 10, 3, 20);
  g.fillStyle(0x333333).fillRect(0, 12, 4, 16);
  g.fillStyle(0x222222).fillCircle(50, 20, 3);
  g.generateTexture("biplane", 64, 40);
  g.clear();

  // ufo
  g.fillStyle(0x9be7ff, 0.8).fillEllipse(32, 14, 24, 18);
  g.fillStyle(0xb0b8c8).fillEllipse(32, 22, 60, 16);
  g.fillStyle(0xffd166).fillCircle(14, 24, 3).fillCircle(32, 27, 3).fillCircle(50, 24, 3);
  g.generateTexture("ufo", 64, 36);
  g.clear();

  // bee
  g.fillStyle(0xffffff, 0.7).fillEllipse(24, 8, 18, 12).fillEllipse(38, 8, 18, 12);
  g.fillStyle(0xffc300).fillEllipse(30, 22, 40, 22);
  g.fillStyle(0x222222).fillRect(22, 12, 5, 20).fillRect(33, 12, 5, 20).fillCircle(50, 20, 4);
  g.generateTexture("bee", 60, 36);
  g.clear();

  // balloon
  g.fillStyle(0xe76f51).fillEllipse(30, 18, 34, 36);
  g.fillStyle(0xffffff, 0.35).fillEllipse(24, 10, 8, 12);
  g.lineStyle(1, 0x5a3a22).lineBetween(22, 34, 26, 44).lineBetween(38, 34, 34, 44);
  g.fillStyle(0x8b5e3c).fillRect(24, 42, 12, 8);
  g.generateTexture("balloon", 60, 52);
  g.clear();

  // drone
  g.fillStyle(0x444a55).fillRoundedRect(18, 14, 28, 12, 4);
  g.fillStyle(0x222222).fillRect(4, 10, 56, 3);
  g.fillStyle(0x9aa3b2, 0.7).fillEllipse(8, 9, 16, 4).fillEllipse(56, 9, 16, 4);
  g.fillStyle(0x7fe0ff).fillCircle(32, 20, 3);
  g.generateTexture("drone", 64, 32);
  g.clear();

  g.destroy();
}

/** Sky gradient + themed silhouettes, sized for a w×h world (camera may scroll horizontally). */
export function drawBackdrop(scene: Phaser.Scene, theme: Theme | undefined, w: number, h: number, horizonY: number) {
  const p = palette(theme);
  const t = theme ?? "city";
  const sky = scene.add.graphics().setScrollFactor(0.1, 1).setDepth(-100);
  sky.fillGradientStyle(p.skyTop, p.skyTop, p.skyBottom, p.skyBottom, 1).fillRect(-200, 0, w + 400, h);

  const far = scene.add.graphics().setScrollFactor(0.35, 1).setDepth(-90);
  const rng = new Phaser.Math.RandomDataGenerator([t]);
  far.fillStyle(p.far, t === "space" ? 1 : 0.85);
  const span = w * 0.5 + 1200;
  if (t === "city" || t === "lab") {
    for (let x = -100; x < span; x += rng.between(50, 90)) {
      const bh = rng.between(60, 180);
      far.fillRect(x, horizonY - bh, rng.between(40, 70), bh);
      far.fillStyle(0xffffff, 0.25);
      for (let wy = horizonY - bh + 10; wy < horizonY - 10; wy += 18) far.fillRect(x + 8, wy, 8, 8);
      far.fillStyle(p.far, 0.85);
    }
  } else if (t === "ancient") {
    for (let x = -100; x < span; x += 260) {
      far.fillTriangle(x, horizonY, x + 110, horizonY - 120, x + 220, horizonY);
      for (let c = 0; c < 4; c++) far.fillRect(x + 130 + c * 28, horizonY - 90, 12, 90);
    }
  } else if (t === "space") {
    for (let i = 0; i < 160; i++) far.fillStyle(0xffffff, rng.realInRange(0.3, 1)).fillCircle(rng.between(-100, span), rng.between(0, horizonY), rng.realInRange(0.6, 1.8));
    far.fillStyle(0xc77dff, 0.9).fillCircle(span * 0.3, 90, 46);
    far.fillStyle(0x9d4edd, 0.9).fillEllipse(span * 0.3, 90, 130, 14);
  } else if (t === "ocean") {
    for (let x = -100; x < span; x += 40) far.fillEllipse(x, horizonY, 60, 22);
  } else {
    // war / nature: rolling hills
    for (let x = -100; x < span; x += 140) far.fillEllipse(x, horizonY + 10, rng.between(220, 320), rng.between(80, 150));
  }

  if (t === "war") {
    // barbed-wire posts, drifting smoke, distant shell flashes
    const wire = scene.add.graphics().setScrollFactor(0.6, 1).setDepth(-80);
    wire.lineStyle(2, 0x2b2b25, 0.8);
    for (let x = -100; x < w * 0.6 + 1200; x += 70) {
      wire.lineBetween(x, horizonY + 6, x, horizonY - 24);
      wire.lineBetween(x, horizonY - 20, x + 70, horizonY - 14);
      wire.lineBetween(x, horizonY - 8, x + 70, horizonY - 14);
    }
    for (let i = 0; i < 10; i++) {
      const puff = scene.add
        .ellipse(rng.between(0, w), rng.between(60, horizonY - 40), rng.between(90, 180), rng.between(30, 60), 0xe8e2d0, 0.25)
        .setScrollFactor(0.3, 1)
        .setDepth(-85);
      scene.tweens.add({ targets: puff, x: puff.x + 120, alpha: 0.05, duration: rng.between(6000, 11000), yoyo: true, repeat: -1 });
    }
    scene.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        const cam = scene.cameras.main;
        const fx = scene.add
          .circle(cam.scrollX + Phaser.Math.Between(50, cam.width - 50), horizonY - Phaser.Math.Between(10, 60), 6, 0xffb347, 0.9)
          .setDepth(-84);
        scene.tweens.add({ targets: fx, scale: 6, alpha: 0, duration: 700, onComplete: () => fx.destroy() });
      },
    });
  } else if (t !== "space") {
    for (let i = 0; i < 6; i++) {
      const cloud = scene.add
        .ellipse(rng.between(0, w), rng.between(30, horizonY * 0.5), rng.between(80, 140), 26, 0xffffff, 0.7)
        .setScrollFactor(0.2, 1)
        .setDepth(-95);
      scene.tweens.add({ targets: cloud, x: cloud.x + 200, duration: rng.between(20000, 30000), yoyo: true, repeat: -1 });
    }
  }
  return p;
}

/** Cartoon burst used for hits. */
export function burst(scene: Phaser.Scene, x: number, y: number, color: number, count = 18) {
  const em = scene.add.particles(x, y, "spark", {
    speed: { min: 80, max: 260 },
    scale: { start: 1.2, end: 0 },
    lifespan: 600,
    tint: [color, 0xffffff, 0xffd166],
    emitting: false,
  });
  em.setDepth(900);
  em.explode(count);
  scene.time.delayedCall(800, () => em.destroy());
}
