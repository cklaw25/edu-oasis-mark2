# EduOasis: pitch script + demo video script

OxHack 2026 · main theme **TIME** · tracks: Solana, HRT (data for prediction & decisions), Gemini.
Written in Memphis's voice. Fill in the team name where it says **[TEAM]**.

The scripts keep three things apart so judges don't mix them up:
- **Core idea**: one sentence they should remember.
- **What we built**: only things that work in the demo today.
- **Potential**: where it goes next, clearly labelled as next.

---

## Part 1: Pitch script (2:00)

### Opening (0:00 – 0:20)
> "Hi, I'm Memphis, and with my team [TEAM] we built **EduOasis**: you upload your notes, and they become a **game world on your own island**. And like real memories, **your islands dry up over time when you forget** — so you come back and play to keep them alive. We built it for neurodivergent learners like us: students with ADHD, autism or dyslexia, so the study tool adapts to our brains instead of our brains adapting to the tool."

### Who & Problem (0:20 – 0:40)
> "Most of our team is neurodivergent. Textbooks and slides are walls of text, and videos don't answer you when you're confused. So we either zone out, or we cram and forget it all a week later. The problem isn't just *learning* — it's **time**: nobody tells you *what* you're forgetting or *when* to review it. And the people who struggle most with traditional systems get punished for it, instead of supported."

### Concept & Inspiration (0:40 – 1:00)
> "We were inspired by **Inside Out**: Riley's memories live on islands, and when she stops caring about them they crumble. EduOasis is that, for studying. Every topic is an island. Green means you remember it; as our forgetting-curve model predicts your memory fading, the island dries up. And inside each island, you don't *read* your notes — you *play* them. Learning who invented what? You dodge Tesla's lightning and Oppenheimer's bomb in a survival shooter. Learning a study? You run the experiment yourself. **This isn't a quiz with a skin on it. The game type is chosen to fit the content.**"

### How It Works & User Journey (1:00 – 1:40)
> "Here's how simple it is:
> **One** — walk to an empty island and upload your notes or slides.
> **Two** — Gemini reads every page, pulls out every fact, and builds a world: picture slides, then the games that fit — a drag-and-drop board for groups, a showdown for who-did-what, a timeline run for order, an inspect room for evaluation.
> **Three** — play it, and your island turns green again.
>
> Three things make it work:
> - **Nothing gets lost:** every fact is numbered and code checks that a game teaches it — our Loftus & Palmer world covers 29 out of 29.
> - **It predicts your forgetting:** a half-life memory model tells you which island is drying up and when to review — that's our TIME theme and our data track.
> - **Worlds are owned, on Solana:** each world is an NFT carrying a fingerprint of its file. You can buy other students' worlds in the **World Market** with **MOE**, our token live on Solana devnet, and creators earn royalties every time a world is resold.
>
> Pip, your AI companion, sits on top of all of it: ask it anything, it answers from your own notes."

### Impact & Closing (1:40 – 2:00)
> "We built this because we needed it ourselves. Today it turns one set of notes into a playable island in under a minute. **Next**, we want MOE to actually move on-chain, students to earn MOE by learning, and a game picker that learns which game type works best for *your* brain.
> Learning shouldn't be a wall of text you forget in a week. It should be a world you keep alive. That's EduOasis."

---

## Part 2: Demo video script (≈2:30)

Record the screen at 1280×720 or bigger. Start from **"reset demo"** (top-left card) so the hub is fresh: 3 empty islands, 30 MOE. Have a world already generated in a second browser profile in case Gemini is slow; cut the waiting in editing.

