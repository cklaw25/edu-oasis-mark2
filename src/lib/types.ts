// Shared types. The GameSpec is the contract between the generator, the game engine and the Solana side.

export type GameType = "rpg-experiment" | "explore-collect" | "sort-match" | "boss-quiz";

export interface WorldSummary {
  id: string;
  title: string;
  topic: string;
  creator: string;
  createdAt: number;
  lastVisitedAt: number;
  /** 0..1 predicted recall; drives how green or dried-out the island looks */
  recall: number;
  gameType: GameType;
}

export interface Profile {
  name: string;
  generationsLeft: number;
  /** island slots 0..2; null = empty slot */
  worlds: (WorldSummary | null)[];
}

export type PortalKind = "world" | "empty" | "market";

export interface PortalInfo {
  kind: PortalKind;
  slot?: number;
  world?: WorldSummary | null;
}
