import * as Phaser from "phaser";
import { bus } from "./bus";
import { makeHubTextures, makeTextures } from "./textures";
import type { PortalInfo, Profile } from "@/lib/types";

// Hub layout ("Inside Out" style): main island in the middle, 3 world islands branching out,
// market island on the opposite side. All walkable land = circles (islands) + capsules (bridges).
const W = 2400;
const H = 2400;
const MAIN = { x: 1200, y: 1250, r: 260 };
const SLOTS = [
  { x: 560, y: 1000, r: 200 },
  { x: 1200, y: 560, r: 200 },
  { x: 1840, y: 1000, r: 200 },
];
const MARKET = { x: 1200, y: 1960, r: 210 };
const BRIDGE_HALF = 34;

// where the player was when the hub last ran, so restarts (new world, back from a world) don't teleport home
let lastPos: { x: number; y: number } | null = null;

type Circle = { x: number; y: number; r: number };
type Seg = { ax: number; ay: number; bx: number; by: number };

// Neobrutalist look (.superdesign/design_iterations/neobrutalist-island-hub.html): flat natural colours,
// thick black outlines, hard offset shadows with no blur, chunky uppercase sticker labels.
const OCEAN = 0x1e8da1;
const SHALLOWS = 0x38b2ac;
const SAND = 0xf5e0a0;
const WOOD = 0x926b4d;
const TRUNK = 0x5d4037;
const INK = 0x000000;
const LINE = 4;
const SHADOW = 10;

// grass by recall: 50% gives the design's dry #a4b42b, full recall its fresh #7cb342
const DRY = Phaser.Display.Color.ValueToColor(0xccb514);
const LUSH = Phaser.Display.Color.ValueToColor(0x7cb342);

