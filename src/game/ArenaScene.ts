import * as Phaser from "phaser";
import { bus } from "./bus";
import { makeTextures } from "./textures";
import type { Arena } from "@/lib/worldSpec";

// Generic sorting arena: the wanted category flips every 10s; touch labels that match it, dodge the rest.
// No fail state: the round ends once every item is sorted, mistakes are counted.
const ROOM = { w: 960, h: 600 };
const FLOOR = { x: 40, y: 110, w: 880, h: 450 };
const SWAP_SECONDS = 10;
const ON_FLOOR = 5;

export interface ArenaResult {
  correct: number;
  mistakes: number;
  answers: { label: string; correct: boolean }[];
}

type Bubble = Phaser.GameObjects.Container & { item: Arena["items"][number]; vx: number; vy: number };

export class ArenaScene extends Phaser.Scene {
  private arena!: Arena;
  private autoStart = true;
  private pool: Arena["items"] = [];
  private bubbles: Bubble[] = [];
  private player!: Phaser.GameObjects.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private banner!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private wanted: "A" | "B" = "A";
  private timeLeft = SWAP_SECONDS;
  private running = false;
  private result: ArenaResult = { correct: 0, mistakes: 0, answers: [] };
  private total = 0;
  private cooldownUntil = 0;

  constructor() {
    super("arena");
  }

  init(data: { arena: Arena; autoStart?: boolean }) {
    this.arena = data.arena;
    this.autoStart = data.autoStart ?? true;
    this.pool = Phaser.Utils.Array.Shuffle([...data.arena.items]);
    this.total = this.pool.length;
    this.bubbles = [];
    this.wanted = "A";
    this.timeLeft = SWAP_SECONDS;
    this.running = false;
    this.result = { correct: 0, mistakes: 0, answers: [] };
  }

  create() {
    makeTextures(this);
    const g = this.add.graphics();
    g.fillStyle(0x1b1b1f).fillRoundedRect(-30, -30, ROOM.w + 60, ROOM.h + 60, 36);
    g.fillStyle(0x1f4e5f).fillRect(0, 0, ROOM.w, ROOM.h);
    g.fillStyle(0x2c6e7f).fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
    g.lineStyle(1, 0x3c8496, 0.6);
    for (let x = FLOOR.x; x <= FLOOR.x + FLOOR.w; x += 55) g.lineBetween(x, FLOOR.y, x, FLOOR.y + FLOOR.h);
    for (let y = FLOOR.y; y <= FLOOR.y + FLOOR.h; y += 55) g.lineBetween(FLOOR.x, y, FLOOR.x + FLOOR.w, y);

    const style = { fontFamily: "monospace", fontSize: "18px", color: "#ffffff", stroke: "#000", strokeThickness: 5 };
    this.add.text(ROOM.w / 2, 22, this.arena.title, { ...style, fontSize: "20px" }).setOrigin(0.5, 0);
    this.banner = this.add.text(ROOM.w / 2, 62, "", style).setOrigin(0.5, 0).setDepth(1000);
    this.status = this.add.text(56, 528, "", style).setDepth(1000);

    this.player = this.add.sprite(ROOM.w / 2, FLOOR.y + FLOOR.h / 2, "player").setDepth(500);

    const fit = () => {
      const cam = this.cameras.main;
      cam.setZoom(Math.min(this.scale.width / (ROOM.w + 80), this.scale.height / (ROOM.h + 100)));
      cam.centerOn(ROOM.w / 2, ROOM.h / 2);
    };
    fit();
    this.scale.on("resize", fit);
    this.events.once("shutdown", () => this.scale.off("resize", fit));

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key>;

    this.banner.setText(this.arena.instructions);
    if (this.autoStart) this.begin();
    else {
      const off = bus.on("arena:begin", () => {
        off();
        this.begin();
      });
      this.events.once("shutdown", off);
    }
  }

  private begin() {
    this.running = true;
    this.setWanted("A");
    for (let i = 0; i < ON_FLOOR; i++) this.spawn();
  }

