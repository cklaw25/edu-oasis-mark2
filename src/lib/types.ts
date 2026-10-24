// Shared types. The GameSpec is the contract between the generator, the game engine and the Solana side.

export type GameType = "rpg-experiment" | "explore-collect" | "sort-match" | "boss-quiz";

export interface WorldSummary {
  id: string;
  title: string;
  topic: string;
  creator: string;
  createdAt: number;
  lastVisitedAt: number;
  /** 0..1 predicted recall right now (derived from halfLifeH + lastVisitedAt); drives how green the island looks */
  recall: number;
  /** hours until recall falls to 50% */
  halfLifeH?: number;
  /** accuracy of each completed session, oldest first */
  sessions?: { t: number; accuracy: number }[];
  gameType: GameType;
  /** how many extracted knowledge items the world teaches */
  coverage?: { covered: number; total: number };
  /** bought on the World Market (its island portal shows blue) */
  bought?: boolean;
  /** demo NFT id: the island token that can be listed and sold */
  nftId?: string;
}

export interface Profile {
  name: string;
  generationsLeft: number;
  /** island slots 0..2; null = empty slot */
  worlds: (WorldSummary | null)[];
  /** demo MOE balance (whole tokens) */
  moe: number;
  /** World Market topic ids this player has bought */
  owned: string[];
  /** my islands listed for sale on the World Market */
  listings: { worldId: string; price: number }[];
  /** other players' listings this player has bought */
  boughtListings: string[];
  /** look of each outer island, keyed by slot */
  cosmetics: Record<string, IslandCosmetics>;
  /** app-clock time (ms) the membership runs until; unset = never a member */
  membershipUntil?: number;
  /** Rapid Fire Market items bought (free starter items aren't listed) */
  ownedItems: string[];
  /** equipped shop item ids */
  avatar: { shirt: string; hat: string };
  theme: string;
  font: string;
}

/** A shop object placed on an island: which item, its paint colour, and which edge spot it stands on. */
export interface PlacedObject {
  item: string;
  color: string;
  spot: number;
}

export type TreeStyle = "palm" | "pine" | "blossom";
export type FlagColor = "none" | "red" | "blue" | "gold";

export interface IslandCosmetics {
  trees: TreeStyle;
  flag: FlagColor;
  objects: PlacedObject[];
}

export type PortalKind = "world" | "empty" | "market" | "rapid";

export interface PortalInfo {
  kind: PortalKind;
  slot?: number;
  world?: WorldSummary | null;
}
