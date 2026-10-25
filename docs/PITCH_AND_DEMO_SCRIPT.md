# EduOasis: pitch script + demo video script

OxHack 2026 · main theme **TIME** · tracks: Solana, HRT (data for prediction & decisions), Gemini.
Team: **Team Oasis** (placeholder, may change). Written in Memphis's voice.
Live: **https://edu-oasis-mark2.vercel.app** (public link; the long `…-cklaw25s-projects.vercel.app` links are login-only).

Each topic island is called a **Kata**: in martial arts, a kata is a form you practise until it lives in your memory.

The scripts keep three things apart so judges don't mix them up:
- **Core idea**: one sentence they should remember.
- **What we built**: only things that work in the demo today.
- **Potential**: where it goes next, clearly labelled as next.

---

## Part 0: Demo checklist (what to have ready before recording)

**Kit**
- [ ] Laptop on the live site, browser zoom 100%, window at least 1280×720, notifications off
- [ ] Screen recorder: Win+Alt+R (Xbox Game Bar) or OBS; mic checked
- [ ] A short notes PDF for the generation shot (e.g. Inventors, 2–4 pages)
- [ ] A **backup world already generated** in a second browser profile, in case Gemini is slow
- [ ] Corey on his laptop with the same live link, for the transfer shot (or a second browser profile as wallet B)
- [ ] This script open on a phone or second screen
- [ ] Footage to the video-editing friend by **~11:00**; Devpost submit by **11:45**

**Before you press record**
- [ ] Click **reset demo** (top-left card): 3 empty Katas, 30,000 MOE
- [ ] Wallet A has claimed the starter MOE once (first claim takes ~10 s; do it off-camera)

**Core features to show (in this order)**
1. [ ] Hub: Home Kata, 3 empty Katas, World Market, Rapid Fire Market, MOE balance
2. [ ] Generate a world from notes on an empty Kata (cut the wait)
3. [ ] Play: intro slides → one action game (Showdown / Timeline Run / Squad Board)
4. [ ] End card: **celebration + MOE earned** (learn-to-earn) → Back to the Katas
5. [ ] TIME: Pip → Data → **⏩ +1 day** → Katas dry up; Pip says what to review
6. [ ] Pip chat answers from your own notes with a source citation
7. [ ] World Market: buy a world with MOE → "fingerprint verified"
8. [ ] **Real devnet transfer**: send 500 MOE to Corey → his balance updates → Solana Explorer page
9. [ ] Quick flashes (optional): Bounties tab, Rapid Fire Market cosmetics, 🐫 Trading preview

---

## Part 1: Pitch script (2:00)

### Opening (0:00 – 0:20)
> "Hi, I'm Memphis from Team Oasis, and we built **EduOasis**: you upload your notes, and they become a **game world on your own Kata**, an island you practise on. And like real memories, **your Katas dry up over time when you forget**, so you come back and play to keep them alive. We built it for neurodivergent learners like us: students with ADHD, autism or dyslexia, so the study tool adapts to our brains instead of our brains adapting to the tool."

### Who & Problem (0:20 – 0:40)
> "Most of our team is neurodivergent. Textbooks and slides are walls of text, and videos don't answer you when you're confused. So we either zone out, or we cram and forget it all a week later. The problem isn't just *learning*, it's **time**: nobody tells you *what* you're forgetting or *when* to review it. And the people who struggle most with traditional systems get punished for it instead of supported."

### Concept & Inspiration (0:40 – 1:00)
> "We were inspired by **Inside Out**: Riley's memories live on islands, and when she stops caring about them they crumble. EduOasis is that, for studying. Every topic is a Kata. Green means you remember it; as our forgetting-curve model predicts your memory fading, the Kata dries up. And inside each Kata, you don't *read* your notes, you *play* them. Learning who invented what? You dodge Tesla's lightning in a survival shooter. Learning a study? You run the experiment yourself. **This isn't a quiz with a skin on it. The game type is chosen to fit the content.**"

### How It Works & User Journey (1:00 – 1:40)
> "Here's how simple it is:
> **One**: walk to an empty Kata and upload your notes or slides.
> **Two**: Gemini reads every page, pulls out every fact, and builds a world: picture slides, then the games that fit.
> **Three**: play it. You earn MOE for what you actually learned, and your Kata turns green again.
>
> Three things make it work:
> - **Nothing gets lost:** every fact is numbered and code checks that a game teaches it.
> - **It predicts your forgetting:** a half-life memory model tells you which Kata is drying up and when to review. That's our TIME theme and our data track.
> - **It runs on Solana:** MOE is our token, live on Solana devnet, and it really moves between wallets: I can send MOE from my laptop to my teammate's and you can see it on Solana Explorer. You earn MOE by learning, spend it on other students' worlds in the World Market, and put it into bounties on hard topics.
>
> Pip, your AI companion, sits on top of all of it: ask it anything, it answers from your own notes."

### Impact & Closing (1:40 – 2:00)
> "We built this because we needed it ourselves. Today it turns one set of notes into a playable world in under a minute. **Next**, we want world purchases and badges fully on-chain, real player-to-player trading, and a game picker that learns which game type works best for *your* brain.
> Learning shouldn't be a wall of text you forget in a week. It should be a world you keep alive. That's EduOasis."

---

## Part 2: Demo video script (≈2:40)

Record on the live site. Start from **reset demo**. Cut any waiting (generation, devnet confirmations) in editing.

