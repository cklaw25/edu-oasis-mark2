# EduOasis: pitch script + demo video script

OxHack 2026 · main theme **TIME** · tracks: Solana, HRT (data for prediction & decisions), Tiger Data, Gemini.
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
5b. [ ] **🐯 Live from Tiger Data** panel (top of Pip → Data): the decision, game-type bars, your trend per Kata (play 2–3 Katas on the live site first so it has data)
6. [ ] Pip chat answers from your own notes with a source citation
7. [ ] World Market: buy a world with MOE → "fingerprint verified"
8. [ ] **Real devnet transfer**: send 500 MOE to Corey → his balance updates → Solana Explorer page
9. [ ] Quick flashes (optional): Bounties tab, Rapid Fire Market cosmetics, 🐫 Trading preview

---

## Part 1: Pitch script (2:00)

### Opening (0:00 – 0:20)
> "Hi, I'm Memphis, and with Team Oasis we built **EduOasis**: an AI-powered learning game that turns your lecture slides into playable worlds. Every topic becomes a **Kata**, an island you practise on until it lives in your memory. We built it for neurodivergent learners like us, students with ADHD, autism or dyslexia, so the study tool adapts to our brains instead of our brains adapting to the tool."

### Who & Problem (0:20 – 0:40)
> "Most of our team is neurodivergent. Walls of text and videos that can't answer your confusion make it hard to keep going. We wanted to learn like Neo in *The Matrix*, with a mentor who answers instantly, or like Tony Stark in *Iron Man 3*, solving a mystery inside an interactive world. And there's a second problem: **time**. We cram, then forget it all a week later, and nobody tells us *what* we're forgetting or *when* to review it. Students who struggle with traditional systems get punished for it instead of supported."

### Concept & Inspiration (0:40 – 1:00)
> "We were inspired by Bruno Simon, who turned his portfolio into a game you drive around, and by **Inside Out**, where Riley's memories live on islands that crumble when she stops caring about them. So in EduOasis, your Katas stay green while you remember them and **dry up as you forget**. Inside, you don't read your notes, you *play* them. Learning who invented what? You dodge Tesla's lightning in a showdown. Learning dates in order? You run and jump through a timeline, like Mario. **The game type is chosen to fit the content. This isn't a quiz with a skin on it.**"

### How It Works & User Journey (1:00 – 1:40)
> "Here's how simple it is:
> **One**, walk up to an empty Kata and upload your slides.
> **Two**, Gemini reads every page, numbers every fact and builds a world in about 15 seconds. Code checks that every fact gets taught.
> **Three**, play it. You earn MOE for what you actually learned, and your Kata turns green again.
>
> Three things make it work:
> - **It predicts your forgetting.** A memory model shows which Kata is drying up and when to review it. Pip, your AI companion, answers any question from your own notes.
> - **It learns how *you* learn.** Every answer streams into **Tiger Data**. SQL predicts where your scores are heading, and a bandit algorithm picks the game type that teaches you best, then tells Gemini to use it in your next world.
> - **It runs on Solana.** MOE is our token on Solana devnet. It really moves wallet to wallet, and you can see it on Solana Explorer. Spend it on other students' worlds in the World Market, or put it into bounties on hard topics.
>
> The wow factor? **No two students get the same game, because no two brains learn the same way.**"

### Impact & Closing (1:40 – 2:00)
> "We built this because we needed it ourselves. Today, one set of slides becomes a playable world in seconds. **Next**, we're taking it into full 3D, with our first 3D Kata already in testing, and adding Pip with a voice for dyslexic learners. We're rebuilding studying for the 20% of students who never fit the mould.
> Learning shouldn't be a wall of text you forget in a week. It should be a world you keep alive. **If they won't change the game, we will.** That's EduOasis."

**Careful with judges:** today's games are 2D. Only say "first 3D Kata in testing" if the `test-3d` branch works. Not built (don't claim): web-scraper agent, focus-sensing rooms, returning you to a 3D location.

---

## Part 2: Demo video script (≈2:50)

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
| 1:52 – 2:05 | Pip → Data → the **🐯 Live from Tiger Data** panel: decision box, game-type bars, trend per Kata. | "Every answer streams into Tiger Data. SQL predicts where my score is heading, and a bandit picks the game type that teaches *me* best. That choice goes straight into my next generated world." |
| 2:05 – 2:15 | World Market → Shop → buy a world → "fingerprint verified". | "I can spend MOE on other students' worlds. Each world carries a fingerprint of its file, so I know it hasn't been tampered with." |
| 2:15 – 2:40 | Wallet & history: send 500 MOE to Corey → his screen: refresh → +500 → Solana Explorer. | "And MOE is real on Solana devnet. I send 500 to my teammate's laptop… and there it is, on the public chain." |
| 2:40 – 2:50 | Quick flashes: Bounties, Rapid Fire Market, then title card. | "Bounties for hard topics, cosmetics to make your Katas yours. Your notes, turned into worlds you keep alive. EduOasis." |

