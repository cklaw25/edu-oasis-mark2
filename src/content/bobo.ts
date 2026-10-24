// Hand-authored demo world: Bandura, Ross & Ross (1961). Also the reference for what Gemini should generate.

export interface Slide {
  speaker: string;
  keyword?: string;
  text: string;
  visual?: "matched-pairs" | "conditions";
}

export const INTRO: Slide[] = [
  {
    speaker: "Pip",
    keyword: "Aim",
    text: "Welcome to 1961, Stanford University Nursery School. Albert Bandura wants to know: if children watch an adult being aggressive, will they copy it — even when the adult is gone?",
  },
  {
    speaker: "Pip",
    keyword: "Sample",
    text: "72 children took part — 36 boys and 36 girls, aged 3 to 5 (average 4 years 4 months), all from the same university nursery.",
  },
  {
    speaker: "Pip",
    keyword: "Matched pairs design",
    text: "Before the study, the experimenter and a nursery teacher rated how aggressive each child normally was. Children with similar scores were split across the groups, so every group started out equally aggressive.",
    visual: "matched-pairs",
  },
  {
    speaker: "Pip",
    keyword: "Independent & dependent variables",
    text: "IV: what the child watched — an aggressive model, a non-aggressive model, or no model (control) — and whether the model was the same sex as them. DV: how many aggressive acts the child later imitated.",
    visual: "conditions",
  },
  {
    speaker: "Pip",
    keyword: "Your role: the model",
    text: "YOU are the adult model. Children are watching through a one-way mirror. The condition swaps every 10 seconds. AGGRESSIVE: keep hitting Bobo (SPACE). NON-AGGRESSIVE: ignore Bobo and quietly collect tinker toys. Break the condition 3 times and the experiment is ruined!",
  },
];

export const AFTER_EXPERIMENT: Slide = {
  speaker: "Pip",
  keyword: "Procedure, stage 2 & 3",
  text: "Next, each child was mildly frustrated — shown attractive toys, then told they were reserved for other children. Then they were left in a room with a Bobo doll for 20 minutes and observed through a one-way mirror every 5 seconds. Here's what they did…",
};

// Mean imitative PHYSICAL aggression (Bandura, Ross & Ross, 1961, Table 1)
export const RESULTS = [
  { label: "Aggressive model · same sex", boys: 25.8, girls: 5.5 },
  { label: "Aggressive model · opposite sex", boys: 12.4, girls: 7.2 },
  { label: "Non-aggressive model · same sex", boys: 1.5, girls: 2.5 },
  { label: "Non-aggressive model · opposite sex", boys: 0.2, girls: 0.0 },
  { label: "Control (no model)", boys: 2.0, girls: 1.2 },
];

export const FINDINGS = [
  "Children who watched the aggressive model imitated far more aggression than either other group.",
  "Boys imitated more physical aggression than girls, especially from a male model.",
  "Same-sex models were copied more — children identify with similar models (social learning theory).",
];

export type Verdict = "strength" | "weakness";

export interface Clue {
  id: string;
  icon: string;
  label: string;
  x: number;
  y: number;
  claim: string;
  answer: Verdict;
  why: string;
  tag: string;
}

// Peer Review phase: objects in the lab hide evaluation points
export const CLUES: Clue[] = [
  {
    id: "nursery",
    icon: "🏫",
    label: "Nursery sign",
    x: 160,
    y: 150,
    claim: "Every child came from a single university nursery (Stanford).",
    answer: "weakness",
    why: "Sample bias: children of university staff/students may not represent all children, so it's hard to generalise.",
    tag: "Generalisability",
  },
  {
    id: "mirror",
    icon: "🪞",
    label: "One-way mirror",
    x: 500,
    y: 110,
    claim: "Children were observed through a one-way mirror by two observers, whose ratings agreed strongly (r = .89).",
    answer: "strength",
    why: "High inter-rater reliability, and children didn't know they were watched, so behaviour was more natural.",
    tag: "Reliability",
  },
  {
    id: "bobo",
    icon: "🤡",
    label: "Bobo doll",
    x: 840,
    y: 150,
    claim: "Bobo is an inflatable doll that is designed to be knocked over and bounce back up.",
    answer: "weakness",
    why: "Demand characteristics: hitting Bobo is what the toy is for — it isn't the same as aggression towards a real person.",
    tag: "Validity",
  },
  {
    id: "clipboard",
    icon: "📋",
    label: "Rating sheet",
    x: 160,
    y: 460,
    claim: "Children were matched on their normal aggression levels before being put into groups.",
    answer: "strength",
    why: "Matched pairs design controls participant variables, so differences come from the IV, not personality.",
    tag: "Control",
  },
  {
    id: "clock",
    icon: "⏱️",
    label: "Wall clock",
    x: 840,
    y: 460,
    claim: "Children were only tested once, shortly after watching the model.",
    answer: "weakness",
    why: "No long-term follow-up: we don't know if the imitation lasted beyond the lab session.",
    tag: "Short-term only",
  },
  {
    id: "cupboard",
    icon: "🔒",
    label: "Locked toy cupboard",
    x: 500,
    y: 520,
    claim: "Children were deliberately frustrated and shown adult aggression as part of the procedure.",
    answer: "weakness",
    why: "Ethics: young children were exposed to aggression and distress, and couldn't meaningfully consent.",
    tag: "Ethics",
  },
  {
    id: "script",
    icon: "📜",
    label: "Model's script",
    x: 330,
    y: 300,
    claim: "Every model performed exactly the same actions and phrases ('Sock him in the nose…', 'Pow!').",
    answer: "strength",
    why: "Standardised procedure: the study is easy to replicate and every child saw the same thing.",
    tag: "Replicability",
  },
  {
    id: "lab",
    icon: "🧪",
    label: "Lab room",
    x: 670,
    y: 300,
    claim: "The whole study took place in an artificial lab room with an adult stranger as the model.",
    answer: "weakness",
    why: "Low ecological validity: real-life aggression is learned from familiar people over time, not one session.",
    tag: "Ecological validity",
  },
];

export const BOBO_QUOTES = ["POW!", "Sock him in the nose!", "Hit him down!", "Kick him!", "Throw him in the air!"];
