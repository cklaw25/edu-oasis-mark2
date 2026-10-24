# EduOasis Mark 2 — Discussion Notes

Shared notes for the team (Memphis + Correy). Updated on request, not after every change.
**Last updated: Sat 24 Oct 2026, ~16:40 (OxHack day 1)** · Deadline: **Sun 25 Oct, 12:00 on Devpost**

---

## 0. TL;DR — where we are

- **Working now (local, `npm run dev`):** a 2D island hub, the hand-made Bobo doll world, **AI-generated worlds from uploaded notes**, and **Pip**, the AI study companion, with notes and learning data.
- **Not built yet:** the market island and Solana (Correy), the game-type picker that learns from data, the public deploy, 3D.
- **Stack:** Next.js 15 + React 19 + **Phaser 3** (2D game) + Tailwind + **Gemini API** (`@google/genai`). The world file and recall model are TypeScript in `src/lib`.

### Run it
```bash
git clone https://github.com/cklaw25/edu-oasis-mark2 && cd edu-oasis-mark2
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY (ask Memphis; never commit it)
npm run dev                   # http://localhost:3000
```
Controls: WASD/arrow keys move, **E** interacts, SPACE hits Bobo, **✦ Pip** button bottom right.
"reset demo" (top-left card) wipes local progress.

---

## 1. Hackathon context (OxHack 2026, Oxford)

- 24–25 Oct, about 25 hours of hacking (the clocks go back). **Submission: Devpost by 12:00 Sunday**: video demo + description + GitHub (+ public URL).
- **Judging:** science-fair style, **4–5 minutes per judge**. A live demo is better than slides.
- **Main track theme: TIME.** Prizes are First, Runner Up and Best Hand Made (Citadel). We can enter the main track and sponsor tracks at the same time.

| Track | Prize | How EduOasis fits |
|---|---|---|
| **Solana** (main sponsor target) | Unruggable hardware wallets | World NFTs, membership pass, creator royalties, badges (section 6) |
| **HRT: data for prediction & decision-making** | — | Forgetting-curve recall prediction, Pip's recommendations, the game-type picker (section 5) |
| **Gemini API** | Swag | Already powers world generation and Pip |
| Tiger Data | Stream Deck | Time-series storage for learning telemetry. Strong fit if we have time |
| ElevenLabs | Earbuds | Give Pip a voice (good for dyslexic and ADHD learners) |
| Presage | Fitbit | Camera-based focus sensing to adapt the game. Stretch only |

**Idea graded vs alternative:** the "draw weather, simulate in 3D" idea for HRT scored about 5/10 (a toy, hard 3D work, "better than the Met Office?" problem). EduOasis scored about 8/10 (it has won before, has a real user group, and fits Solana + TIME + HRT at once). **Decision: EduOasis only.**

---

## 2. The product

An edtech platform for **neurodivergent / ADHD learners**: upload resources and they become a **game world**. It is deliberately not Kahoot-style quizzing.

- **Hub ("Inside Out" style):** a main island with bridges to **3 world islands** (one per generated world) and a **market island** on the opposite side.
- **3 free generations** per user. After that, buy access to other people's worlds (Solana).
- **Pip:** an AI companion (like a Genshin teammate or Jarvis) that guides you, recaps, quizzes, takes notes and lets you jump between topics non-linearly.
- **Islands dry up over time** as predicted recall falls (the TIME theme). Replaying a world waters it again.

Origin: EduOasis v1 won at HKUST Hackathon 2026 (2D pixel world). Old repo, reference only: https://github.com/SpectrumTantrum/EDU-Oasis-V2. **Mark 2 is a rebuild from scratch.**

---

## 3. What's built

### 3.1 Hub (`src/game/HubScene.ts`)
- Code-drawn islands, bridges, palm trees, ocean and portals. **No image files**: all art is shapes drawn in code plus emoji.
- Island greenness and palm colour follow predicted recall. Each label shows "recall X%".
- The player's position is kept across restarts, so you come back next to the island you just played.

