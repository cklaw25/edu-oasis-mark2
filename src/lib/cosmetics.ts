// Island cosmetics: purely visual choices for each outer island. Grass colour is left alone
// because it shows predicted recall.
import type { FlagColor, IslandCosmetics, Profile, TreeStyle } from "./types";

export const DEFAULT_COSMETICS: IslandCosmetics = { trees: "palm", flag: "none", objects: [] };

export const TREE_STYLES: { id: TreeStyle; label: string; icon: string }[] = [
  { id: "palm", label: "Palm", icon: "🌴" },
  { id: "pine", label: "Pine", icon: "🌲" },
  { id: "blossom", label: "Blossom", icon: "🌸" },
];

export const FLAG_COLORS: { id: FlagColor; label: string; hex: number }[] = [
  { id: "none", label: "No flag", hex: 0 },
  { id: "red", label: "Red", hex: 0xe63946 },
  { id: "blue", label: "Blue", hex: 0x3d5afe },
  { id: "gold", label: "Gold", hex: 0xffd166 },
];

export function cosmeticsFor(p: Profile, slot: number): IslandCosmetics {
  return { ...DEFAULT_COSMETICS, ...p.cosmetics[String(slot)] };
}
