// Worlds sold in the World Market. Each generated world file came from our own pipeline (short notes in, world out);
// Bobo is the hand-built demo world. Creators, learner stats and player resale listings are demo data.
import type { WorldSpec } from "@/lib/worldSpec";
import inventors from "./samples/inventors.world.json";
import loftus from "./samples/loftus.world.json";
import milgram from "./samples/milgram.world.json";
import photosynthesis from "./samples/photosynthesis.world.json";
import ww1 from "./samples/ww1.world.json";

export interface Subject {
  id: string;
  title: string;
  icon: string;
}

export const SUBJECTS: Subject[] = [
  { id: "psychology", title: "Psychology", icon: "🧠" },
  { id: "history", title: "History", icon: "📜" },
  { id: "biology", title: "Biology", icon: "🌿" },
];

export interface CatalogEntry {
  /** the world NFT's address */
  assetId: string;
  /** id the world gets on the buyer's islands */
  worldId: string;
  title: string;
  topic: string;
  blurb: string;
  icon: string;
  subject: string;
  /** the world file; Bobo is built into the app instead */
  spec?: WorldSpec;
  gameType: "rpg-experiment" | "explore-collect";
  creator: string;
  creatorName: string;
  learners: number;
  avgRecallGain: number;
}

const EDUOASIS = "EduoAsisXn8Bt7xKpQ2mZr9TfW3bN8cVd5LhJ4sYg6EuA";

export const CATALOG: CatalogEntry[] = [
  {
    assetId: "B0b0D0llExp3r1mentWor1dAsset1EuA1oRiPq2Xn8Bt7",
    worldId: "demo-bobo",
    title: "Bobo Doll Experiment",
    topic: "IB Psychology — Bandura, Ross & Ross (1961)",
    blurb: "Run the lab yourself: do children copy the aggression they watch?",
    icon: "🤡",
    subject: "psychology",
    gameType: "rpg-experiment",
    creator: EDUOASIS,
    creatorName: "EduOasis",
    learners: 431,
    avgRecallGain: 0.36,
  },
  {
    assetId: "L0ftusPa1merWor1dAsset8cVd5LhJ4sYg6EuA1oRiPq2",
    worldId: "sample-loftus",
    title: "Loftus & Palmer (1974)",
    topic: "IB Psychology — reconstructive memory & leading questions",
    blurb: "Can one word in a question change what you remember?",
    icon: "🚗",
    subject: "psychology",
    spec: loftus as WorldSpec,
    gameType: "explore-collect",
    creator: EDUOASIS,
    creatorName: "EduOasis",
    learners: 268,
    avgRecallGain: 0.33,
  },
  {
    assetId: "MiLgRaMob3d1enc3Wor1dAsset9xQ7r2Lk5vT8nB4mCs",
    worldId: "market-milgram",
    title: "Milgram (1963) Obedience",
    topic: "IB Psychology — Milgram (1963) obedience",
    blurb: "How far will people go when someone in a lab coat says so?",
    icon: "⚡",
    subject: "psychology",
    spec: milgram as WorldSpec,
    gameType: "explore-collect",
    creator: "7xKpQ2mZr9TfW3bN8cVd5LhJ4sYg6EuA1oRiPq2Xn8Bt",
    creatorName: "psych_with_priya",
    learners: 214,
    avgRecallGain: 0.31,
  },
  {
    assetId: "InV3nt0rsSh0wd0wnWor1dAsset6EuA1oRiPq2Xn8Bt7x",
    worldId: "market-inventors",
    title: "Inventors Who Changed the World",
    topic: "History of technology — who invented what",
    blurb: "Newton, Tesla, Oppenheimer… dodge their inventions and learn who made what.",
    icon: "💡",
    subject: "history",
    spec: inventors as WorldSpec,
    gameType: "explore-collect",
    creator: "5LhJ4sYg6EuA1oRiPq2Xn8Bt7xKpQ2mZr9TfW3bN8cVd",
    creatorName: "techhistory.sam",
    learners: 97,
    avgRecallGain: 0.34,
  },
  {
    assetId: "WW1Caus3sWor1dAsset2Xn8Bt7xKpQ2mZr9TfW3bN8cVd",
    worldId: "market-ww1",
    title: "Causes of World War One",
    topic: "History — causes of World War One",
    blurb: "From the alliances to Sarajevo: run the timeline and sort the causes.",
    icon: "⚔️",
    subject: "history",
    spec: ww1 as WorldSpec,
    gameType: "explore-collect",
    creator: "9TfW3bN8cVd5LhJ4sYg6EuA1oRiPq2Xn8Bt7xKpQ2mZr",
    creatorName: "historyhannah",
    learners: 152,
    avgRecallGain: 0.24,
  },
  {
    assetId: "PhoT0synTh3s1sWor1dAsset4bN8cVd5LhJ4sYg6EuA1",
    worldId: "market-photosynthesis",
    title: "Photosynthesis",
    topic: "Biology — photosynthesis",
    blurb: "Light in, glucose out: build the process step by step.",
    icon: "☀️",
    subject: "biology",
    spec: photosynthesis as WorldSpec,
    gameType: "explore-collect",
    creator: "3mVd8LhJ4sYg6EuA1oRiPq2Xn8Bt7xKpQ2mZr9TfW3bN",
    creatorName: "bio.tom",
    learners: 389,
    avgRecallGain: 0.27,
  },
];

/** Other players reselling worlds they bought (the original creator gets a royalty on each resale). */
export interface PlayerListing {
  id: string;
  assetId: string;
  seller: string;
  price: number;
}

export const PLAYER_LISTINGS: PlayerListing[] = [
  { id: "ava-milgram", assetId: "MiLgRaMob3d1enc3Wor1dAsset9xQ7r2Lk5vT8nB4mCs", seller: "Ava", price: 22 },
  { id: "sam-photosynthesis", assetId: "PhoT0synTh3s1sWor1dAsset4bN8cVd5LhJ4sYg6EuA1", seller: "Sam", price: 18 },
];