### 3.2 Bobo doll world (hand-made showcase, IB Psych: Bandura, Ross & Ross 1961)
1. **Intro:** 5 cards from Pip covering aim, sample, **matched pairs design** (with a diagram), IV/DV, and your role.
2. **Experiment** (`ExperimentScene.ts`): **you are the adult model** inside a TV-framed playroom. Kids watch through a one-way mirror. The condition swaps **every 10 seconds**:
   - *Aggressive:* hit Bobo (SPACE). Bobo wobbles back up and shouts lines from the study ("Sock him in the nose!"). The aggression meter empties after 3 seconds without a hit.
   - *Non-aggressive:* quietly collect tinker toys. Hitting Bobo counts as a strike.
   - Watching kids **shake and turn redder** as agitation builds, and calm down in quiet rounds.
   - 3 strikes ruins the experiment (the game explains the confounded IV); survive 4 rounds to pass.
3. **Results:** an animated chart of the **real 1961 numbers** (e.g. boys with a same-sex aggressive model = 25.8), plus key findings.
4. **Peer Review** (`LabScene.ts`): walk Bandura's lab and inspect 8 objects (nursery sign, one-way mirror, Bobo, rating sheet, clock, locked cupboard, script, lab room). For each one, judge **strength or weakness**, then get an explanation. **Prof. Skeptic** 🧐 chases you, and getting caught costs a heart.
5. **Summary:** scores feed the recall model.

### 3.3 AI world generation (`src/app/api/generate/route.ts`)
Upload a PDF, text or images plus a topic and special requests, and you get a playable world in **about 15 seconds**.
- **Model:** `gemini-3.5-flash-lite`. The bigger Flash models took 1–6 minutes per call on the free tier during the event. It can be changed with `GEMINI_MODEL` in `.env.local`.
- Generated worlds play as **intro slides → sorting arena → inspect room → summary**:
  - **Arena** (`ArenaScene.ts`): floating labels. The wanted category (e.g. "Experiment 1" vs "Experiment 2") **flips every 10 seconds**. Touch matching labels and dodge the others. There's no fail state; mistakes come back later.
  - **Inspect room:** the Bobo lab generalised. AI-chosen emoji objects, a binary judgement (Strength/Limitation, True/False…), and an explanation.

### 3.4 How detail is kept ("nothing lost" guarantee)
1. **Pass 1, extract:** Gemini pulls out **every** term, number, study detail, process and evaluation point as separate facts `K1..Kn`, each with its source (file + page).
2. **Pass 2, design:** every slide, arena item and room object **cites the fact IDs it teaches** (`refs`).
3. **Code checks coverage** (`coverage()` in `src/lib/worldSpec.ts`). Any missing facts go to **pass 3, patch**, which adds elements for them.
4. Pip gets the full fact list, so even facts that don't suit gameplay can still be asked about.
- Test result: Loftus & Palmer notes gave **21/21 facts covered**, numbers exact.
- **See it yourself:** Pip → Notes. It shows "X/Y facts taught", where each fact is taught, and a **Download world file (JSON)** button.

### 3.5 Pip (`src/components/PipPanel.tsx`, `src/app/api/pip/route.ts`)
- **Chat:** grounded in every island's facts plus the learner's recall and weak spots. Cites sources like `[K3 · source]`. Quick buttons: "What should I revisit?", "Quiz me", "Recap".
- **Notes:** readable study notes grouped by type (study / term / number / evaluation…), plus where each is taught.
- **My notes:** personal notes per world, autosaved.
- **Data:** the prediction and decision dashboard (section 5).

### 3.6 Storage (for now)
Everything is in the browser's `localStorage`: the profile, world files (`eo2.world.<id>`), the interaction log (`eo2.events`) and notes. Moving to a database (Supabase / Tiger Data) comes with deploy and market work.

