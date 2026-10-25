import * as Phaser from "phaser";
import { bus } from "./bus";
import { makeTextures } from "./textures";
import { burst, drawBackdrop, makeActionTextures, palette } from "./themes";
import type { Showdown, Theme } from "@/lib/worldSpec";

// "Showdown": a top-down survival shooter. Every fighter attacks with the thing it is known for (Tesla throws ⚡,
// Newton throws 🍎), so watching the attacks teaches the pairs. The poster names a thing; take down whoever owns it.
const W = 960;
const H = 600;
const TOP = 110; // arena floor starts below the sky strip
const HEARTS = 5;
const ON_SCREEN = 3;

export interface ShowdownResult {
  correct: number;
  mistakes: number;
  knockouts: number;
  answers: { label: string; correct: boolean }[];
}

type Fighter = Showdown["fighters"][number];
type Npc = Phaser.GameObjects.Container & {
  f: Fighter;
  hp: number;
  nextThrow: number;
  strafe: number;
  stunUntil: number;
  wrongFor: number; // index of the wanted round this fighter was already wrongly shot in
};
type Shot = Phaser.GameObjects.Container & { vx: number; vy: number; spin?: Phaser.GameObjects.Text };

export class ShowdownScene extends Phaser.Scene {
  private sd!: Showdown;
  private theme?: Theme;
  private autoStart = true;
  private order: Fighter[] = [];
  private round = 0;
  private npcs: Npc[] = [];
  private bullets: Shot[] = [];
  private shots: Shot[] = [];
  private player!: Phaser.GameObjects.Sprite;
  private gun!: Phaser.GameObjects.Rectangle;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private hearts = HEARTS;
  private invulnUntil = 0;
  private lastShot = 0;
  private running = false;
  private poster!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private result: ShowdownResult = { correct: 0, mistakes: 0, knockouts: 0, answers: [] };

  constructor() {
    super("showdown");
  }

  init(data: { showdown: Showdown; theme?: Theme; autoStart?: boolean }) {
    this.sd = data.showdown;
    this.theme = data.theme;
    this.autoStart = data.autoStart ?? true;
    this.order = Phaser.Utils.Array.Shuffle([...data.showdown.fighters]);
    this.round = 0;
    this.npcs = [];
    this.bullets = [];
    this.shots = [];
    this.hearts = HEARTS;
    this.invulnUntil = 0;
    this.running = false;
    this.result = { correct: 0, mistakes: 0, knockouts: 0, answers: [] };
  }

  get wanted(): Fighter | undefined {
    return this.order[this.round];
  }

  create() {
    makeTextures(this);
    makeActionTextures(this);
    const p = drawBackdrop(this, this.theme, W, H, TOP);
    // arena floor with a few scuffs
    const floor = this.add.graphics().setDepth(-40);
    floor.fillStyle(p.ground).fillRect(0, TOP, W, H - TOP);
    floor.fillStyle(p.groundTop).fillRect(0, TOP, W, 8);
    const rng = new Phaser.Math.RandomDataGenerator(["floor"]);
    // floor tiles so the arena reads as a place, not a blank
    floor.lineStyle(2, 0x000000, 0.08);
    for (let x = 0; x <= W; x += 80) floor.lineBetween(x, TOP, x, H);
    for (let y = TOP; y <= H; y += 80) floor.lineBetween(0, y, W, y);
    floor.fillStyle(0x000000, 0.06);
    for (let i = 0; i < 24; i++) floor.fillEllipse(rng.between(0, W), rng.between(TOP + 20, H), rng.between(30, 90), rng.between(10, 26));

    this.player = this.add.sprite(W / 2, (TOP + H) / 2, "player").setDepth(50);
    this.gun = this.add.rectangle(0, 0, 22, 6, 0x333333).setOrigin(0, 0.5).setDepth(51);

    const style = { fontFamily: "monospace", fontSize: "18px", color: "#ffffff", stroke: "#000", strokeThickness: 5 };
    this.add.rectangle(W / 2, 26, W, 52, 0x000000, 0.5).setDepth(999);
    this.poster = this.add.text(W / 2, 26, "", { ...style, fontSize: "20px", color: "#ffd166" }).setOrigin(0.5).setDepth(1000);
    this.status = this.add.text(12, H - 30, "", { ...style, fontSize: "15px" }).setDepth(1000);

    const fit = () => {
      const cam = this.cameras.main;
      cam.setZoom(Math.min(this.scale.width / W, this.scale.height / H));
      cam.centerOn(W / 2, H / 2);
    };
    fit();
    this.scale.on("resize", fit);
    this.events.once("shutdown", () => this.scale.off("resize", fit));

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE") as Record<string, Phaser.Input.Keyboard.Key>;
    this.updateHud();

    if (this.autoStart) this.begin();
    else {
      const off = bus.on("showdown:begin", () => {
        off();
        this.begin();
      });
      this.events.once("shutdown", off);
    }
  }

  private begin() {
    this.running = true;
    this.fill();
    this.updateHud();
  }

