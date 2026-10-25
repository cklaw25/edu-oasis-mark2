import * as Phaser from "phaser";
import { bus } from "./bus";
import { burst, drawBackdrop, makeActionTextures, palette } from "./themes";
import type { Arena, Theme } from "@/lib/worldSpec";

// "Hold the Line": themed carriers fly down holding labels. Shoot the ones in category A, let category B
// pass. Friendly fire or letting an A through counts as a mistake (and that item comes back later).
const W = 960;
const H = 600;
const GROUND_Y = 540;
const ON_SCREEN = 4;

export interface ShooterResult {
  correct: number;
  mistakes: number;
  answers: { label: string; correct: boolean }[];
}

type Target = Phaser.GameObjects.Container & { item: Arena["items"][number]; speed: number; phase: number; baseX: number };

export class ShooterScene extends Phaser.Scene {
  private arena!: Arena;
  private theme?: Theme;
  private autoStart = true;
  private pool: Arena["items"] = [];
  private targets: Target[] = [];
  private bullets: Phaser.GameObjects.Image[] = [];
  private player!: Phaser.GameObjects.Sprite;
  private helmet!: Phaser.GameObjects.Ellipse;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private status!: Phaser.GameObjects.Text;
  private running = false;
  private lastShot = 0;
  private toResolve = 0;
  private result: ShooterResult = { correct: 0, mistakes: 0, answers: [] };

  constructor() {
    super("shooter");
  }

  init(data: { arena: Arena; theme?: Theme; autoStart?: boolean }) {
    this.arena = data.arena;
    this.theme = data.theme;
    this.autoStart = data.autoStart ?? true;
    this.pool = Phaser.Utils.Array.Shuffle([...data.arena.items]);
    this.toResolve = this.pool.length;
    this.targets = [];
    this.bullets = [];
    this.running = false;
    this.result = { correct: 0, mistakes: 0, answers: [] };
  }

  create() {
    makeActionTextures(this);
    const p = drawBackdrop(this, this.theme, W, H, GROUND_Y - 10);

    // trench / ground line
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(p.ground).fillRect(0, GROUND_Y, W, H - GROUND_Y);
    g.fillStyle(p.groundTop).fillRect(0, GROUND_Y, W, 8);
    if (this.theme === "war") {
      g.fillStyle(0xc2b280);
      for (let x = 0; x < W; x += 34) g.fillRoundedRect(x, GROUND_Y - 14, 32, 16, 6); // sandbags
    }
    this.add.rectangle(0, GROUND_Y - 30, W, 2, 0xffffff, 0.25).setOrigin(0).setDepth(4); // the line to hold

    this.player = this.add.sprite(W / 2, GROUND_Y - 22, "gunner").setDepth(50);
    this.helmet = this.add.ellipse(0, 0, 24, 12, p.helmet).setDepth(51); // theme-coloured helmet over the sprite

    const style = { fontFamily: "monospace", fontSize: "17px", color: "#ffffff", stroke: "#000", strokeThickness: 5 };
    const A = this.arena.categoryA.name;
    const B = this.arena.categoryB.name;
    this.add.rectangle(W / 2, 22, W, 44, 0x000000, 0.45).setDepth(999);
    this.add
      .text(W / 2, 22, `🎯 SHOOT: ${A.toUpperCase()}   ·   ✋ LET PASS: ${B.toUpperCase()}`, { ...style, color: p.text === "#0b2a3d" ? "#ffffff" : p.text })
      .setOrigin(0.5)
      .setDepth(1000);
    this.status = this.add.text(12, H - 30, "", { ...style, fontSize: "15px" }).setDepth(1000);

    const fit = () => {
      const cam = this.cameras.main;
      cam.setZoom(Math.min(this.scale.width / W, this.scale.height / H));
      cam.centerOn(W / 2, H / 2);
    };
    fit();
    this.scale.on("resize", fit);
    this.events.once("shutdown", () => this.scale.off("resize", fit));

    this.keys = this.input.keyboard!.addKeys("A,D,LEFT,RIGHT,SPACE,W,UP") as Record<string, Phaser.Input.Keyboard.Key>;

    if (this.autoStart) this.begin();
    else {
      const off = bus.on("shooter:begin", () => {
        off();
        this.begin();
      });
      this.events.once("shutdown", off);
    }
  }

  private begin() {
    this.running = true;
    for (let i = 0; i < ON_SCREEN; i++) this.time.delayedCall(i * 900, () => this.spawn());
  }