**Honest labels for the video:** MOE transfers between wallets are **real** on devnet (show Explorer). World purchases, NFTs, badges and bounties are **simulated** with the same interface; the 🐫 Trading tab is a **preview** with demo data. Don't claim those are on-chain.

---

## Part 2b: Tiger Data, explained (data processing → prediction → decision, ~45 s)

> "Every time you play a Kata, we learn something about *how* you learn: which answers you got right, how long you took, which game type you were playing. All of that streams into **Tiger Data**, a time-series database built on TimescaleDB, because learning *is* a time series: what you know changes every day.
>
> **One, data processing.** Every event lands in a hypertable partitioned by time, and a continuous aggregate rolls every game result up per day, automatically, as students play. The numbers are always fresh, with no batch jobs.
>
> **Two, prediction.** Inside the database, SQL fits a trend line through your scores on each Kata: 'you scored 70% last time, but you're dropping about 4% a day; if you played now you'd get about 62%.' We also track your answer speed per day, because slowing down can be a sign of tiredness or losing focus.
>
> **Three, decision making.** A **multi-armed bandit** compares how well each game type, the shooter, the platformer, the drag-and-drop board, actually teaches *you*, while still giving untried types a fair chance. When you make your next world, that decision goes straight into Gemini: 'this learner learns best from showdowns, use one.' And Pip tells you which Kata to review first.
>
> So the platform gets better the more students use it. For neurodivergent learners that matters, because there's no single right way to learn. **The data finds *your* way, instead of making you fit ours.**"

**Under the hood:** `learning_events` hypertable · `game_daily` continuous aggregate (refreshes every 15 min, real-time) · `regr_slope` / `regr_intercept` per Kata · `time_bucket('1 day')` answer speed · UCB1 over game types · the pick is sent with every generation request.

**Next (say as next):** teacher/parent alerts when a trend falls; clustering learners by which game types work for them; paying creators in MOE by the measured learning gains of their worlds.

---

## Part 3: Judge table (4–5 min, live)

Order: **30-second pitch** (Opening + Concept), then **live demo**: hub → one Kata → end card with MOE → Pip Data "+1 day" + 🐯 Tiger panel → send MOE + Explorer, then **questions**.

Short answers to likely questions:
- **"Isn't this just a quiz?"** No. The design pass picks a game type from the content's shape: pairs → Showdown, groups → Squad Board, order → Timeline Run, evaluation → Inspect room.
- **"How do you know the AI didn't skip things?"** Pass 1 numbers every fact (K1…Kn); every game element cites the facts it teaches; code checks coverage and a patch pass fills the gaps. Pip → Notes shows it.
- **"What's the prediction?"** A half-life forgetting curve per Kata (simplified Duolingo half-life regression): recall = 2^(−time since review ÷ half-life), with the half-life updated by session accuracy.
- **"How does learn-to-earn work, can't people farm it?"** Below 60% you earn nothing; from 60% to 100% the reward scales up to the Kata's maximum; each Kata pays for its first 10 completions only.
- **"Why Solana?"** Ownership + integrity + cheap transfers: a world NFT stores the creator and the file's SHA-256, resale royalties are enforced by the chain, and fees are a fraction of a penny, so small payments between students work.
- **"What's real on-chain today?"** The MOE token (Token-2022 on devnet) and wallet-to-wallet MOE transfers: each browser has its own wallet key, signs its own transaction, and the in-game balance follows the chain. Purchases, NFTs, badges and bounties are simulated with the same interface.
- **"Why a time-series database and not just Postgres?"** Learning data is timestamped events. Hypertables keep time-range queries fast as data grows, and continuous aggregates keep daily roll-ups always fresh. And it's still Postgres, so it's plain SQL.
- **"Is the prediction real ML?"** Deliberately simple and explainable: a least-squares trend and a UCB1 bandit. The same tables can feed per-learner forgetting-curve models once there's more data.
- **"Privacy?"** Learners are anonymous IDs or devnet wallet addresses; we store how you played, not names or notes.
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
- **Tiger Data (TimescaleDB):** gameplay telemetry hypertable + daily continuous aggregate; SQL trend prediction per Kata; UCB1 game-type bandit shown in Pip and fed into world generation
- Rapid Fire Market cosmetics (avatar, Pip looks, Kata trees/flags, themes, fonts)
- My worlds library: own any number of worlds, choose which 3 sit on the Katas; 2 free generations, then 10,000 MOE each

**Preview / simulated (say so)**
- 🐫 Trading tab: UI with demo offers, no trades yet
- Bounties, world purchases, NFTs and badges: simulated, same interface as the real calls

**Potential (next, not built)**
- World NFTs, purchases and badges fully on-chain; escrowed player-to-player trading
- Teacher/parent alerts and learner clustering from the Tiger Data history
- Pip with a voice (dyslexia / ADHD friendly), focus sensing, 3D worlds
- Membership fees split between creators by measured learning gains