  private setWanted(c: "A" | "B") {
    this.wanted = c;
    this.timeLeft = SWAP_SECONDS;
    const cat = c === "A" ? this.arena.categoryA : this.arena.categoryB;
    this.banner.setText(`Collect: ${cat.name.toUpperCase()}  ·  ${cat.hint}`).setColor(c === "A" ? "#ffd166" : "#7fe0ff");
    this.cameras.main.flash(200, c === "A" ? 255 : 120, c === "A" ? 210 : 220, c === "A" ? 100 : 255);
  }

  update(time: number, dtMs: number) {
    const dt = dtMs / 1000;
    const k = this.keys;
    let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const len = Math.hypot(vx, vy) || 1;
    vx = (vx / len) * 260 * dt;
    vy = (vy / len) * 260 * dt;
    this.player.x = Phaser.Math.Clamp(this.player.x + vx, FLOOR.x + 16, FLOOR.x + FLOOR.w - 16);
    this.player.y = Phaser.Math.Clamp(this.player.y + vy, FLOOR.y + 20, FLOOR.y + FLOOR.h - 24);
    if (vx) this.player.setFlipX(vx < 0);

    if (!this.running) return;

    for (const b of [...this.bubbles]) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < FLOOR.x + 70 || b.x > FLOOR.x + FLOOR.w - 70) b.vx *= -1;
      if (b.y < FLOOR.y + 20 || b.y > FLOOR.y + FLOOR.h - 20) b.vy *= -1;
      if (time > this.cooldownUntil && Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) < 40) {
        this.collect(b, time);
      }
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.setWanted(this.wanted === "A" ? "B" : "A");
    this.status.setText(
      `sorted ${this.result.correct}/${this.total} · mistakes ${this.result.mistakes} · flip in ${Math.ceil(this.timeLeft)}s`,
    );
  }

  private collect(b: Bubble, time: number) {
    const ok = b.item.category === this.wanted;
    this.result.answers.push({ label: b.item.label, correct: ok });
    this.bubbles = this.bubbles.filter((x) => x !== b);
    b.destroy();
    if (ok) {
      this.result.correct++;
      this.float(this.player.x, this.player.y - 40, "✔", "#a5f3c4");
    } else {
      this.result.mistakes++;
      this.pool.push(b.item); // comes back later
      this.cooldownUntil = time + 600;
      this.cameras.main.shake(180, 0.008);
      const right = b.item.category === "A" ? this.arena.categoryA.name : this.arena.categoryB.name;
      this.float(this.player.x, this.player.y - 50, `"${b.item.label}" → ${right}`, "#ff8a80");
    }
    if (this.result.correct >= this.total) return this.finish();
    this.spawn();
  }

  private spawn() {
    const item = this.pool.shift();
    if (!item) return;
    let x = 0;
    let y = 0;
    do {
      x = Phaser.Math.Between(FLOOR.x + 90, FLOOR.x + FLOOR.w - 90);
      y = Phaser.Math.Between(FLOOR.y + 30, FLOOR.y + FLOOR.h - 30);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 120);
    const text = this.add.text(0, 0, item.label, {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#0b2a3d",
      wordWrap: { width: 150 },
      align: "center",
    }).setOrigin(0.5);
    const bg = this.add
      .rectangle(0, 0, text.width + 20, text.height + 12, 0xfff8e7)
      .setStrokeStyle(2, 0x0b2a3d);
    const c = this.add.container(x, y, [bg, text]).setDepth(400) as Bubble;
    c.item = item;
    const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
    c.vx = Math.cos(a) * 40;
    c.vy = Math.sin(a) * 40;
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 250, ease: "Back.easeOut" });
    this.bubbles.push(c);
  }

  private finish() {
    this.running = false;
    this.banner.setText("All sorted!").setColor("#ffffff");
    this.time.delayedCall(900, () => bus.emit("arena:done", { ...this.result }));
  }

  private float(x: number, y: number, msg: string, color: string) {
    const t = this.add
      .text(x, y, msg, { fontFamily: "monospace", fontSize: "16px", color, stroke: "#000", strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(999);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
  }
}
