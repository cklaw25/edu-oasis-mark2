import type * as Phaser from "phaser";

/** Player drawn with a Rapid Fire Market shirt colour and hat; returns the texture key. */
export function makeAvatar(scene: Phaser.Scene, shirt: number, hat: string) {
  const key = `avatar-${shirt.toString(16)}-${hat}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  const top = 14; // headroom for hats, so the body sits lower than the plain "player" texture
  g.fillStyle(0x000000, 0.25).fillEllipse(16, 42 + top, 26, 8);
  g.fillStyle(shirt).fillRoundedRect(6, 18 + top, 20, 22, 6);
  g.fillStyle(0xffd7b5).fillCircle(16, 12 + top, 10);
  g.fillStyle(0x3b2a20).fillRect(6, 2 + top, 20, 7);
  g.fillStyle(0x111111).fillCircle(20, 13 + top, 1.8);
  if (hat === "hat-cap") {
    g.fillStyle(0xe63946).fillRoundedRect(5, top - 2, 22, 9, 4).fillRect(18, top + 4, 12, 3);
  } else if (hat === "hat-wizard") {
    g.fillStyle(0x5a189a).fillTriangle(4, top + 6, 28, top + 6, 16, 0);
    g.fillStyle(0xffd166).fillCircle(16, top - 2, 2);
  } else if (hat === "hat-crown") {
    g.fillStyle(0xf4b400).fillRect(6, top - 2, 20, 8);
    g.fillTriangle(6, top - 2, 11, top - 2, 8, top - 10).fillTriangle(13, top - 2, 19, top - 2, 16, top - 11);
    g.fillTriangle(21, top - 2, 26, top - 2, 24, top - 10);
  }
  g.generateTexture(key, 32, 46 + top);
  g.destroy();
  return key;
}

/** Pip drawn in one of the Rapid Fire Market looks; returns the texture key. */
export function makePip(scene: Phaser.Scene, style: string) {
  const key = `pip-tex-${style}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  const eyes = (y = 16, col = 0x10324a) => g.fillStyle(col).fillCircle(14, y, 2).fillCircle(22, y, 2);
  if (style === "pip-ember") {
    g.fillStyle(0xff7b00, 0.35).fillCircle(18, 20, 16);
    g.fillStyle(0xff9f1c).fillTriangle(8, 26, 28, 26, 18, 2);
    g.fillStyle(0xffd166).fillCircle(18, 22, 9);
    eyes(21, 0x5a1a00);
  } else if (style === "pip-leaf") {
    g.fillStyle(0x80ed99, 0.35).fillCircle(18, 20, 16);
    g.fillStyle(0xb7efc5).fillCircle(18, 21, 10);
    g.fillStyle(0x2d6a4f).fillEllipse(23, 8, 12, 6).fillRect(17, 8, 2, 5);
    eyes(20, 0x1b4332);
  } else if (style === "pip-ghost") {
    g.fillStyle(0xffffff, 0.3).fillCircle(18, 18, 16);
    g.fillStyle(0xf8f9fa).fillCircle(18, 15, 10).fillRect(8, 15, 20, 12);
    g.fillStyle(0xf8f9fa).fillTriangle(8, 27, 13, 27, 10.5, 32).fillTriangle(15.5, 27, 20.5, 27, 18, 32).fillTriangle(23, 27, 28, 27, 25.5, 32);
    eyes(15, 0x212529);
  } else if (style === "pip-star") {
    g.fillStyle(0xffd166, 0.35).fillCircle(18, 18, 16);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 6 : 14;
      pts.push({ x: 18 + Math.cos(a) * r, y: 18 + Math.sin(a) * r });
    }
    g.fillStyle(0xffc300).fillPoints(pts, true);
    eyes(18, 0x6a4c00);
  } else if (style === "pip-robot") {
    g.fillStyle(0x8ecae6, 0.3).fillCircle(18, 20, 16);
    g.fillStyle(0x495057).fillRect(17, 2, 2, 6).fillStyle(0xe63946).fillCircle(18, 3, 2.5);
    g.fillStyle(0xadb5bd).fillRoundedRect(7, 8, 22, 20, 4);
    g.fillStyle(0x00b4d8).fillRect(11, 14, 5, 4).fillRect(20, 14, 5, 4);
    g.fillStyle(0x495057).fillRect(12, 22, 12, 2);
  } else {
    // classic glowing spirit
    g.fillStyle(0x7fe0ff, 0.35).fillCircle(18, 18, 14);
    g.fillStyle(0xbff4ff).fillCircle(18, 18, 9);
    eyes(16);
  }
  g.generateTexture(key, 36, 34);
  g.destroy();
  return key;
}