| Time | On screen | Voiceover |
|---|---|---|
| 0:00 – 0:12 | Hub: Home Kata, 3 empty Katas, World Market, MOE top right | "This is EduOasis. Each Kata is a topic I'm learning. Right now I have three empty Katas and 30,000 MOE." |
| 0:12 – 0:32 | Walk to an empty Kata, press E. Topic + notes PDF → Generate. Cut to the finished Kata. | "I upload my notes. Gemini reads every page, numbers every fact, and designs a world around them." |
| 0:32 – 0:45 | Enter. Click through 2 intro slides. | "It starts with a short story, a picture per slide, never a wall of text." |
| 0:45 – 1:10 | One action game (Showdown: dodge, hit the right inventor; show one wrong hit). | "Then the games. Hit the wrong one and it tells you who they really are. The game type comes from the content." |
| 1:10 – 1:22 | End card: celebration + "+X MOE" → Back to the Katas. | "Finish a world and you earn MOE, scaled by how much you actually got right." |
| 1:22 – 1:40 | Hub: Kata is green. Pip → Data → ⏩ +1 day: Katas dry. | "Every answer feeds a forgetting-curve model. Skip a day and the Kata dries up. Pip tells me what to review and when." |
| 1:40 – 1:52 | Pip chat: "Quiz me on what I'm weakest at." Answer with citation. | "Pip answers from my own notes and shows where each fact came from." |
| 1:52 – 2:05 | World Market → Shop → buy a world → "fingerprint verified". | "I can spend MOE on other students' worlds. Each world carries a fingerprint of its file, so I know it hasn't been tampered with." |
| 2:05 – 2:30 | Wallet & history: send 500 MOE to Corey → his screen: refresh → +500 → Solana Explorer. | "And MOE is real on Solana devnet. I send 500 to my teammate's laptop… and there it is, on the public chain." |
| 2:30 – 2:40 | Quick flashes: Bounties, Rapid Fire Market, then title card. | "Bounties for hard topics, cosmetics to make your Katas yours. Your notes, turned into worlds you keep alive. EduOasis." |

**Honest labels for the video:** MOE transfers between wallets are **real** on devnet (show Explorer). World purchases, NFTs, badges and bounties are **simulated** with the same interface; the 🐫 Trading tab is a **preview** with demo data. Don't claim those are on-chain.

---

## Part 3: Judge table (4–5 min, live)

Order: **30-second pitch** (Opening + Concept), then **live demo**: hub → one Kata → end card with MOE → Pip Data "+1 day" → send MOE + Explorer, then **questions**.

Short answers to likely questions:
- **"Isn't this just a quiz?"** No. The design pass picks a game type from the content's shape: pairs → Showdown, groups → Squad Board, order → Timeline Run, evaluation → Inspect room.
- **"How do you know the AI didn't skip things?"** Pass 1 numbers every fact (K1…Kn); every game element cites the facts it teaches; code checks coverage and a patch pass fills the gaps. Pip → Notes shows it.
- **"What's the prediction?"** A half-life forgetting curve per Kata (simplified Duolingo half-life regression): recall = 2^(−time since review ÷ half-life), with the half-life updated by session accuracy.
- **"How does learn-to-earn work, can't people farm it?"** Below 60% you earn nothing; from 60% to 100% the reward scales up to the Kata's maximum; each Kata pays for its first 10 completions only.
- **"Why Solana?"** Ownership + integrity + cheap transfers: a world NFT stores the creator and the file's SHA-256, resale royalties are enforced by the chain, and fees are a fraction of a penny, so small payments between students work.
- **"What's real on-chain today?"** The MOE token (Token-2022 on devnet) and wallet-to-wallet MOE transfers: each browser has its own wallet key, signs its own transaction, and the in-game balance follows the chain. Purchases, NFTs, badges and bounties are simulated with the same interface.
- **"Running cost?"** A generation is roughly a penny on paid Gemini tiers; all art is drawn in code (no AI images); hosting is on Vercel's free tier.

---

## What's built vs potential (keep these apart when speaking)

**Built and in the demo**
- Kata hub with 3 Katas + World Market + Rapid Fire Market; Katas dry up with predicted recall; map zoom
- AI world generation from PDFs / notes / images (Gemini, 3 passes, coverage check)
- Game types: Showdown, Squad Board, Timeline Run, Sorting Shooter, Sorting Arena, Inspect Room, plus the hand-made Bobo doll experiment
- Learn-to-earn: score-based MOE on finishing a Kata, with a celebration card
- Pip: chat grounded in your notes, study notes, my notes, learning data + "time travel" demo
- World Market in MOE: shop by subject, player resale listings with creator royalty, list/sell your own worlds, membership, bounties, wallet & history; SHA-256 fingerprint check on every purchase
- **Real MOE transfers on Solana devnet** between browser wallets (starter claim from the treasury, send, Explorer links)
- Rapid Fire Market cosmetics (avatar, Pip looks, Kata trees/flags, themes, fonts)
- My worlds library: own any number of worlds, choose which 3 sit on the Katas; 2 free generations, then 10,000 MOE each

**Preview / simulated (say so)**
- 🐫 Trading tab: UI with demo offers, no trades yet
- Bounties, world purchases, NFTs and badges: simulated, same interface as the real calls

**Potential (next, not built)**
- World NFTs, purchases and badges fully on-chain; escrowed player-to-player trading
- A game-type picker that learns per learner (multi-armed bandit)
- Pip with a voice (dyslexia / ADHD friendly), focus sensing, 3D worlds
- Membership fees split between creators by measured learning gains
