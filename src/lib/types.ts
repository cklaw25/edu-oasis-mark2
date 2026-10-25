// Shared types. The GameSpec is the contract between the generator, the game engine and the Solana side.

export type GameType = "rpg-experiment" | "explore-collect" | "sort-match" | "boss-quiz";

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface WorldSummary {
  id: string;
  title: string;
  topic: string;
  creator: string;
  createdAt: number;
  lastVisitedAt: number;
  /** 0..1 predicted recall right now (derived from halfLifeH + lastVisitedAt); drives how green the island looks */
  recall: number;
  /** 0..1 share of the current review interval left (derived); 0 = review due */
  lifespan?: number;
  /** good reviews in a row; review interval = 2 days × streak (min 2 days) */
  streak?: number;
  /** hours until recall falls to 50% */
  halfLifeH?: number;
  /** accuracy of each completed session, oldest first */
  sessions?: { t: number; accuracy: number }[];
  gameType: GameType;
  /** sets the most MOE a game here can pay; unset = "medium" until difficulty is added */
  difficulty?: Difficulty;
  /** how many extracted knowledge items the world teaches */
  coverage?: { covered: number; total: number };
  /** bought on the World Market (its island portal shows blue) */
  bought?: boolean;
  /** demo NFT id: the island token that can be listed and sold */
  nftId?: string;
}

export interface Profile {
  name: string;
  /** free generations left; after that each new world costs GENERATE_PRICE_MOE */
  generationsLeft: number;
  /** the 3 islands shown in the hub (slots 0..2); null = empty island */
  worlds: (WorldSummary | null)[];
  /** owned worlds that aren't on an island right now (swap them in from the library) */
  library: WorldSummary[];
  /** demo MOE balance (up to 3 decimals) */
  moe: number;
  /** 2 = amounts on the 30-MOE scale; older saves were 1,000× bigger and get scaled down on load */
  moeVersion?: number;
  /** my worlds listed for sale on the World Market */
  listings: { worldId: string; price: number }[];
  /** look of each of the 3 islands, keyed by slot */
  cosmetics: Record<string, IslandCosmetics>;
  /** games that have paid MOE so far, per world id (each island pays for 10) */
  rewardedPlays: Record<string, number>;
  /** Rapid Fire Market items bought (free starter items aren't listed) */
  ownedItems: string[];
  /** equipped Rapid Fire Market items */
  avatar: { shirt: string; hat: string };
  pip: string;
  theme: string;
  font: string;
}

export type TreeStyle = "palm" | "pine" | "blossom";
export type FlagColor = "none" | "red" | "blue" | "gold";

/** A shop object placed on an island: which item, its paint colour, and which edge spot it stands on. */
export interface PlacedObject {
  item: string;
  color: string;
  spot: number;
}

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
