import type { Theme } from "@/lib/worldSpec";

// Per-topic colours, kept free of Phaser so React components (slide pictures) can use them on the server too.

export interface Palette {
  skyTop: number;
  skyBottom: number;
  far: number; // distant silhouettes
  ground: number;
  groundTop: number;
  accent: number;
  text: string;
  carrier: "biplane" | "ufo" | "bee" | "balloon" | "drone";
  helmet: number;
}

export const PALETTES: Record<Theme, Palette> = {
  war: { skyTop: 0x6b6f5e, skyBottom: 0xb3a98a, far: 0x4a4a3c, ground: 0x4e3b26, groundTop: 0x6b5a3e, accent: 0xc9a227, text: "#fff3c4", carrier: "biplane", helmet: 0x55603a },
  lab: { skyTop: 0xcfe0ee, skyBottom: 0xf3f7fb, far: 0xa9bccc, ground: 0x8e9aa6, groundTop: 0xb8c4cf, accent: 0x2a9d8f, text: "#0b2a3d", carrier: "drone", helmet: 0xffffff },
  nature: { skyTop: 0x7cc6ee, skyBottom: 0xd6f0ff, far: 0x6fae5d, ground: 0x6b4a2e, groundTop: 0x5c9e4a, accent: 0xffd166, text: "#ffffff", carrier: "bee", helmet: 0x2e7d32 },
  space: { skyTop: 0x050816, skyBottom: 0x1b2350, far: 0x2b3060, ground: 0x3b3f58, groundTop: 0x6c7192, accent: 0x7fe0ff, text: "#e0f7ff", carrier: "ufo", helmet: 0xe0e0e0 },
  ancient: { skyTop: 0xf0b56b, skyBottom: 0xfbe3b3, far: 0xd9a15b, ground: 0xa87a43, groundTop: 0xc49a5a, accent: 0x9b2226, text: "#3b1d0e", carrier: "balloon", helmet: 0xc9a227 },
  ocean: { skyTop: 0x5ab7e0, skyBottom: 0xc9ecf8, far: 0x2f86b3, ground: 0xc8a96b, groundTop: 0xe8d39a, accent: 0xff7f50, text: "#ffffff", carrier: "balloon", helmet: 0xff7f50 },
  city: { skyTop: 0x8fc3ec, skyBottom: 0xe2f1fb, far: 0x8292a8, ground: 0x55595f, groundTop: 0x7b8088, accent: 0xffd166, text: "#ffffff", carrier: "drone", helmet: 0x3d5afe },
};

export function palette(theme?: Theme) {
  return PALETTES[theme ?? "city"] ?? PALETTES.city;
}
