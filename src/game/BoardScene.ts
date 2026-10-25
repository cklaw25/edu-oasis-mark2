import * as Phaser from "phaser";
import { bus } from "./bus";
import { burst, drawBackdrop, makeActionTextures, palette } from "./themes";
import type { Board, Theme } from "@/lib/worldSpec";

// "Squad Board": characters ride a conveyor belt; grab one and drop it on the zone it belongs to before it
// rolls away. Right = it joins the zone (fact pops up, combo grows); wrong = it bounces back onto the belt.
const W = 960;
const H = 600;
const BELT_Y = 440;
const BELT_SPEED = 55;
const ON_BELT = 3;

export interface BoardResult {
  correct: number;
  mistakes: number;
  answers: { label: string; correct: boolean }[];
}

type Piece = Board["pieces"][number];
type Token = Phaser.GameObjects.Container & { piece: Piece; dragging: boolean };
type Zone = { id: string; rect: Phaser.GameObjects.Rectangle; filled: number; cx: number; cy: number; w: number; h: number };

export class BoardScene extends Phaser.Scene {
  private board!: Board;
  private theme?: Theme;
  private autoStart = true;
  private queue: Piece[] = [];
  private tokens: Token[] = [];
  private zones: Zone[] = [];
  private running = false;
  private combo = 0;
  private left = 0;
  private status!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private factText!: Phaser.GameObjects.Text;
  private result: BoardResult = { correct: 0, mistakes: 0, answers: [] };

  constructor() {
    super("board");
  }

  init(data: { board: Board; theme?: Theme; autoStart?: boolean }) {
    this.board = data.board;
    this.theme = data.theme;
    this.autoStart = data.autoStart ?? true;
    this.queue = Phaser.Utils.Array.Shuffle([...data.board.pieces]);
    this.left = this.queue.length;
    this.tokens = [];
    this.zones = [];
    this.running = false;
    this.combo = 0;
    this.result = { correct: 0, mistakes: 0, answers: [] };
  }

  create() {
    makeActionTextures(this);
    const p = drawBackdrop(this, this.theme, W, H, 430);
    this.add.rectangle(0, 430, W, H - 430, p.ground).setOrigin(0).setDepth(-50);

    // zones: big themed "buildings" across the top
    const n = this.board.zones.length;
    const gap = 18;
    const zw = Math.min(240, (W - 40 - gap * (n - 1)) / n);
    const x0 = (W - (zw * n + gap * (n - 1))) / 2;
    this.board.zones.forEach((z, i) => {
      const x = x0 + i * (zw + gap);
      const y = 62;
      const h = 270;
      const rect = this.add.rectangle(x, y, zw, h, 0xffffff, 0.22).setOrigin(0).setStrokeStyle(4, 0xffffff, 0.7).setDepth(5);
      this.add.rectangle(x, y, zw, 64, p.accent, 0.95).setOrigin(0).setDepth(6);
      this.add.text(x + zw / 2, y + 30, z.icon, { fontSize: "40px" }).setOrigin(0.5).setDepth(7);
      this.add
        .text(x + zw / 2, y + 82, z.name, {
          fontFamily: "monospace",
          fontSize: "16px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#000",
          strokeThickness: 5,
          align: "center",
          wordWrap: { width: zw - 10 },
        })
        .setOrigin(0.5, 0)
        .setDepth(7);
      this.zones.push({ id: z.id, rect, filled: 0, cx: x + zw / 2, cy: y + h / 2, w: zw, h });
    });

    // conveyor belt
    const belt = this.add.graphics().setDepth(8);
    belt.fillStyle(0x333a44).fillRoundedRect(-20, BELT_Y - 10, W + 40, 70, 18);
    belt.fillStyle(0x4b5563);
    for (let x = 0; x < W; x += 60) belt.fillCircle(x + 20, BELT_Y + 25, 12);
    this.add.text(W - 20, BELT_Y - 34, "⟶", { fontSize: "26px", color: "#ffffff" }).setOrigin(1, 0).setDepth(9);

    const style = { fontFamily: "monospace", fontSize: "17px", color: "#ffffff", stroke: "#000", strokeThickness: 5 };
    this.add.rectangle(W / 2, 22, W, 44, 0x000000, 0.45).setDepth(999);
    this.add.text(W / 2, 22, `🖐 DRAG EACH ONE TO WHERE IT BELONGS`, style).setOrigin(0.5).setDepth(1000);
    this.status = this.add.text(12, H - 28, "", { ...style, fontSize: "15px" }).setDepth(1000);
    // one fact line under the zones (a pile of floating texts overlapped)
    this.factText = this.add
      .text(W / 2, 362, "", { ...style, fontSize: "16px", color: "#a5f3c4", wordWrap: { width: W - 80 }, align: "center" })
      .setOrigin(0.5)
      .setDepth(1000);
    this.comboText = this.add.text(W - 12, H - 28, "", { ...style, fontSize: "15px", color: "#ffd166" }).setOrigin(1, 0).setDepth(1000);

    const fit = () => {
      const cam = this.cameras.main;
      cam.setZoom(Math.min(this.scale.width / W, this.scale.height / H));
      cam.centerOn(W / 2, H / 2);
    };
    fit();
    this.scale.on("resize", fit);
    this.events.once("shutdown", () => this.scale.off("resize", fit));

    this.input.on("drag", (_p: Phaser.Input.Pointer, t: Token, x: number, y: number) => {
      t.setPosition(x, y);
      this.zones.forEach((z) => z.rect.setFillStyle(0xffffff, this.over(z, t) ? 0.45 : 0.22));
    });
    this.input.on("dragstart", (_p: Phaser.Input.Pointer, t: Token) => {
      t.dragging = true;
      t.setDepth(800).setScale(1.12);
    });
    this.input.on("dragend", (_p: Phaser.Input.Pointer, t: Token) => {
      t.dragging = false;
      t.setDepth(20).setScale(1);
      this.zones.forEach((z) => z.rect.setFillStyle(0xffffff, 0.22));
      const z = this.zones.find((zz) => this.over(zz, t));
      if (z) this.drop(t, z);
      else t.y = BELT_Y + 25; // back onto the belt
    });

    this.updateHud();
    if (this.autoStart) this.begin();
    else {
      const off = bus.on("board:begin", () => {
        off();
        this.begin();
      });
      this.events.once("shutdown", off);
    }
  }

