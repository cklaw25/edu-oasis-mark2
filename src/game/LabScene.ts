import * as Phaser from "phaser";
import { bus } from "./bus";
import { makeTextures } from "./textures";
import { CLUES } from "@/content/bobo";

// Peer Review: walk Bandura's lab, inspect objects (E) to judge strengths/weaknesses while dodging Prof. Skeptic.
const ROOM = { w: 1000, h: 640 };
const SKEPTIC_SPEED = 75; // +6 per reviewed object
const SKEPTIC_QUIPS = ["Can you generalise that?!", "Demand characteristics!", "Where's your ethics form?", "Lab ≠ real life!"];

export class LabScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private skeptic!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private markers = new Map<string, Phaser.GameObjects.Text>();
  private hint!: Phaser.GameObjects.Text;
  private heartsText!: Phaser.GameObjects.Text;
  private resolved = new Set<string>();
  private hearts = 3;
  private nearId: string | null = null;
  private invulnerableUntil = 0;
  private offResolved?: () => void;

  constructor() {
    super("lab");
  }

  init() {
    this.markers.clear();
    this.resolved = new Set();
    this.hearts = 3;
    this.nearId = null;
    this.invulnerableUntil = 0;
  }

  create() {
    makeTextures(this);
    this.drawRoom();

    CLUES.forEach((c) => {
      this.add.text(c.x, c.y, c.icon, { fontSize: "44px" }).setOrigin(0.5).setDepth(c.y);
      this.add
        .text(c.x, c.y + 34, c.label, { fontFamily: "monospace", fontSize: "13px", color: "#2b2118" })
        .setOrigin(0.5);
      const marker = this.add
        .text(c.x + 26, c.y - 30, "?", { fontFamily: "monospace", fontSize: "22px", color: "#ffd166", stroke: "#000", strokeThickness: 4 })
        .setOrigin(0.5)
        .setDepth(900);
      this.tweens.add({ targets: marker, y: marker.y - 6, yoyo: true, repeat: -1, duration: 500 });
      this.markers.set(c.id, marker);
    });

    this.player = this.add.sprite(500, 420, "player").setDepth(500);
    this.skeptic = this.add
      .text(940, 80, "🧐", { fontSize: "40px" })
      .setOrigin(0.5)
      .setDepth(600);

    const style = { fontFamily: "monospace", fontSize: "18px", color: "#ffffff", stroke: "#000", strokeThickness: 5 };
    this.hint = this.add.text(500, 610, "", style).setOrigin(0.5).setDepth(1000);
    this.heartsText = this.add.text(20, 14, "", style).setDepth(1000);
    this.add
      .text(980, 14, "PEER REVIEW — inspect every object", { ...style, fontSize: "15px" })
      .setOrigin(1, 0)
      .setDepth(1000);
    this.updateHud();

    this.cameras.main.setBackgroundColor("#1b1b1f");
    const fit = () => {
      const cam = this.cameras.main;
      cam.setZoom(Math.min(this.scale.width / (ROOM.w + 40), this.scale.height / (ROOM.h + 40)));
      cam.centerOn(ROOM.w / 2, ROOM.h / 2);
    };
    fit();
    this.scale.on("resize", fit);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    const inspect = () => {
      if (this.nearId && !this.resolved.has(this.nearId)) bus.emit("lab:inspect", this.nearId);
    };
    this.keys.E.on("down", inspect);
    this.keys.SPACE.on("down", inspect);

    this.offResolved = bus.on("lab:resolved", (p) => {
      const { id, correct } = p as { id: string; correct: boolean };
      this.resolved.add(id);
      const m = this.markers.get(id);
      if (m) {
        this.tweens.killTweensOf(m);
        m.setText(correct ? "✔" : "✖").setColor(correct ? "#a5f3c4" : "#ff8a80");
      }
      if (this.resolved.size === CLUES.length) {
        this.time.delayedCall(600, () => bus.emit("lab:done", { hearts: this.hearts }));
      }
    });
    this.events.once("shutdown", () => {
      this.offResolved?.();
      this.scale.off("resize", fit);
    });
  }

  update(time: number, dtMs: number) {
    const dt = dtMs / 1000;
    const k = this.keys;
    let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const len = Math.hypot(vx, vy) || 1;
    vx = (vx / len) * 250 * dt;
    vy = (vy / len) * 250 * dt;
    this.player.x = Phaser.Math.Clamp(this.player.x + vx, 60, ROOM.w - 60);
    this.player.y = Phaser.Math.Clamp(this.player.y + vy, 80, ROOM.h - 60);
    if (vx) this.player.setFlipX(vx < 0);

    const near = CLUES.find((c) => Phaser.Math.Distance.Between(c.x, c.y, this.player.x, this.player.y) < 60);
    this.nearId = near?.id ?? null;
    this.hint.setText(
      near ? (this.resolved.has(near.id) ? `${near.label} — reviewed` : `E — inspect ${near.label}`) : "",
    );

    // Prof. Skeptic chases; getting caught costs a heart
    const done = this.resolved.size === CLUES.length;
    if (!done) {
      const speed = SKEPTIC_SPEED + this.resolved.size * 6;
      const a = Phaser.Math.Angle.Between(this.skeptic.x, this.skeptic.y, this.player.x, this.player.y);
      this.skeptic.x += Math.cos(a) * speed * dt;
      this.skeptic.y += Math.sin(a) * speed * dt;
      if (
        time > this.invulnerableUntil &&
        Phaser.Math.Distance.Between(this.skeptic.x, this.skeptic.y, this.player.x, this.player.y) < 34
      ) {
        this.hearts = Math.max(0, this.hearts - 1);
        this.invulnerableUntil = time + 1500;
        this.cameras.main.shake(200, 0.01);
        this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 5, duration: 120 });
        const quip = this.add
          .text(this.skeptic.x, this.skeptic.y - 40, Phaser.Utils.Array.GetRandom(SKEPTIC_QUIPS), {
            fontFamily: "monospace",
            fontSize: "15px",
            color: "#ff8a80",
            stroke: "#000",
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(999);
        this.tweens.add({ targets: quip, y: quip.y - 30, alpha: 0, duration: 1400, onComplete: () => quip.destroy() });
        // knock Skeptic back to a corner
        this.skeptic.setPosition(this.player.x < ROOM.w / 2 ? 940 : 60, this.player.y < ROOM.h / 2 ? 580 : 80);
        this.updateHud();
      }
    }
  }

  private updateHud() {
    this.heartsText.setText("❤".repeat(this.hearts) + "♡".repeat(3 - this.hearts));
  }

  private drawRoom() {
    const g = this.add.graphics();
    g.fillStyle(0xe9dcc4).fillRect(0, 0, ROOM.w, ROOM.h);
    g.fillStyle(0xd9c7a5);
    for (let x = 0; x < ROOM.w; x += 50)
      for (let y = 50; y < ROOM.h; y += 50) if (((x + y) / 50) % 2 === 0) g.fillRect(x, y, 50, 50);
    g.fillStyle(0x8b6b4a).fillRect(0, 0, ROOM.w, 46);
    g.lineStyle(10, 0x5c4a36).strokeRect(0, 0, ROOM.w, ROOM.h);
    this.add
      .text(500, 23, "Bandura's Lab · Stanford, 1961", { fontFamily: "monospace", fontSize: "16px", color: "#fff8e7" })
      .setOrigin(0.5);
  }
}