  /** Make sure the wanted fighter is in the arena, plus decoys up to ON_SCREEN. */
  private fill() {
    const w = this.wanted;
    if (!w) return;
    const here = (f: Fighter) => this.npcs.some((n) => n.f === f);
    if (!here(w)) this.spawn(w);
    const decoys = Phaser.Utils.Array.Shuffle(this.sd.fighters.filter((f) => !here(f)));
    while (this.npcs.length < Math.min(ON_SCREEN, this.sd.fighters.length) && decoys.length) this.spawn(decoys.shift()!);
  }

  private spawn(f: Fighter) {
    // enter from the edge furthest from the player
    const left = this.player.x > W / 2;
    const x = left ? 40 : W - 40;
    const y = Phaser.Math.Between(TOP + 60, H - 60);
    const color = Phaser.Display.Color.HSVToRGB((this.sd.fighters.indexOf(f) * 0.17) % 1, 0.55, 0.85).color;
    const shadow = this.add.ellipse(0, 30, 50, 14, 0x000000, 0.25);
    const body = this.add.circle(0, 14, 20, color).setStrokeStyle(3, 0x222222);
    const face = this.add.text(0, -8, f.avatar, { fontSize: "38px" }).setOrigin(0.5);
    const tag = this.add
      .text(0, -42, f.name, { fontFamily: "monospace", fontSize: "14px", fontStyle: "bold", color: "#ffffff", backgroundColor: "#000000aa", padding: { x: 5, y: 2 } })
      .setOrigin(0.5);
    const n = this.add.container(x, y, [shadow, body, face, tag]).setDepth(40) as Npc;
    n.f = f;
    n.hp = 2;
    n.nextThrow = this.time.now + Phaser.Math.Between(900, 2000);
    n.strafe = Math.random() < 0.5 ? -1 : 1;
    n.stunUntil = 0;
    n.wrongFor = -1;
    n.setScale(0);
    this.tweens.add({ targets: n, scale: 1, duration: 300, ease: "Back.easeOut" });
    this.npcs.push(n);
  }

  update(time: number, dtMs: number) {
    const dt = dtMs / 1000;
    const k = this.keys;
    const vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const len = Math.hypot(vx, vy) || 1;
    this.player.x = Phaser.Math.Clamp(this.player.x + (vx / len) * 270 * dt, 20, W - 20);
    this.player.y = Phaser.Math.Clamp(this.player.y + (vy / len) * 270 * dt, TOP + 20, H - 26);
    const aim = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, aim.x, aim.y);
    this.gun.setPosition(this.player.x, this.player.y + 4).setRotation(ang);
    this.player.setFlipX(Math.cos(ang) < 0);
    this.player.setAlpha(time < this.invulnUntil ? 0.5 + 0.5 * Math.sin(time / 40) : 1);

    if (!this.running) return;

    if ((this.input.activePointer.isDown || k.SPACE.isDown) && time - this.lastShot > 200) {
      this.lastShot = time;
      this.fire(ang);
    }

    // fighters: keep a distance, circle the player, throw their signature thing
    for (const n of this.npcs) {
      if (time < n.stunUntil) continue;
      const d = Phaser.Math.Distance.Between(n.x, n.y, this.player.x, this.player.y);
      const a = Phaser.Math.Angle.Between(n.x, n.y, this.player.x, this.player.y);
      const toward = d > 260 ? 1 : d < 170 ? -1 : 0;
      n.x = Phaser.Math.Clamp(n.x + (Math.cos(a) * toward + Math.cos(a + Math.PI / 2) * n.strafe * 0.6) * 90 * dt, 30, W - 30);
      n.y = Phaser.Math.Clamp(n.y + (Math.sin(a) * toward + Math.sin(a + Math.PI / 2) * n.strafe * 0.6) * 90 * dt, TOP + 50, H - 40);
      if (Math.random() < 0.004) n.strafe *= -1;
      if (time > n.nextThrow) {
        n.nextThrow = time + Phaser.Math.Between(2200, 3600);
        this.throwAt(n, a);
      }
    }