/** The World Market's trading camel, facing left towards the trading stall; returns the texture key. */
export function makeCamel(scene: Phaser.Scene) {
  if (scene.textures.exists("camel")) return "camel";
  const g = scene.make.graphics({}, false);
  const fur = 0xc8a165;
  const dark = 0xa27b44;
  g.fillStyle(0x000000, 0.2).fillEllipse(36, 62, 52, 8); // shadow
  g.fillStyle(dark).fillRect(20, 40, 5, 22).fillRect(30, 40, 5, 22).fillRect(44, 40, 5, 22).fillRect(54, 40, 5, 22); // legs
  g.fillStyle(fur).fillEllipse(40, 36, 46, 22); // body
  g.fillStyle(fur).fillEllipse(32, 24, 16, 16).fillEllipse(48, 24, 16, 16); // two humps
  g.fillStyle(0xe63946).fillRect(30, 28, 22, 6); // saddle blanket
  g.fillStyle(0xffd166).fillRect(30, 34, 22, 2);
  g.fillStyle(fur).fillTriangle(14, 18, 22, 18, 24, 34).fillTriangle(14, 18, 18, 34, 24, 34); // neck
  g.fillStyle(fur).fillEllipse(10, 16, 18, 10); // head
  g.fillStyle(dark).fillEllipse(3, 17, 5, 4).fillTriangle(14, 9, 18, 9, 16, 4); // nose and ear
  g.fillStyle(0x111111).fillCircle(9, 14, 1.6); // eye
  g.fillStyle(dark).fillRect(66, 30, 3, 14); // tail
  g.generateTexture("camel", 72, 66);
  g.destroy();
  return "camel";
}

// All art is drawn in code, so worlds cost nothing to "generate" visually.
export function makeTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("player")) return;
  const g = scene.make.graphics({}, false);

  // player: little explorer
  g.fillStyle(0x000000, 0.25).fillEllipse(16, 42, 26, 8);
  g.fillStyle(0x3d5afe).fillRoundedRect(6, 18, 20, 22, 6);
  g.fillStyle(0xffd7b5).fillCircle(16, 12, 10);
  g.fillStyle(0x3b2a20).fillRect(6, 2, 20, 7);
  g.fillStyle(0x111111).fillCircle(20, 13, 1.8);
  g.generateTexture("player", 32, 46);
  g.clear();

  // pet: glowing spirit
  g.fillStyle(0x7fe0ff, 0.35).fillCircle(14, 14, 14);
  g.fillStyle(0xbff4ff).fillCircle(14, 14, 9);
  g.fillStyle(0x10324a).fillCircle(11, 12, 1.8).fillCircle(17, 12, 1.8);
  g.generateTexture("pet", 28, 28);
  g.clear();

  // Bobo doll: weighted red base, white body with red spots, clown face, 44x84
  g.fillStyle(0x000000, 0.25).fillEllipse(22, 80, 40, 8);
  g.fillStyle(0xd62828).fillCircle(22, 64, 18); // weighted base
  g.fillStyle(0xf8f4ec).fillEllipse(22, 46, 32, 40); // body
  g.fillStyle(0xd62828).fillCircle(14, 44, 3.5).fillCircle(28, 52, 3.5).fillCircle(24, 38, 3);
  g.fillStyle(0xf8f4ec).fillCircle(22, 20, 13); // face
  g.fillStyle(0xe63946).fillCircle(9, 14, 5).fillCircle(35, 14, 5); // red hair tufts
  g.fillStyle(0x1d3557).fillTriangle(12, 9, 32, 9, 22, 0); // little hat
  g.fillStyle(0x1d3557).fillCircle(17, 18, 2).fillCircle(27, 18, 2); // eyes
  g.fillStyle(0xe63946).fillCircle(22, 23, 3.5); // nose
  g.lineStyle(2, 0xe63946).beginPath().arc(22, 25, 6, 0.2, Math.PI - 0.2).strokePath(); // smile
  g.generateTexture("bobo", 44, 84);
  g.clear();

  // mallet
  g.fillStyle(0x8a5a32).fillRect(12, 8, 4, 26);
  g.fillStyle(0x6d6d6d).fillRoundedRect(2, 0, 24, 12, 3);
  g.generateTexture("mallet", 28, 34);
  g.clear();

  // tinker toy: spool + stick
  g.fillStyle(0x6b3f1d).fillRect(2, 8, 26, 6);
  g.fillStyle(0x2a9d8f).fillCircle(6, 11, 6);
  g.fillStyle(0xe9c46a).fillCircle(24, 11, 6);
  g.generateTexture("tinker", 30, 22);
  g.clear();

  // children faces behind the one-way mirror
  const face = (key: string, angry: boolean) => {
    g.fillStyle(0xffd7b5).fillCircle(14, 14, 12);
    g.fillStyle(0x5a3825).fillRect(4, 2, 20, 6);
    g.fillStyle(0x111111).fillCircle(10, 13, 1.8).fillCircle(18, 13, 1.8);
    if (angry) {
      g.lineStyle(2, 0x111111).lineBetween(7, 9, 12, 11).lineBetween(21, 9, 16, 11);
      g.lineStyle(2, 0x9b2226).lineBetween(9, 21, 19, 21);
    } else {
      g.lineStyle(2, 0x9b2226).beginPath().arc(14, 17, 5, 0.3, Math.PI - 0.3).strokePath();
    }
    g.generateTexture(key, 28, 28);
    g.clear();
  };
  face("kid-calm", false);
  face("kid-angry", true);

  g.destroy();
}