| Time | On screen | Voiceover |
|---|---|---|
| 0:00 – 0:12 | Hub: home island, 3 empty islands, World Market, MOE balance top right | "This is EduOasis. Each island is a topic you're learning. Right now I have three empty islands and 30 MOE." |
| 0:12 – 0:35 | Walk to an empty island, press E. Fill in topic ("Inventors"), drop in a notes PDF, press Generate. Cut to the finished island. | "I upload my notes. Gemini reads every page, numbers every fact, and designs a world around them. My first two worlds are free." |
| 0:35 – 0:50 | Enter the island. Click through 2 intro slides with their animated pictures. | "It starts with a short story, a picture per slide, never a wall of text." |
| 0:50 – 1:15 | **Showdown**: the WANTED poster, dodge thrown inventions, shoot the right inventor. Show one wrong hit ("That's Tesla — AC motor"). | "Then the games. The wanted poster says 'whoever throws the light bulb'. I have to know it's Edison. Hit the wrong one and it tells you who they really are." |
| 1:15 – 1:30 | Quick cut: **Squad Board** drag-and-drop (Loftus world) and the **Timeline Run** platformer. | "The game type comes from the content: a drag-and-drop board for groups, a platformer for anything with an order." |
| 1:30 – 1:45 | Summary screen, back to the hub: the island is green, label shows recall. Open Pip → Data → "⏩ +1 day": islands dry. | "Every answer feeds a forgetting-curve model. Skip a day and the island dries up. Pip tells me what to review next and when." |
| 1:45 – 2:05 | Pip chat: "Quiz me on what I'm weakest at." Answer appears with a `[K3 · source]` citation. | "Pip answers from my own notes and cites where each fact came from." |
| 2:05 – 2:25 | World Market: Shop → Psychology → buy Loftus & Palmer for 30 MOE → toast "Fingerprint verified". Wallet tab: the live MOE token on devnet. | "In the World Market I can buy other students' worlds with MOE, our token on Solana devnet. Every world is an NFT holding a fingerprint of its file, so I know it hasn't been tampered with, and creators earn a royalty on every resale." |
| 2:25 – 2:35 | Hub with the new island, then the logo / title card. | "Your notes, turned into worlds you keep alive. EduOasis." |

**Honest labels for the video:** the market says "Solana devnet · simulated". The MOE token and its supply are real on devnet; in-app balances and purchases are simulated for now. Don't claim on-chain transfers.

---

## Part 3: Judge table (4–5 min, live)

Order: **30-second pitch** (Opening + Concept), then **live demo** of hub → one island → Pip Data "+1 day" → market purchase, then **questions**.

Short answers to likely questions:
- **"Isn't this just a quiz?"** No. The design pass picks a game type from the content's shape: pairs → Showdown, groups → Squad Board, order → Timeline Run, evaluation → Inspect room.
- **"How do you know the AI didn't skip things?"** Pass 1 numbers every fact (K1…Kn); every game element cites the facts it teaches; code checks coverage and a patch pass fills the gaps. Pip → Notes shows it.
- **"What's the prediction?"** A half-life forgetting curve per island (simplified Duolingo half-life regression): recall = 2^(−time since review ÷ half-life), with the half-life updated by session accuracy.
- **"Why Solana and not a card payment?"** Ownership + integrity + royalties: a world NFT stores the creator and the file's SHA-256, and resale royalties are enforced by the chain. Fees are a fraction of a penny, so small payments between students work.
- **"What's real on-chain today?"** The MOE token (Token-2022 on devnet, 1,000,000 supply), read live by our server. Purchases, NFTs and badges are simulated with the same interface the real calls will use.
- **"Running cost?"** A generation is roughly a penny on paid Gemini tiers; all art is drawn in code (no AI images), hosting on a free tier.

---

## What's built vs potential (keep these apart when speaking)

**Built and in the demo**
- Island hub with 3 islands + World Market; islands dry up with predicted recall
- AI world generation from PDFs / notes / images (Gemini, 3 passes, coverage check)
- Game types: Showdown, Squad Board, Timeline Run, Sorting Shooter, Sorting Arena, Inspect Room, plus the hand-made Bobo doll experiment
- Picture slides for every intro card
- Pip: chat grounded in your notes, study notes, my notes, learning data + "time travel" demo
- World Market in MOE: shop by subject, player resale listings with 10% creator royalty, list/sell your own worlds, membership pass, wallet & history; SHA-256 fingerprint check on every purchase
- MOE token live on Solana devnet (read by `/api/solana/moe`)
- My worlds library: own any number of worlds, choose which 3 sit on the islands; 2 free generations, then 10 MOE each

**Potential (next, not built)**
- Real on-chain MOE transfers, world NFTs and badges (same functions, real devnet calls)
- Learn-to-earn: MOE rewards for finishing and reviewing worlds (designed, held back)
- A game-type picker that learns per learner (multi-armed bandit)
- Pip with a voice (dyslexia / ADHD friendly), focus sensing, 3D worlds
- Membership fees split between creators by measured learning gains
