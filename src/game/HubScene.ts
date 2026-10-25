import * as Phaser from "phaser";
import { bus } from "./bus";
import { makeAvatar, makeCamel, makePip, makeTextures } from "./textures";
import { FLAG_COLORS, cosmeticsFor } from "@/lib/cosmetics";
import { LABEL_FONTS, OBJECT_SPOTS, SHIRT_COLORS, WORLD_THEMES, type WorldTheme } from "@/lib/shop";
import type { IslandCosmetics, PlacedObject, PortalInfo, Profile, TreeStyle } from "@/lib/types";

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
// cosmetics shop, bridged off the World Market
const RAPID = { x: 1790, y: 2090, r: 170 };
const BRIDGE_HALF = 34;

// where the player was when the hub last ran, so restarts (new world, back from a world) don't teleport home
let lastPos: { x: number; y: number } | null = null;

// map zoom: mouse wheel, +/- keys or the HUD buttons; kept across hub restarts like lastPos
const ZOOM_DEFAULT = 0.75;
const ZOOM_MIN = 0.3; // whole map in view
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 1.2;
let lastZoom = ZOOM_DEFAULT;

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
  private theme: WorldTheme = WORLD_THEMES["theme-classic"];
  private font = "monospace";

  constructor() {
    super("hub");
  }

  init(data: { profile: Profile }) {
    this.profile = data.profile;
    this.land = [MAIN, ...SLOTS, MARKET, RAPID];
    this.bridges = [...SLOTS, MARKET].map((c) => ({ ax: MAIN.x, ay: MAIN.y, bx: c.x, by: c.y }));
    this.bridges.push({ ax: MARKET.x, ay: MARKET.y, bx: RAPID.x, by: RAPID.y });
    this.portals = [];
    this.nearPortal = null;
    this.theme = WORLD_THEMES[data.profile.theme] ?? WORLD_THEMES["theme-classic"];
    this.font = LABEL_FONTS[data.profile.font] ?? "monospace";
  }

  create() {
    makeTextures(this);
    this.drawOcean();
    this.bridges.forEach((b) => this.drawBridge(b));

    this.drawIsland(MAIN, 0x5cbf68, "Home Kata");
    SLOTS.forEach((c, i) => {
      const world = this.profile.worlds[i];
      const look = cosmeticsFor(this.profile, i);
      if (world) {
        const life = world.lifespan ?? world.recall;
        this.drawIsland(c, lerpColor(life), world.title, life, false, { lifespan: life, recall: world.recall }, look);
        // blue portal = bought on the World Market, white = grown from your own notes
        this.addPortal(c, { kind: "world", slot: i, world }, world.bought ? 0x7fe0ff : 0xffffff);
      } else {
        this.drawIsland(c, 0xd8c79a, "Empty Kata", 0, true, undefined, look);
        this.addPortal(c, { kind: "empty", slot: i, world: null }, 0xffffff);
      }
    });
    this.drawIsland(MARKET, 0x9d7be0, "World Market");
    this.drawStalls(MARKET);
    this.drawTradingStall(MARKET);
    this.addPortal(MARKET, { kind: "market" }, 0xffd166);
    this.drawIsland(RAPID, 0xf4a261, "Rapid Fire Market");
    this.drawRapidStand(RAPID);
    this.addPortal(RAPID, { kind: "rapid" }, 0xff70a6);

    // the player's Rapid Fire Market outfit and Pip look
    const spawn = lastPos ?? { x: MAIN.x, y: MAIN.y + 60 };
    const { shirt, hat } = this.profile.avatar;
    const avatar = makeAvatar(this, SHIRT_COLORS[shirt] ?? SHIRT_COLORS["shirt-blue"], hat);
    this.player = this.add.sprite(spawn.x, spawn.y, avatar).setDepth(10);
    this.pet = this.add.sprite(spawn.x - 40, spawn.y + 30, makePip(this, this.profile.pip)).setDepth(9);
    this.tweens.add({ targets: this.pet, scale: 1.15, yoyo: true, repeat: -1, duration: 600 });

    this.cameras.main.setBounds(0, 0, W, H).startFollow(this.player, true, 0.1, 0.1).setZoom(lastZoom);
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,PLUS,MINUS,NUMPAD_ADD,NUMPAD_SUBTRACT",
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    const enter = () => this.nearPortal && bus.emit("portal:enter", this.nearPortal);
    this.keys.E.on("down", enter);
    this.keys.SPACE.on("down", enter);
    bus.emit("portal:near", null); // clear any prompt left over from before a scene switch

    this.keys.PLUS.on("down", () => this.zoomBy(ZOOM_STEP));
    this.keys.NUMPAD_ADD.on("down", () => this.zoomBy(ZOOM_STEP));
    this.keys.MINUS.on("down", () => this.zoomBy(1 / ZOOM_STEP));
    this.keys.NUMPAD_SUBTRACT.on("down", () => this.zoomBy(1 / ZOOM_STEP));
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => this.zoomBy(dy > 0 ? 1 / 1.1 : 1.1));
    const offZoom = bus.on("map:zoom", (dir) =>
      dir === "reset" ? this.zoomTo(ZOOM_DEFAULT) : this.zoomBy(dir === "in" ? ZOOM_STEP : 1 / ZOOM_STEP),
    );
    this.events.once("shutdown", offZoom);

    // right-click one of the 3 islands (not Home or the markets) to open its cosmetics page
    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!p.rightButtonDown()) return;
      const slot = SLOTS.findIndex((c) => Phaser.Math.Distance.Between(p.worldX, p.worldY, c.x, c.y) < c.r);
      if (slot >= 0) bus.emit("island:cosmetics", slot);
    });
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

  private zoomBy(factor: number) {
    this.zoomTo(lastZoom * factor);
  }

  private zoomTo(z: number) {
    lastZoom = Phaser.Math.Clamp(z, ZOOM_MIN, ZOOM_MAX);
    // force: restart from the current zoom, so quick clicks or wheel ticks aren't dropped mid-animation
    this.cameras.main.zoomTo(lastZoom, 140, "Sine.easeOut", true);
  }

  private walkable(x: number, y: number) {
    const m = 14; // player radius margin
    return (
      this.land.some((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) < c.r - 22 - m) ||
      this.bridges.some((b) => distToSeg(x, y, b) < BRIDGE_HALF - m / 2)
    );
  }

  private drawOcean() {
    this.cameras.main.setBackgroundColor(this.theme.ocean); // past the map edge too
    this.add.rectangle(0, 0, W, H, this.theme.ocean).setOrigin(0);
    const rng = new Phaser.Math.RandomDataGenerator(["ocean"]);
    for (let i = 0; i < 260; i++) {
      const wave = this.add
        .rectangle(rng.between(0, W), rng.between(0, H), rng.between(14, 30), 3, this.theme.wave, 0.18)
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

  private drawIsland(
    c: Circle,
    grass: number,
    label: string,
    health = 1,
    empty = false,
    scores?: { lifespan: number; recall: number },
    look?: IslandCosmetics,
  ) {
    const g = this.add.graphics();
    g.fillStyle(this.theme.shallows, 0.5).fillCircle(c.x, c.y, c.r + 18); // shallow water
    g.fillStyle(0xf0d9a0).fillCircle(c.x, c.y, c.r); // sand
    g.fillStyle(grass, empty ? 0.35 : 1).fillCircle(c.x, c.y, c.r - 26);

    const rng = new Phaser.Math.RandomDataGenerator([label]);
    const trees = empty ? 0 : 6;
    for (let i = 0; i < trees; i++) {
      const a = rng.angle() * Phaser.Math.DEG_TO_RAD;
      const d = rng.between(c.r * 0.45, c.r * 0.75);
      this.drawTree(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, health, look?.trees ?? "palm");
    }
    const flag = FLAG_COLORS.find((f) => f.id === look?.flag);
    if (flag && flag.id !== "none") this.drawFlag(c.x + c.r * 0.5, c.y - c.r * 0.5, flag.hex);
    look?.objects.forEach((o) => this.drawObject(c, o));

    this.add
      .text(c.x, c.y - c.r - (scores ? 76 : 34), label, {
        fontFamily: this.font,
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#0b2a3d",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    if (scores) {
      // big: lifespan of the current review interval; small: predicted recall (forgetting curve)
      const color = (x: number) => (x < 0.25 ? "#ffb4a2" : x < 0.5 ? "#ffe0a3" : "#d8ffd8");
      this.add
        .text(c.x, c.y - c.r - 42, `${Math.round(scores.lifespan * 100)}%`, {
          fontFamily: this.font,
          fontSize: "34px",
          fontStyle: "bold",
          color: color(scores.lifespan),
          stroke: "#0b2a3d",
          strokeThickness: 6,
        })
        .setOrigin(0.5);
      this.add
        .text(c.x, c.y - c.r - 14, `recall ${Math.round(scores.recall * 100)}%`, {
          fontFamily: this.font,
          fontSize: "14px",
          color: color(scores.recall),
          stroke: "#0b2a3d",
          strokeThickness: 4,
        })
        .setOrigin(0.5);
    }
  }

  private drawTree(x: number, y: number, health: number, style: TreeStyle) {
    if (style === "palm") return this.drawPalm(x, y, health);
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x000000, 0.2).fillEllipse(x + 6, y + 4, 34, 10);
    if (style === "pine") {
      g.fillStyle(0x6b4423).fillRect(x - 3, y - 12, 6, 14);
      g.fillStyle(health > 0.5 ? 0x1f6b3a : health > 0.25 ? 0x6f7a3a : 0x7a6a3a);
      g.fillTriangle(x - 18, y - 10, x + 18, y - 10, x, y - 34);
      g.fillTriangle(x - 14, y - 24, x + 14, y - 24, x, y - 46);
      return;
    }
    // blossom
    g.fillStyle(0x7a5230).fillRect(x - 3, y - 26, 6, 28);
    g.fillStyle(health > 0.5 ? 0xff9ecb : health > 0.25 ? 0xe8b9c9 : 0xc9a99a);
    g.fillCircle(x, y - 34, 13).fillCircle(x - 12, y - 28, 10).fillCircle(x + 12, y - 28, 10);
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

  private drawFlag(x: number, y: number, color: number) {
    const g = this.add.graphics().setDepth(6);
    g.fillStyle(0x000000, 0.2).fillEllipse(x + 4, y + 2, 16, 6);
    g.fillStyle(0x4a2f18).fillRect(x - 2, y - 56, 4, 58);
    g.fillStyle(color).fillTriangle(x + 2, y - 56, x + 2, y - 34, x + 32, y - 45);
  }

  /** A Rapid Fire Market object standing on one of the island's edge spots, painted its chosen colour. */
  private drawObject(c: Circle, o: PlacedObject) {
    const a = (o.spot / OBJECT_SPOTS) * Math.PI * 2 - Math.PI / 2;
    const x = c.x + Math.cos(a) * (c.r - 62);
    const y = c.y + Math.sin(a) * (c.r - 62);
    const col = Phaser.Display.Color.HexStringToColor(o.color).color;
    const g = this.add.graphics().setDepth(6);
    g.fillStyle(0x000000, 0.2).fillEllipse(x + 4, y + 4, 34, 10);
    if (o.item === "obj-rock") {
      g.fillStyle(col).fillEllipse(x, y - 8, 36, 24).fillStyle(0xffffff, 0.25).fillEllipse(x - 6, y - 13, 12, 6);
    } else if (o.item === "obj-sign") {
      g.fillStyle(0x6b4423).fillRect(x - 2, y - 36, 4, 38);
      g.fillStyle(col).fillRect(x - 18, y - 40, 36, 18);
    } else if (o.item === "obj-lantern") {
      g.fillStyle(0x333333).fillRect(x - 2, y - 44, 4, 46);
      g.fillStyle(col).fillRoundedRect(x - 9, y - 58, 18, 18, 4).fillStyle(0xfff3b0, 0.8).fillCircle(x, y - 49, 4);
    } else if (o.item === "obj-bench") {
      g.fillStyle(col).fillRect(x - 22, y - 16, 44, 6).fillRect(x - 22, y - 28, 44, 5);
      g.fillStyle(0x4a2f18).fillRect(x - 20, y - 10, 4, 10).fillRect(x + 16, y - 10, 4, 10);
    } else if (o.item === "obj-statue") {
      g.fillStyle(0x9e9e9e).fillRect(x - 14, y - 12, 28, 12);
      g.fillStyle(col).fillRect(x - 7, y - 40, 14, 28).fillCircle(x, y - 46, 8);
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

  // World Market trading post (the market's Trading tab): a tent stall with a TRADE sign and a camel beside it
  private drawTradingStall(c: Circle) {
    const x = c.x + 60;
    const y = c.y - 70;
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x000000, 0.2).fillEllipse(x + 4, y + 22, 76, 12);
    g.fillStyle(0x6b4423).fillRect(x - 32, y - 4, 64, 26); // counter
    g.fillStyle(0x8338ec).fillTriangle(x - 40, y - 4, x + 40, y - 4, x, y - 48); // tent roof
    g.fillStyle(0xffd166).fillTriangle(x - 12, y - 4, x + 12, y - 4, x, y - 30);
    g.fillStyle(0xfff8e7).fillRect(x - 24, y + 2, 48, 12); // sign board
    this.add
      .text(x, y + 8, "⇄ TRADE", { fontFamily: "monospace", fontSize: "11px", fontStyle: "bold", color: "#3d2a73" })
      .setOrigin(0.5)
      .setDepth(5);
    const camel = this.add.image(x + 74, y + 2, makeCamel(this)).setDepth(6); // in front of the palm trees
    // the camel breathes and shifts its weight now and then
    this.tweens.add({ targets: camel, scaleY: 1.04, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.easeInOut" });
  }

  // Rapid Fire Market: a striped awning stand with a lightning sign
  private drawRapidStand(c: Circle) {
    const g = this.add.graphics().setDepth(4);
    const x = c.x;
    const y = c.y + 60;
    g.fillStyle(0x6b4423).fillRect(x - 60, y - 6, 120, 34);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 ? 0xffffff : 0xff70a6).fillRect(x - 66 + i * 22, y - 30, 22, 24);
    }
    g.fillStyle(0xffd166).fillTriangle(x + 4, y - 74, x - 14, y - 46, x, y - 46).fillTriangle(x, y - 52, x + 14, y - 52, x - 4, y - 24);
  }

  private addPortal(c: Circle, info: PortalInfo, color: number) {
    const ring = this.add.circle(c.x, c.y, 36, color, 0.25).setStrokeStyle(4, color, 0.9).setDepth(3);
    this.tweens.add({ targets: ring, scale: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 900 });
    this.portals.push({ x: c.x, y: c.y, info });
  }
}
