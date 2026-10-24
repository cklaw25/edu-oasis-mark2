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
  /** 0..1 share of the current review interval left (derived); 0 = review due */
  lifespan?: number;
  /** good reviews in a row; review interval = 2 days × streak (min 2 days) */
  streak?: number;
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
  /** free generations left; after that each new world costs GENERATE_PRICE_MOE */
  generationsLeft: number;
  /** the 3 islands shown in the hub (slots 0..2); null = empty island */
  worlds: (WorldSummary | null)[];
  /** owned worlds that aren't on an island right now (swap them in from the library) */
  library: WorldSummary[];
  /** demo MOE balance (whole tokens) */
  moe: number;
  /** my worlds listed for sale on the World Market */
  listings: { worldId: string; price: number }[];
}

export type PortalKind = "world" | "empty" | "market";

export interface PortalInfo {
  kind: PortalKind;
  slot?: number;
  world?: WorldSummary | null;
}