    for (const b of [...this.bullets]) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const hit = this.npcs.find((n) => Phaser.Math.Distance.Between(n.x, n.y + 4, b.x, b.y) < 30);
      if (hit) {
        this.remove(this.bullets, b);
        this.hitNpc(hit);
      } else if (b.x < -20 || b.x > W + 20 || b.y < TOP - 20 || b.y > H + 20) this.remove(this.bullets, b);
    }

    for (const s of [...this.shots]) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.spin?.setRotation(s.spin.rotation + dt * 6);
      if (time > this.invulnUntil && Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 26) {
        this.remove(this.shots, s);
        this.hurt();
      } else if (s.x < -40 || s.x > W + 40 || s.y < TOP - 40 || s.y > H + 40) this.remove(this.shots, s);
    }
  }

  private fire(ang: number) {
    const b = this.add.container(this.player.x + Math.cos(ang) * 24, this.player.y + 4 + Math.sin(ang) * 24, [
      this.add.circle(0, 0, 5, 0xfff3b0).setStrokeStyle(2, 0xc9a227),
    ]) as Shot;
    b.setDepth(45);
    b.vx = Math.cos(ang) * 650;
    b.vy = Math.sin(ang) * 650;
    this.bullets.push(b);
  }

  private throwAt(n: Npc, a: number) {
    const icon = this.add.text(0, 0, n.f.weapon.icon, { fontSize: "30px" }).setOrigin(0.5);
    const label = this.add
      .text(0, 24, n.f.weapon.name, { fontFamily: "monospace", fontSize: "12px", color: "#ffffff", backgroundColor: "#000000aa", padding: { x: 4, y: 1 } })
      .setOrigin(0.5);
    const s = this.add.container(n.x, n.y, [icon, label]).setDepth(46) as Shot;
    s.vx = Math.cos(a) * 210;
    s.vy = Math.sin(a) * 210;
    s.spin = icon;
    this.shots.push(s);
    this.tweens.add({ targets: n, scale: 1.15, yoyo: true, duration: 120 });
  }

  private hitNpc(n: Npc) {
    const w = this.wanted;
    if (!w) return;
    if (n.f === w) {
      n.hp--;
      burst(this, n.x, n.y, palette(this.theme).accent, 14);
      this.tweens.add({ targets: n, alpha: 0.4, yoyo: true, duration: 80 });
      if (n.hp > 0) return;
      // knocked out: teach the pair, then the next poster
      this.result.correct++;
      this.result.answers.push({ label: `${w.name} → ${w.weapon.name}`, correct: true });
      burst(this, n.x, n.y, 0xffd166, 40);
      this.cameras.main.shake(160, 0.008);
      this.remove(this.npcs, n);
      this.float(n.x, n.y - 40, `💥 ${w.avatar} ${w.name} → ${w.weapon.icon} ${w.weapon.name}\n${w.fact}`, "#a5f3c4");
      this.round++;
      if (!this.wanted) return this.finish();
      this.time.delayedCall(600, () => this.fill());
    } else {
      // wrong target: reveal who it really is and what it throws
      n.stunUntil = this.time.now + 500;
      n.nextThrow = this.time.now + 700; // it's annoyed now
      const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, n.x, n.y);
      this.tweens.add({ targets: n, x: n.x + Math.cos(a) * 40, y: n.y + Math.sin(a) * 40, duration: 150 });
      if (n.wrongFor !== this.round) {
        n.wrongFor = this.round;
        this.result.mistakes++;
        this.result.answers.push({ label: `${w.name} → ${w.weapon.name}`, correct: false });
        this.cameras.main.flash(150, 255, 80, 80);
        this.float(n.x, n.y - 50, `✖ That's ${n.f.name} — ${n.f.weapon.icon} ${n.f.weapon.name}`, "#ff8a80");
      }
    }
    this.updateHud();
  }

  private hurt() {
    this.hearts--;
    this.invulnUntil = this.time.now + 1000;
    this.cameras.main.shake(180, 0.012);
    burst(this, this.player.x, this.player.y, 0xff5555, 12);
    if (this.hearts <= 0) {
      // failing is cheap: count it and get straight back up
      this.result.knockouts++;
      this.hearts = HEARTS;
      this.invulnUntil = this.time.now + 2000;
      this.shots.forEach((s) => s.destroy());
      this.shots = [];
      this.float(this.player.x, this.player.y - 50, "💫 Knocked out! Back on your feet…", "#ffd166");
    }
    this.updateHud();
  }

  private finish() {
    this.running = false;
    this.shots.forEach((s) => s.destroy());
    this.shots = [];
    this.updateHud();
    this.time.delayedCall(1600, () => bus.emit("showdown:done", { ...this.result }));
  }

  private remove(list: Phaser.GameObjects.Container[], o: Phaser.GameObjects.Container) {
    const i = list.indexOf(o);
    if (i >= 0) list.splice(i, 1);
    o.destroy();
  }

  private updateHud() {
    const w = this.wanted;
    this.poster.setText(w ? `🎯 WANTED: whoever throws ${w.weapon.icon} ${w.weapon.name}` : "🏆 All wanted fighters down!");
    this.status.setText(
      `${"❤️".repeat(this.hearts)}${"🖤".repeat(HEARTS - this.hearts)}   ✔ ${this.result.correct}/${this.order.length}   ✖ ${this.result.mistakes}`,
    );
  }

  private float(x: number, y: number, msg: string, color: string) {
    const t = this.add
      .text(Phaser.Math.Clamp(x, 200, W - 200), Phaser.Math.Clamp(y, TOP + 30, H - 60), msg, {
        fontFamily: "monospace",
        fontSize: "16px",
        color,
        stroke: "#000",
        strokeThickness: 4,
        wordWrap: { width: 400 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(1000);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, delay: 1500, duration: 1200, onComplete: () => t.destroy() });
  }
}
