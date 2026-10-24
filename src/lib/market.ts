// World Market catalog: subjects with subtopic worlds sold by EduOasis for MOE, plus island NFTs
// that other players have listed at their own prices.
import { DEMO_WORLD } from "./profile";
import type { WorldSummary } from "./types";

export interface MarketTopic {
  id: string;
  title: string;
  blurb: string;
  /** placed on the buyer's next free island */
  world: WorldSummary;
}

export interface MarketSubject {
  id: string;
  title: string;
  icon: string;
  topics: MarketTopic[];
}

export const SUBJECTS: MarketSubject[] = [
  {
    id: "psychology",
    title: "Psychology",
    icon: "🧠",
    topics: [
      {
        id: "bobo",
        title: "Bobo Doll Experiment",
        blurb: "Bandura, Ross & Ross (1961): do children copy aggression they watch?",
        world: DEMO_WORLD,
      },
      {
        id: "loftus-palmer",
        title: "Loftus & Palmer",
        blurb: "Loftus & Palmer (1974): can one word in a question change what you remember?",
        world: {
          id: "market-loftus-palmer",
          title: "Loftus & Palmer",
          topic: "IB Psychology — Loftus & Palmer (1974)",
          creator: "EduOasis",
          createdAt: 0,
          lastVisitedAt: 0,
          recall: 1,
          gameType: "explore-collect",
        },
      },
    ],
  },
];

export interface PlayerListing {
  id: string;
  seller: string;
  price: number;
  world: WorldSummary;
}

// Demo listings from other players, until listings live on-chain.
export const PLAYER_LISTINGS: PlayerListing[] = [
  {
    id: "ava-milgram",
    seller: "Ava",
    price: 15_000,
    world: {
      id: "nft-milgram",
      title: "Milgram Obedience",
      topic: "IB Psychology — Milgram (1963)",
      creator: "Ava",
      createdAt: 0,
      lastVisitedAt: 0,
      recall: 1,
      gameType: "explore-collect",
      nftId: "EO-MILG42",
    },
  },
  {
    id: "sam-asch",
    seller: "Sam",
    price: 8_000,
    world: {
      id: "nft-asch",
      title: "Asch Conformity",
      topic: "IB Psychology — Asch (1951)",
      creator: "Sam",
      createdAt: 0,
      lastVisitedAt: 0,
      recall: 1,
      gameType: "explore-collect",
      nftId: "EO-ASCH07",
    },
  },
];

export function newNftId() {
  return `EO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function topicForWorld(worldId: string) {
  return SUBJECTS.flatMap((s) => s.topics).find((t) => t.world.id === worldId);
}