  private begin() {
    this.running = true;
    this.spawn();
  }

  private over(z: Zone, t: Token) {
    return Math.abs(t.x - z.cx) < z.w / 2 && Math.abs(t.y - z.cy) < z.h / 2;
  }

  private spawn() {
    if (!this.running) return;
    const piece = this.queue.shift();
    if (!piece) return;
    const disc = this.add.circle(0, 0, 36, 0xfff8e7).setStrokeStyle(4, palette(this.theme).accent);
    const icon = this.add.text(0, -2, piece.icon, { fontSize: "38px" }).setOrigin(0.5);
    const name = this.add
      .text(0, 50, piece.name, {
        fontFamily: "monospace",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#0b2a3d",
        backgroundColor: "#fff8e7",
        padding: { x: 6, y: 2 },
        align: "center",
        wordWrap: { width: 150 },
      })
      .setOrigin(0.5, 0);
    const t = this.add.container(-60, BELT_Y + 25, [disc, icon, name]).setDepth(20) as Token;
    t.piece = piece;
    t.dragging = false;
    t.setSize(80, 110).setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(t);
    this.tokens.push(t);
  }

  private drop(t: Token, z: Zone) {
    const ok = t.piece.zone === z.id;
    this.result.answers.push({ label: t.piece.name, correct: ok });
    if (ok) {
      this.result.correct++;
      this.combo++;
      this.left--;
      this.tokens = this.tokens.filter((x) => x !== t);
      t.disableInteractive();
      // park it inside the zone, small, in a little grid
      const col = z.filled % 3;
      const row = Math.floor(z.filled / 3);
      z.filled++;
      const tx = z.cx - z.w / 3 + col * (z.w / 3);
      const ty = z.cy - 10 + row * 62;
      t.removeAt(2, true); // drop the name tag inside the zone to keep it tidy
      this.tweens.add({ targets: t, x: tx, y: ty, scale: 0.6, duration: 250 });
      burst(this, t.x, t.y, palette(this.theme).accent, 22);
      this.say(`✔ ${t.piece.icon} ${t.piece.fact}`, "#a5f3c4");
      if (this.left <= 0) return this.finish();
    } else {
      this.result.mistakes++;
      this.combo = 0;
      this.cameras.main.shake(200, 0.01);
      this.say(`✖ ${t.piece.icon} ${t.piece.name} doesn't belong in ${this.board.zones.find((x) => x.id === z.id)?.name} — try another!`, "#ff8a80");
      this.tweens.add({ targets: t, y: BELT_Y + 25, duration: 300, ease: "Back.easeOut" });
    }
    this.updateHud();
  }

  private finish() {
    this.running = false;
    this.updateHud();
    this.time.delayedCall(1400, () => bus.emit("board:done", { ...this.result }));
  }

  private updateHud() {
    this.status.setText(`✔ ${this.result.correct}   ✖ ${this.result.mistakes}   left ${this.left}`);
    this.comboText.setText(this.combo >= 2 ? `🔥 combo x${this.combo}` : "");
  }

  update(_t: number, dtMs: number) {
    if (!this.running) return;
    const dx = (BELT_SPEED * dtMs) / 1000;
    for (const t of [...this.tokens]) {
      if (t.dragging || t.y < BELT_Y) continue;
      t.x += dx;
      // rolled off the end: it comes round again later
      if (t.x > W + 60) {
        this.tokens = this.tokens.filter((x) => x !== t);
        this.queue.push(t.piece);
        t.destroy();
      }
    }
    // feed the belt with gaps wide enough for the name tags
    const crowded = this.tokens.some((t) => !t.dragging && t.x < 200);
    if (this.queue.length && this.tokens.length < ON_BELT && !crowded) this.spawn();
  }

  private say(msg: string, color: string) {
    this.factText.setText(msg).setColor(color).setScale(1.15);
    this.tweens.add({ targets: this.factText, scale: 1, duration: 200 });
  }
}