---

## 4. Decisions made

| Topic | Decision |
|---|---|
| 2D vs 3D | **2D first (Phaser)**, 3D (React Three Fiber, Bruno Simon style) later only if time allows. |
| AI provider | Gemini (free tier, reads PDFs directly, Gemini prize track). |
| Running cost | Generating a world on Flash-Lite costs about a penny or less on paid tiers. **Never generate AI images per world** (expensive), so all art is code-drawn. Hosting on Vercel's free tier = £0. |
| Analysis gameplay | Peer Review room with Prof. Skeptic, rather than simple matching. |
| Membership vs per-world | **Resellable membership pass (NFT).** Membership fees go into a pool **split between creators by measured learning** (the pool split can be pitch-only). |
| Network | **Solana devnet only** (no real money; avoids financial and age-regulation questions). |

---

## 5. Data · prediction · decision-making (HRT track)

**Prediction: recall per island**, using a half-life forgetting curve (a simplified version of Duolingo's half-life regression):
```
recall = 2^(−time since last review ÷ half-life)
after a session: accuracy ≥ 50% → half-life × (1 + (acc − 0.5)·4)   (100% ≈ ×3)
                 accuracy < 50% → half-life × (0.5 + acc)            (0%  = ×0.5)
```
Recall = the predicted chance you'd still answer this island's questions correctly. Islands dry up in real time. **Demo:** Pip → Data → "⏩ +1 day".

**Decisions Pip makes:**
- Which island to revisit next (lowest predicted recall)
- Which concepts to focus on (weak spots = answered wrong, or **hesitated**, i.e. more than 1.6× your median answer time)
- Which game type suits you (accuracy per game type, with at least 3 samples)

**Collected now:** every answer (correct or not, time taken), arena mistakes per item, experiment strikes and hits, session accuracy and timestamps.
**To add:** idle time and pauses, questions asked to Pip, which notes are opened, game type chosen vs results.
**Next model:** a **game-type picker that learns** (multi-armed bandit / Thompson sampling) for "Let EduOasis decide". It tries game types, measures the learning that results, and favours what works while still occasionally trying others.

---

## 6. Solana plan (Correy)

**Principle:** use the chain for things a card payment can't do, not just "pay with crypto".

| Feature | Why on-chain | Priority |
|---|---|---|
| **Each world = an NFT** (Metaplex Core). It stores the creator, a **sha256 hash of the world file** and a parent ID if it's a remix | Proof of who made a world and that it hasn't been changed | MVP |
| **Membership pass NFT**, resellable | One wallet check unlocks the market worlds; it can be resold | MVP |
| Per-world access pass (alternative / extra) | Paying the creator directly. Very small payments work because fees are a fraction of a penny (card fees of ~20p would eat a 10p world) | MVP-lite |
| Creator royalties on resale (Core Royalties plugin) | Enforced by the chain, not by our goodwill | Stretch |
| Remix family tree: a remixed world records its parent, and royalties flow back | A transparent record of who built on whose work | Stretch |
| **Completion badges** that can't be transferred, with a timestamp | A tamper-proof learning record you own (also fits TIME) | MVP-lite |
| Membership pool split between creators by measured learning | Links Solana to the data story | Pitch |

**How a bought world reaches the buyer:**
1. The world file JSON is stored **off-chain** (our database or storage). The NFT holds its **hash** + URI.
2. The buyer connects a wallet. The server checks they hold the membership/access pass and returns the world file.
3. The client **re-hashes the file and compares it with the on-chain hash** (integrity check). The world is added to one of the buyer's islands **without using a free generation**.
4. Optional **Remix**: regenerate a version tailored to the buyer from the same facts (uses a generation), minting a child NFT with `parent` set.

**Functions the game side will call** (build against mocks first):
```
connectWallet()                        -> pubkey
mintWorld(spec, specHash, priceSol)    -> worldAssetId
buyMembership() / buyAccess(assetId)   -> txSignature
hasAccess(pubkey, assetId?)            -> boolean
mintBadge(pubkey, worldId, score)      -> badgeAssetId   (non-transferable)
listWorlds()                           -> [{ assetId, title, creator, price, coverage, avgRecall }]
```
Suggested libraries: `@solana/web3.js`, the wallet adapter (Phantom), and Metaplex Core via Umi. No custom Anchor program unless there's spare time.

---

## 7. Timeline / remaining plan (it's ~15:30 Sat)

| When | What |
|---|---|
| **17:30–18:30** | 🔔 **Ask judges and sponsors for feedback in person** (demo Bobo → Pip → generate a world) |
| next | Market island UI + mocks for the Solana functions, so Correy can plug in |
| tonight | **Deploy to Vercel** (public URL so the submission is a link). Maybe a free domain from MLH |
| tonight | Game-type picker that learns (bandit) + more data collection |
| overnight | Solana integration end to end: mint → buy → unlock → badge |
| if time | 3D version, ElevenLabs voice for Pip, Tiger Data |
| **09:00 Sun** | **Feature freeze.** Demo video, Devpost write-up, final push |

**4–5 min demo flow:** upload notes → world generated (show 21/21 coverage) → play arena and inspect → Pip Data: recall + "+1 day" (the island dries) → replay waters it → market: mint the world, a second wallet buys membership, the world unlocks → completion badge in the wallet.

---

## 7b. Update ~16:40 Sat

- **Two scores per island** (big and small on the hub, both in Pip → Data):
  - **Lifespan (big):** share of the current review interval left. 100% = just reviewed, 0% = review due. Intervals grow **2 → 4 → 6 → 8… days** with each good session (≥ 60%) and reset to 2 days after a weak one. **Island colour and palms follow this score** (green → brown).
  - **Recall (small):** forgetting-curve prediction (section 5).
  - Pip's "revisit next" picks the most overdue island (lowest lifespan), with weakest recall as the tie-break.
- **Pip remembers:** chat history is saved (with a "clear chat" button), and Pip now reads the learner's own notes as well as all world facts. My notes were already saved per world.
- **Generation quality over speed** (team decision): uses `gemini-3.8-flash`, falling back per call to `gemini-3.5-flash-lite` on a 4-minute timeout or "model overloaded". Takes about 4 minutes now; we'll optimise speed later. Env vars: `GEMINI_GEN_MODEL` / `GEMINI_MODEL`.
- **Sample world shipped:** Loftus & Palmer (1974), generated by our own pipeline with the quality model. **30/30 facts covered.** File: `src/content/samples/loftus.world.json`. It's in the default profile (click "reset demo" to see it). It's also a demo fallback if live generation is slow.
- **Solana blocker solved:** Corey's treasury `CNp9…VZUq` was funded with 1 devnet SOL via faucet.solana.com using Memphis's GitHub (that faucet limits per GitHub account, not per Wi-Fi). Corey's next steps are in his branch `corey/discussion-note`.
- **Tiger Data:** agreed it's a good fit (time-series learning data). It'll be done as part of the data-collection task, after we decide exactly what to collect and make the Data tab plain-language.
- **Before submission:** remove `DISCUSSION_NOTES.md` and `discussion-note-corey.md` from the repo.
- **Later / low priority:** progression levels; in-game tokens (likely MOE: earned by proven learning, spent on worlds).

## 8. Open items
- [ ] Correy: confirm collaborator access to this repo; pull and run locally
- [ ] Brain dump from the presentation slides (Memphis to send)
- [ ] Memphis's full feature list (some already covered above)
- [ ] Which extra sponsor tracks we submit to (Gemini for sure; HRT; ElevenLabs/Tiger Data if time)
- [ ] Remaining reminders: public URL; use collected data for prediction; 3D attempt
