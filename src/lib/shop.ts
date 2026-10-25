// Rapid Fire Market: cosmetic items bought with MOE. Price 0 = free starter item everyone owns.
import type { Profile } from "./types";

export type ShopCategory = "avatar" | "pip" | "world" | "font" | "island" | "object";

export interface ShopItem {
  id: string;
  category: ShopCategory;
  /** avatar items are either a shirt or a hat */
  slot?: "shirt" | "hat";
  name: string;
  icon: string;
  price: number;
}

export interface WorldTheme {
  ocean: number;
  shallows: number;
  wave: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // avatar aesthetics
  { id: "shirt-blue", category: "avatar", slot: "shirt", name: "Blue shirt", icon: "👕", price: 0 },
  { id: "shirt-red", category: "avatar", slot: "shirt", name: "Red shirt", icon: "👕", price: 2_000 },
  { id: "shirt-green", category: "avatar", slot: "shirt", name: "Green shirt", icon: "👕", price: 2_000 },
  { id: "shirt-gold", category: "avatar", slot: "shirt", name: "Gold shirt", icon: "👕", price: 4_000 },
  { id: "hat-none", category: "avatar", slot: "hat", name: "No hat", icon: "🙂", price: 0 },
  { id: "hat-cap", category: "avatar", slot: "hat", name: "Cap", icon: "🧢", price: 3_000 },
  { id: "hat-wizard", category: "avatar", slot: "hat", name: "Wizard hat", icon: "🧙", price: 5_000 },
  { id: "hat-crown", category: "avatar", slot: "hat", name: "Crown", icon: "👑", price: 6_000 },
  // Pip's look (the companion that follows you on the map)
  { id: "pip-classic", category: "pip", name: "Classic spirit", icon: "✦", price: 0 },
  { id: "pip-ember", category: "pip", name: "Ember spirit", icon: "🔥", price: 3_000 },
  { id: "pip-leaf", category: "pip", name: "Leaf sprite", icon: "🌱", price: 3_000 },
  { id: "pip-ghost", category: "pip", name: "Friendly ghost", icon: "👻", price: 4_000 },
  { id: "pip-star", category: "pip", name: "Shooting star", icon: "⭐", price: 5_000 },
  { id: "pip-robot", category: "pip", name: "Robo Pip", icon: "🤖", price: 6_000 },
  // world map designs
  { id: "theme-classic", category: "world", name: "Classic ocean", icon: "🌊", price: 0 },
  { id: "theme-tropical", category: "world", name: "Tropical lagoon", icon: "🏝️", price: 8_000 },
  { id: "theme-sunset", category: "world", name: "Sunset sea", icon: "🌅", price: 10_000 },
  { id: "theme-night", category: "world", name: "Night sky sea", icon: "🌙", price: 12_000 },
  // font changes (island names on the map)
  { id: "font-mono", category: "font", name: "Monospace", icon: "Aa", price: 0 },
  { id: "font-serif", category: "font", name: "Storybook serif", icon: "Aa", price: 3_000 },
  { id: "font-comic", category: "font", name: "Comic", icon: "Aa", price: 3_000 },
  { id: "font-impact", category: "font", name: "Bold poster", icon: "Aa", price: 4_000 },
  // island changes (used from an island's right-click cosmetics page)
  { id: "trees-palm", category: "island", name: "Palm trees", icon: "🌴", price: 0 },
  { id: "trees-pine", category: "island", name: "Pine trees", icon: "🌲", price: 2_500 },
  { id: "trees-blossom", category: "island", name: "Blossom trees", icon: "🌸", price: 3_500 },
  { id: "flag-none", category: "island", name: "No flag", icon: "🏳️", price: 0 },
  { id: "flag-red", category: "island", name: "Red flag", icon: "🚩", price: 1_500 },
  { id: "flag-blue", category: "island", name: "Blue flag", icon: "🏁", price: 1_500 },
  { id: "flag-gold", category: "island", name: "Gold flag", icon: "🏆", price: 3_000 },
  // objects you place and colour on your islands
  { id: "obj-rock", category: "object", name: "Rock", icon: "🪨", price: 1_000 },
  { id: "obj-sign", category: "object", name: "Signpost", icon: "🪧", price: 1_500 },
  { id: "obj-lantern", category: "object", name: "Lantern", icon: "🏮", price: 2_000 },
  { id: "obj-bench", category: "object", name: "Bench", icon: "🪑", price: 2_000 },
  { id: "obj-statue", category: "object", name: "Statue", icon: "🗿", price: 4_000 },
];

export const SHIRT_COLORS: Record<string, number> = {
  "shirt-blue": 0x3d5afe,
  "shirt-red": 0xe63946,
  "shirt-green": 0x2a9d8f,
  "shirt-gold": 0xf4b400,
};

export const WORLD_THEMES: Record<string, WorldTheme> = {
  "theme-classic": { ocean: 0x2a6f97, shallows: 0x8fd3e8, wave: 0xffffff },
  "theme-tropical": { ocean: 0x0fa3b1, shallows: 0xa8f0e0, wave: 0xffffff },
  "theme-sunset": { ocean: 0xb5523b, shallows: 0xf7b267, wave: 0xffe0b2 },
  "theme-night": { ocean: 0x14213d, shallows: 0x3a506b, wave: 0xc8d6ff },
};

export const LABEL_FONTS: Record<string, string> = {
  "font-mono": "monospace",
  "font-serif": "Georgia, 'Times New Roman', serif",
  "font-comic": "'Comic Sans MS', 'Comic Neue', cursive",
  "font-impact": "Impact, 'Arial Black', sans-serif",
};

/** Colours a placed object can be painted. */
export const OBJECT_COLORS = ["#8d99ae", "#e63946", "#f4a261", "#2a9d8f", "#3d5afe", "#9b5de5", "#ffffff"];

/** Where placed objects sit on an island: 8 spots around the edge of the grass. */
export const OBJECT_SPOTS = 8;
export const MAX_OBJECTS_PER_ISLAND = 6;

export const CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: "avatar", label: "Avatar" },
  { id: "pip", label: "Pip" },
  { id: "world", label: "World map" },
  { id: "font", label: "Fonts" },
  { id: "island", label: "Katas" },
  { id: "object", label: "Objects" },
];

export function shopItem(id: string) {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function ownsItem(p: Profile, id: string) {
  return shopItem(id)?.price === 0 || p.ownedItems.includes(id);
}
