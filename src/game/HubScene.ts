import * as Phaser from "phaser";
import { bus } from "./bus";
import { makeTextures } from "./textures";
import { FREE_SLOT } from "@/lib/profile";
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

const DRY = Phaser.Display.Color.ValueToColor(0xc9b27a);
const LUSH = Phaser.Display.Color.ValueToColor(0x4fb35a);

function lerpColor(t: number) {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(DRY, LUSH, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
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
    this.drawOcean();
    this.bridges.forEach((b) => this.drawBridge(b));

    this.drawIsland(MAIN, 0x5cbf68, "Home Island");
    SLOTS.forEach((c, i) => {
      const world = this.profile.worlds[i];
      if (world) {
        this.drawIsland(c, lerpColor(world.recall), world.title, world.recall);
        this.addPortal(c, { kind: "world", slot: i, world }, world.bought ? 0x7fe0ff : 0xffffff);
      } else if (i === FREE_SLOT) {
        this.drawIsland(c, 0xd8c79a, "Your free island", 0, true);
        this.addPortal(c, { kind: "empty", slot: i, world: null }, 0xffffff);
      } else {
        // claimed by buying a world in the World Market
        this.drawIsland(c, 0x9fb4bf, "Unclaimed island", 0, true);
      }
    });
    this.drawIsland(MARKET, 0x9d7be0, "World Market");
    this.drawStalls(MARKET);
    this.addPortal(MARKET, { kind: "market" }, 0xffd166);

    const spawn = lastPos ?? { x: MAIN.x, y: MAIN.y + 60 };
    this.player = this.add.sprite(spawn.x, spawn.y, "player").setDepth(10);
    this.pet = this.add.sprite(spawn.x - 40, spawn.y + 30, "pet").setDepth(9);
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
    this.add.rectangle(0, 0, W, H, 0x2a6f97).setOrigin(0);
    const rng = new Phaser.Math.RandomDataGenerator(["ocean"]);
    for (let i = 0; i < 260; i++) {
      const wave = this.add
        .rectangle(rng.between(0, W), rng.between(0, H), rng.between(14, 30), 3, 0xffffff, 0.18)
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
    g.fillStyle(0x8a5a32).fillRect(0, -BRIDGE_HALF, len, BRIDGE_HALF * 2);
    g.fillStyle(0x6b4423);
    for (let s = 0; s < len; s += 18) g.fillRect(s, -BRIDGE_HALF, 4, BRIDGE_HALF * 2);
    g.fillStyle(0x4a2f18).fillRect(0, -BRIDGE_HALF - 4, len, 4).fillRect(0, BRIDGE_HALF, len, 4);
    c.add(g);
  }

  private drawIsland(c: Circle, grass: number, label: string, recall = 1, empty = false) {
    const g = this.add.graphics();
    g.fillStyle(0x8fd3e8, 0.5).fillCircle(c.x, c.y, c.r + 18); // shallow water
    g.fillStyle(0xf0d9a0).fillCircle(c.x, c.y, c.r); // sand
    g.fillStyle(grass, empty ? 0.35 : 1).fillCircle(c.x, c.y, c.r - 26);

    const rng = new Phaser.Math.RandomDataGenerator([label]);
    const trees = empty ? 0 : 6;
    for (let i = 0; i < trees; i++) {
      const a = rng.angle() * Phaser.Math.DEG_TO_RAD;
      const d = rng.between(c.r * 0.45, c.r * 0.75);
      this.drawPalm(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, recall);
    }

    this.add
      .text(c.x, c.y - c.r - 34, label, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#0b2a3d",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    if (!empty && recall < 1 && label !== "Home Island" && label !== "World Market") {
      this.add
        .text(c.x, c.y - c.r - 10, `recall ${Math.round(recall * 100)}%`, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: recall < 0.5 ? "#ffb4a2" : "#d8ffd8",
          stroke: "#0b2a3d",
          strokeThickness: 4,
        })
        .setOrigin(0.5);
    }
  }

  private drawPalm(x: number, y: number, health: number) {
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x000000, 0.2).fillEllipse(x + 6, y + 4, 34, 10);
    g.fillStyle(0x7a5230).fillRect(x - 3, y - 34, 6, 36);
    const leaf = health > 0.5 ? 0x2e8b3a : health > 0.25 ? 0x9a9a3a : 0x8b6b3a;
    g.fillStyle(leaf);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.fillEllipse(x + Math.cos(a) * 14, y - 36 + Math.sin(a) * 7, 26, 10);
    }
  }

  private drawStalls(c: Circle) {
    const colors = [0xff6b6b, 0xffd166, 0x06d6a0];
    colors.forEach((col, i) => {
      const x = c.x - 90 + i * 90;
      const y = c.y + 70;
      const g = this.add.graphics().setDepth(4);
      g.fillStyle(0x6b4423).fillRect(x - 28, y - 10, 56, 30);
      g.fillStyle(col).fillTriangle(x - 34, y - 10, x + 34, y - 10, x, y - 40);
    });
  }

  private addPortal(c: Circle, info: PortalInfo, color: number) {
    const ring = this.add.circle(c.x, c.y, 36, color, 0.25).setStrokeStyle(4, color, 0.9).setDepth(3);
    this.tweens.add({ targets: ring, scale: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 900 });
    this.portals.push({ x: c.x, y: c.y, info });
  }
}
