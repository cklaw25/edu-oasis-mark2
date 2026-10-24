import * as Phaser from "phaser";
import { bus } from "./bus";
import { makeTextures } from "./textures";
import { burst, drawBackdrop, makeActionTextures, palette } from "./themes";
import type { Sequence, Theme } from "@/lib/worldSpec";

// "Timeline Run": a side-scrolling platformer. Each checkpoint has two one-way bridges over a pit (low and
// high), labelled with steps. Land on the step that comes NEXT; the wrong bridge crumbles and you fall back.
const H = 600;
const GROUND_TOP = 470;
const HIGH_TOP = 360;
const SEG = 260; // solid ground per checkpoint
const PIT = 320; // bridge length
const START = 320;

export interface RunnerResult {
  correct: number;
  mistakes: number;
  answers: { label: string; correct: boolean }[];
}

type Bridge = Phaser.GameObjects.Rectangle & { step: number; correct: boolean; done: boolean; label: Phaser.GameObjects.Text };

export class RunnerScene extends Phaser.Scene {
  private seq!: Sequence;
  private theme?: Theme;
  private autoStart = true;
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private checkpointX = 120;
  private stepIdx = 0;
  private running = false;
  private worldW = 0;
  private prompt!: Phaser.GameObjects.Text;
  private detail!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private result: RunnerResult = { correct: 0, mistakes: 0, answers: [] };
  private stars: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("runner");
  }

  init(data: { sequence: Sequence; theme?: Theme; autoStart?: boolean }) {
    this.seq = data.sequence;
    this.theme = data.theme;
    this.autoStart = data.autoStart ?? true;
    this.stepIdx = 0;
    this.checkpointX = 120;
    this.running = false;
    this.result = { correct: 0, mistakes: 0, answers: [] };
    this.stars = [];
  }

  create() {
    makeTextures(this);
    makeActionTextures(this);
    const steps = this.seq.steps;
    this.worldW = START + steps.length * (SEG + PIT) + 500;
    const p = drawBackdrop(this, this.theme, this.worldW, H, GROUND_TOP);
    this.physics.world.gravity.y = 1500;
    this.physics.world.setBounds(0, 0, this.worldW, H + 200);

    const grounds = this.physics.add.staticGroup();
    const addGround = (x: number, w: number) => {
      const r = this.add.rectangle(x, GROUND_TOP, w, H - GROUND_TOP + 60, p.ground).setOrigin(0).setDepth(5);
      this.add.rectangle(x, GROUND_TOP, w, 10, p.groundTop).setOrigin(0).setDepth(6);
      grounds.add(r);
    };
    addGround(0, START);

    const bridges: Bridge[] = [];
    steps.forEach((_, i) => {
      const pitX = START + i * (SEG + PIT);
      const nextGroundX = pitX + PIT;
      // distractor: another step (a later one if possible) shown too early
      const later = steps.map((_, j) => j).filter((j) => j > i);
      const pool = later.length ? later : steps.map((_, j) => j).filter((j) => j !== i);
      const wrong = Phaser.Utils.Array.GetRandom(pool);
      const correctHigh = Math.random() < 0.5;
      [
        { step: i, correct: true, top: correctHigh ? HIGH_TOP : GROUND_TOP },
        { step: wrong, correct: false, top: correctHigh ? GROUND_TOP : HIGH_TOP },
      ].forEach((o) => bridges.push(this.makeBridge(pitX, o.top, o.step, o.correct)));
      // checkpoint flag
      this.add.text(nextGroundX + 20, GROUND_TOP - 40, "🚩", { fontSize: "26px" }).setDepth(7);
      addGround(nextGroundX, SEG);
      this.addStars(nextGroundX + 60, 3);
    });
    const endX = START + steps.length * (SEG + PIT);
    addGround(endX, 500);
    this.add.text(endX + 160, GROUND_TOP - 70, "🏁", { fontSize: "56px" }).setDepth(7);

    this.player = this.physics.add.sprite(120, GROUND_TOP - 40, "player").setDepth(50);
    this.player.setSize(22, 42).setCollideWorldBounds(false);
    this.physics.add.collider(this.player, grounds);
    bridges.forEach((b) => this.physics.add.collider(this.player, b, () => this.land(b)));

    this.cameras.main.setBounds(0, 0, this.worldW, H).startFollow(this.player, true, 0.12, 0.12, -150, 0);
    const style = { fontFamily: "monospace", fontSize: "17px", color: "#ffffff", stroke: "#000", strokeThickness: 5 };
    // HUD lives in screen pixels: a fixed container whose scale cancels the camera zoom
    const bar = this.add.rectangle(0, 0, 4000, 46, 0x000000, 0.45).setOrigin(0);
    this.prompt = this.add.text(220, 12, "", style); // clear of the React "Back to islands" button
    this.status = this.add.text(0, 12, "", style).setOrigin(1, 0);
    // fact pop-up sits under the top bar so it never covers a bridge label
    this.detail = this.add
      .text(0, 54, "", { ...style, fontSize: "15px", color: "#fff3b0", wordWrap: { width: 860 }, align: "center", backgroundColor: "#00000088", padding: { x: 10, y: 6 } })
      .setOrigin(0.5, 0);
    const hud = this.add.container(0, 0, [bar, this.prompt, this.status, this.detail]).setScrollFactor(0).setDepth(1000);

    const fit = () => {
      const cam = this.cameras.main;
      const z = Math.min(this.scale.width / 960, this.scale.height / H);
      cam.setZoom(z);
      hud.setScale(1 / z).setPosition(cam.width / 2 - cam.width / (2 * z), cam.height / 2 - cam.height / (2 * z));
      this.status.setX(cam.width - 16);
      this.detail.setX(cam.width / 2);
    };
    fit();
    this.scale.on("resize", fit);
    this.events.once("shutdown", () => this.scale.off("resize", fit));

    this.keys = this.input.keyboard!.addKeys("A,D,LEFT,RIGHT,W,UP,SPACE") as Record<string, Phaser.Input.Keyboard.Key>;
    this.updateHud();

    if (this.autoStart) this.running = true;
    else {
      const off = bus.on("runner:begin", () => {
        off();
        this.running = true;
      });
      this.events.once("shutdown", off);
    }
  }

  private makeBridge(x: number, top: number, step: number, correct: boolean): Bridge {
    const s = this.seq.steps[step];
    const b = this.add.rectangle(x, top, PIT, 18, 0x8a5a32).setOrigin(0).setStrokeStyle(3, 0x4a2f18).setDepth(8) as Bridge;
    this.physics.add.existing(b, true);
    const body = b.body as Phaser.Physics.Arcade.StaticBody;
    // one-way: you can jump up through a bridge from below
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    b.step = step;
    b.correct = correct;
    b.done = false;
    b.label = this.add
      .text(x + PIT / 2, top - 6, `${s.icon} ${s.label}`, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#0b2a3d",
        backgroundColor: "#fff8e7",
        padding: { x: 8, y: 4 },
        wordWrap: { width: PIT - 30 },
        align: "center",
      })
      .setOrigin(0.5, 1)
      .setDepth(9);
    return b;
  }

  private land(b: Bridge) {
    if (b.done || !this.running || !(this.player.body as Phaser.Physics.Arcade.Body).touching.down) return;
    b.done = true;
    const s = this.seq.steps[b.step];
    this.result.answers.push({ label: s.label, correct: b.correct });
    if (b.correct) {
      this.result.correct++;
      b.setFillStyle(0x4fb35a).setStrokeStyle(3, 0x1f6b2a);
      burst(this, this.player.x, this.player.y, 0x4fb35a, 20);
      this.detail.setText(`✔ ${s.icon} ${s.label}: ${s.detail}`);
      this.stepIdx = b.step + 1;
      this.checkpointX = START + this.stepIdx * (SEG + PIT) + 40;
      this.updateHud();
    } else {
      this.result.mistakes++;
      this.detail.setText(`✖ "${s.label}" isn't next — it comes ${b.step > this.stepIdx ? "later" : "earlier"}!`);
      this.cameras.main.shake(200, 0.01);
      this.tweens.add({ targets: b, x: b.x + 4, yoyo: true, repeat: 4, duration: 40 });
      this.time.delayedCall(260, () => {
        (b.body as Phaser.Physics.Arcade.StaticBody).enable = false;
        this.tweens.add({ targets: [b, b.label], y: "+=160", alpha: 0, duration: 600 });
      });
      this.updateHud();
    }
  }

  private addStars(x: number, n: number) {
    for (let i = 0; i < n; i++) {
      const star = this.add.text(x + i * 50, GROUND_TOP - 60, "⭐", { fontSize: "22px" }).setDepth(7);
      this.tweens.add({ targets: star, y: star.y - 8, yoyo: true, repeat: -1, duration: 600 + i * 80 });
      this.stars.push(star);
    }
  }

  private updateHud() {
    const n = this.seq.steps.length;
    const prev = this.stepIdx > 0 ? this.seq.steps[this.stepIdx - 1] : null;
    this.prompt.setText(
      this.stepIdx >= n
        ? "🏁 Run to the finish flag!"
        : prev
          ? `What comes after ${prev.icon} ${prev.label}?`
          : `${this.seq.title}: which comes FIRST?`,
    );
    this.status.setText(`step ${Math.min(this.stepIdx + 1, n)}/${n}  ✖ ${this.result.mistakes}`);
  }

  update() {
    if (!this.player?.body) return;
    const k = this.keys;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const vx = this.running ? (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0) : 0;
    this.player.setVelocityX(vx * 250);
    if (vx) this.player.setFlipX(vx < 0);
    if (this.running && (k.W.isDown || k.UP.isDown || k.SPACE.isDown) && body.blocked.down) this.player.setVelocityY(-660);

    // collectible stars (just for feel)
    this.stars = this.stars.filter((star) => {
      if (Phaser.Math.Distance.Between(star.x + 11, star.y + 11, this.player.x, this.player.y) > 30) return true;
      burst(this, star.x + 11, star.y + 11, 0xffd166, 10);
      star.destroy();
      return false;
    });

    // fell into a pit → back to the last checkpoint
    if (this.player.y > H + 80) {
      this.player.setPosition(this.checkpointX, GROUND_TOP - 40).setVelocity(0, 0);
      this.cameras.main.flash(150, 255, 255, 255);
    }

    if (this.running && this.stepIdx >= this.seq.steps.length && this.player.x > this.worldW - 360) {
      this.running = false;
      burst(this, this.player.x, this.player.y - 40, palette(this.theme).accent, 40);
      this.time.delayedCall(800, () => bus.emit("runner:done", { ...this.result }));
    }
  }
}
