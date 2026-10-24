// World Market catalog: subjects, each with subtopic worlds bought for MOE.
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
