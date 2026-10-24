import * as Phaser from "phaser";
import { bus } from "./bus";
import { makeTextures } from "./textures";
import { BOBO_QUOTES } from "@/content/bobo";

// "You are the model": playroom framed as a TV/observation screen.
// Condition swaps every 10s. Aggressive: keep hitting Bobo. Non-aggressive: collect tinker toys, never hit Bobo.
const ROOM = { x: 0, y: 0, w: 960, h: 600 };
const FLOOR = { x: 40, y: 150, w: 880, h: 410 };
const ROUND_SECONDS = 10;
const ROUNDS = 4;
const MAX_STRIKES = 3;

type Mode = "aggressive" | "quiet";

export interface ExperimentResult {
  passed: boolean;
  strikes: number;
  hits: number;
  toys: number;
  wrongHits: number;
}

export class ExperimentScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private mallet!: Phaser.GameObjects.Sprite;
  private bobos: Phaser.GameObjects.Sprite[] = [];
  private toys!: Phaser.GameObjects.Group;
  private kids: Phaser.GameObjects.Image[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private banner!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private strikeText!: Phaser.GameObjects.Text;
  private meterBar!: Phaser.GameObjects.Rectangle;
  private meterBg!: Phaser.GameObjects.Rectangle;

  private mode: Mode = "aggressive";
  private round = 0;
  private timeLeft = ROUND_SECONDS;
  private meter = 1;
  private running = false;
  private stats: ExperimentResult = { passed: false, strikes: 0, hits: 0, toys: 0, wrongHits: 0 };

  constructor() {
    super("experiment");
  }

  private autoStart = true;
  /** 0..1, how worked-up the watching children are; rises with hits, cools in quiet rounds */
  private agitation = 0;

  init(data: { autoStart?: boolean }) {
    this.autoStart = data.autoStart ?? true;
    this.agitation = 0;
    this.bobos = [];
    this.kids = [];
    this.mode = "aggressive";
    this.round = 0;
    this.timeLeft = ROUND_SECONDS;
    this.meter = 1;
    this.running = false;
    this.stats = { passed: false, strikes: 0, hits: 0, toys: 0, wrongHits: 0 };
  }

  create() {
    makeTextures(this);
    this.drawRoom();

    [
      [260, 300],
      [700, 280],
      [480, 470],
    ].forEach(([x, y]) => this.bobos.push(this.add.sprite(x, y, "bobo").setOrigin(0.5, 0.95).setDepth(y)));

    this.toys = this.add.group();
    for (let i = 0; i < 6; i++) this.spawnToy();

    this.player = this.add.sprite(480, 360, "player").setDepth(400);
    this.mallet = this.add.sprite(0, 0, "mallet").setOrigin(0.5, 1).setDepth(401);

    this.drawHud();
    this.fitCamera();
    this.scale.on("resize", this.fitCamera, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.fitCamera, this));

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.keys.SPACE.on("down", () => this.swing());

    if (this.autoStart) this.countdown();
    else {
      this.banner.setText("Observation room — waiting for the model…").setColor("#ffffff");
      const off = bus.on("experiment:begin", () => {
        off();
        this.countdown();
      });
      this.events.once("shutdown", off);
    }
  }

  private fitCamera() {
    const cam = this.cameras.main;
    cam.setZoom(Math.min(this.scale.width / (ROOM.w + 80), this.scale.height / (ROOM.h + 120)));
    cam.centerOn(ROOM.w / 2, ROOM.h / 2 + 10);
  }

  private countdown() {
    let n = 3;
    this.banner.setText("Get ready… you are the MODEL").setColor("#ffffff");
    const big = this.add
      .text(480, 330, "3", { fontFamily: "monospace", fontSize: "96px", color: "#ffffff", stroke: "#000", strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(1000);
    this.time.addEvent({
      delay: 800,
      repeat: 2,
      callback: () => {
        n--;
        if (n > 0) big.setText(String(n));
        else {
          big.destroy();
          this.running = true;
          this.setMode("aggressive");
        }
      },
    });
  }

  private setMode(mode: Mode) {
    this.mode = mode;
    this.timeLeft = ROUND_SECONDS;
    this.meter = 1;
    const aggressive = mode === "aggressive";
    this.banner
      .setText(aggressive ? "AGGRESSIVE MODEL — keep hitting Bobo! (SPACE)" : "NON-AGGRESSIVE MODEL — quietly collect tinker toys. Don't touch Bobo!")
      .setColor(aggressive ? "#ff8a80" : "#a5f3c4");
    this.meterBg.setVisible(aggressive);
    this.meterBar.setVisible(aggressive);
    this.mallet.setVisible(aggressive);
    this.kids.forEach((k) => k.setTexture(aggressive ? "kid-angry" : "kid-calm"));
    this.tintKids();
    this.cameras.main.flash(250, aggressive ? 255 : 120, aggressive ? 80 : 255, aggressive ? 80 : 160);
  }

  update(_t: number, dtMs: number) {
    const dt = dtMs / 1000;
    this.move(dt);
    this.mallet.setPosition(this.player.x + (this.player.flipX ? -14 : 14), this.player.y + 4);

    // auto-collect tinker toys on touch
    this.toys.getChildren().forEach((obj) => {
      const toy = obj as Phaser.GameObjects.Image;
      if (Phaser.Math.Distance.Between(toy.x, toy.y, this.player.x, this.player.y + 10) < 30) {
        toy.destroy();
        if (this.running && this.mode === "quiet") {
          this.stats.toys++;
          this.floatText(this.player.x, this.player.y - 40, "+1 tinker", "#a5f3c4");
        }
        this.spawnToy();
      }
    });

    if (!this.running) return;

    this.timeLeft -= dt;
    if (this.mode === "quiet" && this.agitation > 0) {
      this.agitation = Math.max(0, this.agitation - dt * 0.08);
      this.tintKids();
    }
    if (this.mode === "aggressive") {
      this.meter -= dt / 3; // empty after 3s without a hit
      if (this.meter <= 0) {
        this.strike("You stopped being aggressive!");
        this.meter = 1;
      }
      this.meterBar.width = 200 * Phaser.Math.Clamp(this.meter, 0, 1);
    }
    this.timerText.setText(`Round ${this.round + 1}/${ROUNDS} · swap in ${Math.ceil(this.timeLeft)}s`);

    if (this.timeLeft <= 0) {
      this.round++;
      if (this.round >= ROUNDS) return this.finish(true);
      this.setMode(this.mode === "aggressive" ? "quiet" : "aggressive");
    }
  }

  private move(dt: number) {
    const k = this.keys;
    let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const len = Math.hypot(vx, vy) || 1;
    vx = (vx / len) * 260 * dt;
    vy = (vy / len) * 260 * dt;
    this.player.x = Phaser.Math.Clamp(this.player.x + vx, FLOOR.x + 16, FLOOR.x + FLOOR.w - 16);
    this.player.y = Phaser.Math.Clamp(this.player.y + vy, FLOOR.y + 10, FLOOR.y + FLOOR.h - 24);
    if (vx) this.player.setFlipX(vx < 0);
  }

  private swing() {
    if (this.mode === "aggressive" && this.mallet.visible) {
      this.tweens.add({ targets: this.mallet, angle: this.player.flipX ? -90 : 90, duration: 90, yoyo: true });
    }
    const target = this.bobos.find(
      (b) => Phaser.Math.Distance.Between(b.x, b.y - 30, this.player.x, this.player.y) < 70,
    );
    if (!target) return;

    // weighted base: knocked over, springs back with a wobble
    const dir = this.player.x < target.x ? 1 : -1;
    this.tweens.killTweensOf(target);
    target.angle = 0;
    this.tweens.add({
      targets: target,
      angle: { from: 55 * dir, to: 0 },
      ease: "Elastic.easeOut",
      duration: 1100,
    });
    this.floatText(target.x, target.y - 100, Phaser.Utils.Array.GetRandom(BOBO_QUOTES), "#ffd166");

    if (!this.running) return;
    if (this.mode === "aggressive") {
      this.stats.hits++;
      this.meter = Math.min(1, this.meter + 0.6);
      this.agitation = Math.min(1, this.agitation + 0.12);
      this.kids.forEach((kid, i) => {
        // shake in place around a fixed home x (never drifts), tint redder as agitation builds
        const homeX = 170 + i * 88;
        this.tweens.killTweensOf(kid);
        kid.x = homeX;
        this.tweens.add({ targets: kid, x: homeX + 3, yoyo: true, repeat: 3, duration: 40, delay: i * 15 });
      });
      this.tintKids();
    } else {
      this.stats.wrongHits++;
      this.strike("The non-aggressive model never touches Bobo!");
    }
  }

  private tintKids() {
    // white -> deep red
    const gb = Math.round(255 * (1 - 0.65 * this.agitation));
    this.kids.forEach((k) => k.setTint(Phaser.Display.Color.GetColor(255, gb, gb)));
  }

  private strike(reason: string) {
    this.stats.strikes++;
    this.cameras.main.shake(250, 0.01);
    this.strikeText.setText("✖".repeat(this.stats.strikes) + "·".repeat(MAX_STRIKES - this.stats.strikes));
    this.floatText(this.player.x, this.player.y - 60, reason, "#ff8a80");
    if (this.stats.strikes >= MAX_STRIKES) this.finish(false);
  }

  private finish(passed: boolean) {
    this.running = false;
    this.stats.passed = passed;
    this.banner.setText(passed ? "Experiment complete! The children saw everything…" : "Experiment ruined — the conditions got mixed up.").setColor("#ffffff");
    this.timerText.setText("");
    this.meterBg.setVisible(false);
    this.meterBar.setVisible(false);
    this.time.delayedCall(1400, () => bus.emit("experiment:done", { ...this.stats }));
  }

  private spawnToy() {
    let x = 0;
    let y = 0;
    // keep toys away from the dolls so quiet play is possible
    do {
      x = Phaser.Math.Between(FLOOR.x + 30, FLOOR.x + FLOOR.w - 30);
      y = Phaser.Math.Between(FLOOR.y + 30, FLOOR.y + FLOOR.h - 30);
    } while (this.bobos.some((b) => Phaser.Math.Distance.Between(b.x, b.y - 30, x, y) < 90));
    const toy = this.add.image(x, y, "tinker").setDepth(y).setAngle(Phaser.Math.Between(-30, 30));
    this.toys.add(toy);
  }

  private floatText(x: number, y: number, msg: string, color: string) {
    const t = this.add
      .text(x, y, msg, { fontFamily: "monospace", fontSize: "18px", color, stroke: "#000", strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(999);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  private drawRoom() {
    const g = this.add.graphics();
    // TV bezel
    g.fillStyle(0x1b1b1f).fillRoundedRect(ROOM.x - 30, ROOM.y - 30, ROOM.w + 60, ROOM.h + 60, 36);
    g.lineStyle(4, 0x3a3a42).lineBetween(400, -30, 340, -90).lineBetween(560, -30, 620, -90);
    g.fillStyle(0xd62828).fillCircle(ROOM.w - 10, ROOM.h + 14, 6);
    // back wall + one-way mirror strip
    g.fillStyle(0xe9dcc4).fillRect(ROOM.x, ROOM.y, ROOM.w, FLOOR.y);
    g.fillStyle(0x253447).fillRect(120, 20, 720, 90);
    g.fillStyle(0x8fb3d9, 0.25).fillRect(120, 20, 720, 90);
    g.lineStyle(4, 0x5c4a36).strokeRect(120, 20, 720, 90);
    // floor
    g.fillStyle(0xcfa77a).fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
    g.lineStyle(1, 0xb88d60, 0.6);
    for (let y = FLOOR.y; y < FLOOR.y + FLOOR.h; y += 40) g.lineBetween(FLOOR.x, y, FLOOR.x + FLOOR.w, y);
    // side walls
    g.fillStyle(0xd8c8ab).fillRect(0, FLOOR.y, FLOOR.x, ROOM.h - FLOOR.y).fillRect(FLOOR.x + FLOOR.w, FLOOR.y, ROOM.w - FLOOR.x - FLOOR.w, ROOM.h - FLOOR.y);
    g.fillStyle(0xd8c8ab).fillRect(0, FLOOR.y + FLOOR.h, ROOM.w, ROOM.h - FLOOR.y - FLOOR.h);

    for (let i = 0; i < 8; i++) {
      this.kids.push(this.add.image(170 + i * 88, 72, "kid-calm").setScale(1.4).setAlpha(0.85));
    }
    this.add
      .text(480, 26, "one-way mirror — children observing", { fontFamily: "monospace", fontSize: "12px", color: "#cfe3f7" })
      .setOrigin(0.5, 0)
      .setAlpha(0.8);
  }

  private drawHud() {
    const style = { fontFamily: "monospace", fontSize: "18px", color: "#ffffff", stroke: "#000", strokeThickness: 5 };
    this.banner = this.add.text(480, 124, "", { ...style, fontSize: "17px" }).setOrigin(0.5).setDepth(1000);
    this.timerText = this.add.text(56, 528, "", style).setDepth(1000);
    this.strikeText = this.add.text(904, 528, "···", { ...style, color: "#ff8a80" }).setOrigin(1, 0).setDepth(1000);
    this.meterBg = this.add.rectangle(480, 540, 204, 16, 0x000000, 0.5).setDepth(1000).setVisible(false);
    this.meterBar = this.add.rectangle(380, 540, 200, 12, 0xff6b6b).setOrigin(0, 0.5).setDepth(1001).setVisible(false);
  }
}
