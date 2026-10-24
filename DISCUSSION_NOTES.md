# EduOasis Mark 2 — Discussion Notes

Shared notes for the team. Updated on request, not after every change.
Last updated: 2026-10-24 (OxHack 2026, day 1)

---

## 1. Hackathon context (OxHack 2026, Oxford)

- **Dates:** Sat 24 – Sun 25 Oct 2026. About 25 hours of hacking, because the clocks go back that night.
- **Judging:** science-fair style, **4–5 minutes per judge**. A live demo matters more than slides.
- **Main track theme:** **TIME**. Main prizes are First Place, Runner Up and Best Hand Made Project (Citadel). We can enter the main track and sponsor tracks at the same time.
- **Submission deadline:** ❓ not confirmed yet. Check 26.oxhack.net or Discord.

### Tracks relevant to us
| Track | Prize | Fit |
|---|---|---|
| **Solana** (our main sponsor target) | Unruggable hardware wallets | "Show us how you can innovate with Solana". The MLH talk called out games and real-time marketplaces. |
| Gemini API | Swag kits | Free and easy to add. Use it for resource → game generation. |
| ElevenLabs | Earbuds | Cheap add: narrated NPCs, which suit dyslexic and ADHD learners. |
| Presage | Fitbit | Camera-based focus/attention sensing that could adapt the game for ADHD learners. Stretch goal only. |
| Delta (sponsor talk) | — | Scores speed/UX 30%, tech 25%, innovation 25%, polish 20%. Only worth it if we actually use Delta. |

---

## 2. Origin

EduOasis v1 was built at the HKUST Hackathon 2026 and won. It was a 2D pixel-art world where you interact with map elements: a tutor, a quiz, a file-upload corrector. 3D was planned but there wasn't time.
Old repo: https://github.com/SpectrumTantrum/EDU-Oasis-V2 (Next.js + R3F + Supabase). **Mark 2 is a rebuild from scratch.** We only reference the old repo, we don't reuse it.

---

## 3. Core idea (agreed by the team)

1. **The game:** an edtech platform where you upload learning resources (PDF, notes, slides) and they become an **interactive 3D game world**. It's built for neurodivergent and ADHD learners, and it is deliberately not a Kahoot-style quiz.
2. **The economy (Solana track):** each user can generate **3 free games**. After that they either pay, or they **buy or trade access** to games other users have generated. Payments and trades go through **Solana and a digital wallet**.

---

## 4. Proposed refinements (Claude's suggestions, for team review)

### 4.1 Architecture: a "game" is a data file
Generating real 3D geometry with AI in 24 hours is not realistic. Instead:
- We build **one hand-made 3D oasis world engine**: islands, NPCs, stations, collectibles, gates.
- The AI (Gemini) turns a resource into a **Game Spec JSON**: zones = topics, NPC dialogue = explanations, in-world challenges = checks, collectibles = key facts, a boss gate = mastery check.
- **Game = Spec JSON + engine.** This keeps generation reliable. It also makes each game a small, hashable object, which is exactly what we can mint, own and trade on-chain. The Solana side is built around the spec file.

### 4.2 Make Solana necessary rather than added on
Avoid "crypto as a payment button". Judges see that a lot. Things a card payment can't do:

| Feature | Why it needs a blockchain | Priority |
|---|---|---|
| **Each game is minted as an NFT asset** (Metaplex Core). The metadata stores the creator, a hash of the spec and the source topic | Provable creator ownership and authenticity. Anyone can verify who made a game and that it hasn't been changed | **MVP** |
| **Buy an access pass**: one atomic transaction pays the creator (plus a small platform fee) and mints an access-pass asset to the buyer's wallet. The game unlocks if the wallet holds a pass | Creators are paid instantly, directly and without a middleman. **Micro-payments** (e.g. £0.10 per game) are only possible because Solana fees are a fraction of a cent, while card fees (~20p fixed) would eat the price | **MVP** |
| **Creator royalties on resale** (Core Royalties plugin). Access passes can be resold or traded, and the original creator earns a % every time | Royalties are enforced by the protocol, not by our platform's goodwill. Students and teachers who make good games earn ongoing income | Stretch |
| **Remix provenance**: forking someone's game records the parent asset, so royalties flow back to the original author | A transparent family tree of who built on whose work | Stretch |
| **Proof-of-learning badges**: completing a game mints a **non-transferable** (soulbound) badge with a timestamp | A tamper-proof, timestamped learning record a student owns forever. **It also ties into the TIME theme** (see 4.3) | MVP-lite |