function lerpColor(t: number) {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(DRY, LUSH, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

// badge colours by score, same thresholds as before
const badge = (x: number) =>
  x < 0.25 ? { bg: 0xe57373, fg: "#000000" } : x < 0.75 ? { bg: 0xc0ca33, fg: "#000000" } : { bg: 0x43a047, fg: "#ffffff" };

// next/font hashes the family name, so read it from the CSS variable layout.tsx sets
function labelFont() {
  const fam = getComputedStyle(document.body).getPropertyValue("--font-space-grotesk").trim();
  return fam ? `${fam}, sans-serif` : "sans-serif";
}

function distToSeg(px: number, py: number, s: Seg) {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const t = Phaser.Math.Clamp(((px - s.ax) * dx + (py - s.ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Phaser.Math.Distance.Between(px, py, s.ax + t * dx, s.ay + t * dy);
}

export class HubScene extends Phaser.Scene {
  private profile!: Profile;
  private player!: Phaser.GameObjects.Sprite;
  private pet!: Phaser.GameObjects.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private land: Circle[] = [];
  private bridges: Seg[] = [];
  private portals: { x: number; y: number; info: PortalInfo }[] = [];
  private nearPortal: PortalInfo | null = null;
  private font = "sans-serif";

  constructor() {
    super("hub");
  }

  init(data: { profile: Profile }) {
    this.profile = data.profile;
    this.land = [MAIN, ...SLOTS, MARKET];
    this.bridges = [...SLOTS, MARKET].map((c) => ({ ax: MAIN.x, ay: MAIN.y, bx: c.x, by: c.y }));
    this.portals = [];
    this.nearPortal = null;
  }

  create() {
    makeTextures(this);
    makeHubTextures(this);
    this.font = labelFont();
    this.drawOcean();
    [MAIN, ...SLOTS, MARKET].forEach((c) => this.add.circle(c.x, c.y, c.r + 40, SHALLOWS, 0.4));
    this.bridges.forEach((b) => this.drawBridge(b));

    this.drawIsland(MAIN, 0x558b2f, "Home Island", 1, false, undefined, 0x2e7d32);
    SLOTS.forEach((c, i) => {
      const world = this.profile.worlds[i];
      if (world) {
        const life = world.lifespan ?? world.recall;
        this.drawIsland(c, lerpColor(life), world.title, life, false, { lifespan: life, recall: world.recall });
        this.addPortal(c, { kind: "world", slot: i, world });
      } else {
        this.drawIsland(c, 0xfafafa, "Empty island", 0, true);
        this.addPortal(c, { kind: "empty", slot: i, world: null });
      }
    });
    this.drawIsland(MARKET, 0x689f38, "World Market", 1, true);
    this.drawStalls(MARKET);
    this.addPortal(MARKET, { kind: "market" });

    const spawn = lastPos ?? { x: MAIN.x, y: MAIN.y + 60 };
    this.player = this.add.sprite(spawn.x, spawn.y, "player-nb").setDepth(10);
    this.pet = this.add.sprite(spawn.x - 40, spawn.y + 30, "pet-nb").setDepth(9);
    this.tweens.add({ targets: this.pet, scale: 1.15, yoyo: true, repeat: -1, duration: 600 });

    this.cameras.main.setBounds(0, 0, W, H).startFollow(this.player, true, 0.1, 0.1).setZoom(0.75);
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    const enter = () => this.nearPortal && bus.emit("portal:enter", this.nearPortal);
    this.keys.E.on("down", enter);
    this.keys.SPACE.on("down", enter);
    bus.emit("portal:near", null); // clear any prompt left over from before a scene switch
  }

  update(_t: number, dtMs: number) {
    const dt = dtMs / 1000;
    const k = this.keys;
    let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const len = Math.hypot(vx, vy) || 1;
    vx = (vx / len) * 240 * dt;
    vy = (vy / len) * 240 * dt;

    // slide along coastlines: try both axes, then each axis alone
    const { x, y } = this.player;
    if (this.walkable(x + vx, y + vy)) this.player.setPosition(x + vx, y + vy);
    else if (this.walkable(x + vx, y)) this.player.setPosition(x + vx, y);
    else if (this.walkable(x, y + vy)) this.player.setPosition(x, y + vy);
    if (vx) this.player.setFlipX(vx < 0);
    lastPos = { x: this.player.x, y: this.player.y };

    // pet trails behind the player
    this.pet.x += (this.player.x - 36 - this.pet.x) * 0.06;
    this.pet.y += (this.player.y + 26 - this.pet.y) * 0.06;

    const near = this.portals.find((p) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) < 70);
    const info = near?.info ?? null;
    if (info !== this.nearPortal) {
      this.nearPortal = info;
      bus.emit("portal:near", info);
    }
  }

  private walkable(x: number, y: number) {
    const m = 14; // player radius margin
    return (
      this.land.some((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) < c.r - 22 - m) ||
      this.bridges.some((b) => distToSeg(x, y, b) < BRIDGE_HALF - m / 2)
    );
  }

  private drawOcean() {
    this.add.rectangle(0, 0, W, H, OCEAN).setOrigin(0);
    const rng = new Phaser.Math.RandomDataGenerator(["ocean"]);
    for (let i = 0; i < 160; i++) {
      const wave = this.add
        .rectangle(rng.between(0, W), rng.between(0, H), rng.between(24, 44), 4, 0xffffff, 0.2)
        .setOrigin(0.5);
      this.tweens.add({
        targets: wave,
        alpha: 0,
        x: wave.x + 20,
        yoyo: true,
        repeat: -1,
        duration: rng.between(1500, 3200),
        delay: rng.between(0, 2000),
      });
    }
  }

  private drawBridge(b: Seg) {
    const g = this.add.graphics();
    const ang = Math.atan2(b.by - b.ay, b.bx - b.ax);
    const len = Math.hypot(b.bx - b.ax, b.by - b.ay);
    const c = this.add.container(b.ax, b.ay).setRotation(ang);
    g.fillStyle(INK, 0.3).fillRect(6, -BRIDGE_HALF + 6, len, BRIDGE_HALF * 2); // hard shadow
    g.fillStyle(WOOD).fillRect(0, -BRIDGE_HALF, len, BRIDGE_HALF * 2);
    g.fillStyle(INK, 0.4);
    for (let s = 40; s < len; s += 40) g.fillRect(s, -BRIDGE_HALF, 2, BRIDGE_HALF * 2); // plank seams
    g.lineStyle(3, INK).strokeRect(0, -BRIDGE_HALF, len, BRIDGE_HALF * 2);
    c.add(g);
  }

  private drawIsland(
    c: Circle,
    grass: number,
    label: string,
    health = 1,
    bare = false,
    scores?: { lifespan: number; recall: number },
    canopy?: number,
  ) {
    const g = this.add.graphics();
    const grassR = c.r - 30;
    g.fillStyle(INK, 0.4).fillCircle(c.x + SHADOW, c.y + SHADOW, c.r); // hard shadow on the water
    g.fillStyle(SAND).fillCircle(c.x, c.y, c.r).lineStyle(LINE, INK).strokeCircle(c.x, c.y, c.r);
    g.fillStyle(grass).fillCircle(c.x, c.y, grassR).lineStyle(LINE, INK).strokeCircle(c.x, c.y, grassR);

    if (!bare) {
      const rng = new Phaser.Math.RandomDataGenerator([label]);
      const big = c.r > 220;
      for (let i = 0; i < (big ? 6 : 5); i++) {
        const a = rng.angle() * Phaser.Math.DEG_TO_RAD;
        const d = rng.between(c.r * 0.4, c.r * 0.7);
        this.drawTree(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, health, big ? 20 : 14, canopy);
      }
    }

    // sticker stack above the island: name, then lifespan badge and recall badge for worlds
    const top = c.y - c.r - 18;
    if (scores) {
      const life = badge(scores.lifespan);
      const rec = badge(scores.recall);
      this.sticker(c.x, top - 22, `RECALL ${Math.round(scores.recall * 100)}%`, 13, 0xffffff, "#000000", 6, rec.bg);
      this.sticker(c.x, top - 70, `${Math.round(scores.lifespan * 100)}%`, 30, life.bg, life.fg, 8);
      this.sticker(c.x, top - 128, label.toUpperCase(), 20, 0xffffff, "#000000", 8);
    } else {
      this.sticker(c.x, top - 22, label.toUpperCase(), 20, label === "Home Island" ? SAND : 0xffffff, "#000000", 8);
    }
  }

  /** Black-bordered label card with a hard offset shadow; `accent` adds a coloured strip on its left edge. */
  private sticker(x: number, y: number, text: string, size: number, fill: number, color: string, shadow: number, accent?: number) {
    const t = this.add
      .text(x, y, text, { fontFamily: this.font, fontSize: `${size}px`, fontStyle: "bold", color })
      .setOrigin(0.5)
      .setDepth(8); // above trees (5), below the pet (9) and player (10)
    const w = t.width + size * 1.2;
    const h = t.height + size * 0.5;
    const g = this.add.graphics().setDepth(7);
    g.fillStyle(INK).fillRect(x - w / 2 + shadow, y - h / 2 + shadow, w, h);
    g.fillStyle(fill).fillRect(x - w / 2, y - h / 2, w, h);
    if (accent !== undefined) g.fillStyle(accent).fillRect(x - w / 2, y - h / 2, 6, h);
    g.lineStyle(3, INK).strokeRect(x - w / 2, y - h / 2, w, h);
  }

  private drawTree(x: number, y: number, health: number, r: number, canopy?: number) {
    const g = this.add.graphics().setDepth(5);
    const leaf = canopy ?? (health > 0.5 ? 0x43a047 : health > 0.25 ? 0xc0ca33 : 0xa1887f);
    g.fillStyle(INK, 0.25).fillCircle(x + 4, y - r * 0.6 + 4, r); // hard shadow
    g.fillStyle(TRUNK).fillRect(x - r * 0.15, y - r * 0.2, r * 0.3, r * 0.75);
    g.lineStyle(2, INK).strokeRect(x - r * 0.15, y - r * 0.2, r * 0.3, r * 0.75);
    g.fillStyle(leaf).fillCircle(x, y - r * 0.6, r).lineStyle(3, INK).strokeCircle(x, y - r * 0.6, r);
  }

  private drawStalls(c: Circle) {
    const awnings = [0xd32f2f, 0xf9a825, 0x00796b];
    awnings.forEach((col, i) => {
      const x = c.x - 110 + i * 110;
      const y = c.y + 60;
      const g = this.add.graphics().setDepth(4);
      g.fillStyle(INK, 0.3).fillRect(x - 40 + 5, y - 20 + 5, 80, 70);
      g.fillStyle(0xffffff).fillRect(x - 40, y, 80, 50).lineStyle(3, INK).strokeRect(x - 40, y, 80, 50);
      g.fillStyle(col).fillRect(x - 45, y - 20, 90, 20).lineStyle(3, INK).strokeRect(x - 45, y - 20, 90, 20);
    });
  }

  private addPortal(c: Circle, info: PortalInfo) {
    if (info.kind === "empty") {
      // the design's big outlined "+" button
      this.add.circle(c.x + 6, c.y + 6, 50, INK).setDepth(3);
      this.add.circle(c.x, c.y, 50, 0xffffff).setStrokeStyle(LINE, INK).setDepth(3);
      this.add
        .text(c.x, c.y, "+", { fontFamily: this.font, fontSize: "72px", fontStyle: "bold", color: "#000000" })
        .setOrigin(0.5)
        .setDepth(4);
    } else {
      // keep a gentle pulse so players can find the entrance
      const ring = this.add.circle(c.x, c.y, 36, 0xffffff, 0.3).setStrokeStyle(LINE, INK, 0.9).setDepth(3);
      this.tweens.add({ targets: ring, scale: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 900 });
    }
    this.portals.push({ x: c.x, y: c.y, info });
  }
}