  update(time: number, dtMs: number) {
    const dt = dtMs / 1000;
    const k = this.keys;
    const vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    this.player.x = Phaser.Math.Clamp(this.player.x + vx * 360 * dt, 30, W - 30);
    if (vx) this.player.setFlipX(vx < 0);
    this.helmet.setPosition(this.player.x, this.player.y - 17);

    if (!this.running) return;

    if ((k.SPACE.isDown || k.W.isDown || k.UP.isDown) && time - this.lastShot > 220) {
      this.lastShot = time;
      const b = this.add.image(this.player.x + 10, this.player.y - 30, "bullet").setDepth(40);
      this.bullets.push(b);
      const flash = this.add.circle(b.x, b.y, 8, 0xfff3b0, 0.9).setDepth(41);
      this.tweens.add({ targets: flash, scale: 0, duration: 120, onComplete: () => flash.destroy() });
    }

    for (const b of [...this.bullets]) {
      b.y -= 700 * dt;
      const hit = this.targets.find((t) => Math.abs(t.x - b.x) < 75 && Math.abs(t.y - b.y) < 34);
      if (hit) {
        this.removeBullet(b);
        this.resolve(hit, "shot");
      } else if (b.y < 40) this.removeBullet(b);
    }

    for (const t of [...this.targets]) {
      t.phase += dt;
      t.y += t.speed * dt;
      t.x = t.baseX + Math.sin(t.phase * 1.6) * 40;
      if (t.y > GROUND_Y - 40) this.resolve(t, "passed");
    }

    this.status.setText(`✔ ${this.result.correct}   ✖ ${this.result.mistakes}   left ${this.toResolve}`);
  }

  private removeBullet(b: Phaser.GameObjects.Image) {
    this.bullets = this.bullets.filter((x) => x !== b);
    b.destroy();
  }

  private resolve(t: Target, how: "shot" | "passed") {
    this.targets = this.targets.filter((x) => x !== t);
    const isA = t.item.category === "A";
    const ok = (how === "shot" && isA) || (how === "passed" && !isA);
    this.result.answers.push({ label: t.item.label, correct: ok });
    const A = this.arena.categoryA.name;
    const B = this.arena.categoryB.name;
    if (ok) {
      this.result.correct++;
      this.toResolve--;
      if (how === "shot") {
        burst(this, t.x, t.y, palette(this.theme).accent, 26);
        this.cameras.main.shake(120, 0.006);
        this.float(t.x, t.y, "BOOM! ✔", "#a5f3c4");
      } else this.float(t.x, GROUND_Y - 60, `✔ let it pass (${B})`, "#a5f3c4");
    } else {
      this.result.mistakes++;
      this.pool.push(t.item); // comes back later
      this.cameras.main.flash(180, 255, 80, 80);
      this.cameras.main.shake(200, 0.01);
      if (how === "shot") burst(this, t.x, t.y, 0xff5555, 12);
      this.float(t.x, Math.min(t.y, GROUND_Y - 80), how === "shot" ? `Friendly fire! "${t.item.label}" is ${B}` : `"${t.item.label}" got through — it's ${A}!`, "#ff8a80");
    }
    t.destroy();
    if (this.toResolve <= 0) return this.finish();
    this.time.delayedCall(500, () => this.spawn());
  }

  private spawn() {
    if (!this.running) return;
    const item = this.pool.shift();
    if (!item) return;
    const p = palette(this.theme);
    const carrier = this.add.image(0, -26, p.carrier);
    const label = `${item.icon ?? ""} ${item.label}`.trim();
    const text = this.add
      .text(0, 14, label, { fontFamily: "monospace", fontSize: "15px", color: "#0b2a3d", align: "center", wordWrap: { width: 170 } })
      .setOrigin(0.5);
    const sign = this.add.rectangle(0, 14, text.width + 18, text.height + 10, 0xfff8e7).setStrokeStyle(2, 0x0b2a3d);
    const rope = this.add.line(0, 0, 0, -10, 0, 14 - text.height / 2 - 5, 0x333333).setOrigin(0);
    // pick a lane away from targets that are still near the top, so signs don't stack
    let baseX = Phaser.Math.Between(110, W - 110);
    for (let tries = 0; tries < 12 && this.targets.some((o) => o.y < 200 && Math.abs(o.baseX - baseX) < 220); tries++)
      baseX = Phaser.Math.Between(110, W - 110);
    const t = this.add.container(baseX, -40, [rope, carrier, sign, text]).setDepth(30) as Target;
    t.item = item;
    t.baseX = baseX;
    t.phase = Phaser.Math.FloatBetween(0, 6);
    t.speed = Phaser.Math.Between(32, 50);
    this.targets.push(t);
  }

  private finish() {
    this.running = false;
    this.time.delayedCall(700, () => bus.emit("shooter:done", { ...this.result }));
  }

  private float(x: number, y: number, msg: string, color: string) {
    const t = this.add
      .text(Phaser.Math.Clamp(x, 160, W - 160), y, msg, {
        fontFamily: "monospace",
        fontSize: "16px",
        color,
        stroke: "#000",
        strokeThickness: 4,
        wordWrap: { width: 320 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(1000);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1800, onComplete: () => t.destroy() });
  }
}