The pitch line: *"Learners own their progress, creators own their games, and the blockchain is the permanent, timestamped record of both."*

**Practical decisions:**
- Use **devnet only**: no real money, and it avoids financial and age-related regulation questions from judges.
- Use the **free-generation counter off-chain** (database). Not everything needs to be on-chain.
- **No custom Anchor program** unless there's spare time. Metaplex Core + SystemProgram transfers + one server-co-signed transaction covers the MVP.
- Wallet: Phantom through the Solana wallet-adapter. Mention embedded wallets for non-crypto users as future work.

### 4.3 Hitting the TIME theme (main prizes)
- **The oasis dries up over time.** Each zone's water and plants fade along the **forgetting curve** (spaced repetition). Revisiting a zone re-waters it. Time becomes the core mechanic, it suits ADHD learners (visual and low-pressure), and it's very easy to demo.
- On-chain timestamped badges give a **learning timeline** you can prove.
- Optional: short, time-boxed "focus sprints" (Pomodoro-style) built into quests.

---

## 5. Work split

| Person | Owns |
|---|---|
| **Memphis** | EduOasis Mark 2 game: 3D engine, resource → Game Spec generation, gameplay, forgetting-curve mechanic |
| **Teammate** | Solana side: wallet connect, minting games, the buy-access-pass transaction, ownership checks, badges |

### Interface contract (agree on this first so we can work in parallel)
```
GameSpec JSON  -> { id, title, creator, topic, zones[], npcs[], challenges[], collectibles[], createdAt }
specHash       =  sha256(GameSpec JSON)

Teammate exposes (frontend functions or API routes):
  connectWallet()                       -> pubkey
  mintGame(spec, specHash, priceSol)    -> gameAssetId
  buyAccess(gameAssetId)                -> txSignature   (pay creator + mint pass, atomic)
  hasAccess(pubkey, gameAssetId)        -> boolean
  mintBadge(pubkey, gameAssetId, score) -> badgeAssetId   (non-transferable)
  listGames()                           -> [{ assetId, title, creator, price, ... }]
```
The game side only calls these functions. Until the real versions exist, both sides work against mocks.

---

## 6. Timeline (to adjust once the deadline is confirmed)

| Block | Game (Memphis) | Chain (Teammate) |
|---|---|---|
| H0–2 | Agree the stack, contract and repo scaffold | Same; set up the devnet wallet and test SOL |
| H2–8 | 3D oasis engine renders a hard-coded Game Spec | Wallet connect, mint a game asset on devnet |
| H8–12 | Gemini: resource → Game Spec | buyAccess atomic transaction and hasAccess |
| **H~12** | **🔔 Ask judges and mentors for feedback in person** | |
| H12–18 | Forgetting-curve mechanic and polish | Marketplace page, badges |
| H18–21 | Integration: generate → mint → buy → play → badge | |
| H21–end | **Freeze features.** Demo script, Devpost, video and backup recording | |

**Demo flow (4–5 min):** upload notes → a world is generated → play one zone → time skips forward and the oasis dries → revisit and restore it → mint and list the game → second wallet buys access → completion badge appears in the wallet.

---

## 7. Open questions
- [ ] Submission deadline and platform (Devpost?)
- [ ] Teammate's name and Solana/JS experience
- [ ] Memphis's full feature list for the game (to come)
- [ ] Brain dump from the presentation slides (to come)
- [ ] Stack confirmation. Suggested: Next.js + React Three Fiber + Gemini API + @solana/web3.js + Metaplex Core (Umi), deployed on Vercel
- [ ] Are we entering Gemini / ElevenLabs / Presage as well as Solana?
