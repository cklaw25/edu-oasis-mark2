# EduOasis: TL;DR

_Last updated Sat 24 Oct 2026, evening (OxHack day 1). Deadline: Devpost, Sun 25 Oct 12:00._

## The idea in one line
Upload your notes and they become a **game world on your own island**; like memories in Inside Out, **islands dry up as you forget**, so you come back and play to keep them alive. Built for neurodivergent / ADHD learners.

## Why it fits OxHack
| Track | Our angle |
|---|---|
| **TIME** (main theme) | Islands dry up in real time as the forgetting-curve model predicts recall falling; Pip says what to review and when |
| **Solana** | World NFTs with a SHA-256 fingerprint of the world file, World Market in **MOE** (real Token-2022 token on devnet), creator royalties on resale, membership pass, completion badges |
| **HRT (data → prediction → decisions)** | Recall prediction per island, weak-spot detection (wrong or hesitated answers), next-island recommendation |
| **Gemini** | Reads PDFs/notes/images, extracts every fact, designs the world, powers Pip |

## What works today (branch `merge1`)
- **Hub:** home island, 3 world islands, World Market. Island colour follows predicted recall.
- **AI world generation** in 3 passes: extract every fact (K1…Kn) → design the world citing facts → code checks coverage and patches gaps. Loftus & Palmer 29/29, Inventors 32/32.
- **Games, picked to fit the content:** Showdown (who ↔ what, survival shooter), Squad Board (drag & drop into groups), Timeline Run (platformer, order), Sorting Shooter, Sorting Arena, Inspect Room (evaluation), plus the hand-made **Bobo doll** experiment.
- **Picture slides:** every intro card has an animated emoji scene.
- **Pip:** AI companion grounded in your notes (cites sources), study notes, personal notes, learning-data dashboard, "+1 day" time travel for the demo.
- **Economy (merged with Corey's work):**
  - Start with **3 empty islands, 30 MOE, 2 free generations**; after that a new world costs **10 MOE**.
  - **Shop** by subject: Bobo, Loftus & Palmer, Milgram, Inventors, WW1, Photosynthesis at **30 MOE** each (so you can buy one to try).
  - **Player listings** (resales, 10% royalty to the creator), **My worlds** (mint & list your own, sell copies, resell bought ones), **Membership** (90 MOE), **Wallet & history** with the **live MOE token** read from devnet.
  - Every purchase re-checks the world file against its fingerprint.
  - **My worlds library:** own any number of worlds, choose which 3 sit on the islands.

## What's simulated (say so honestly)
MOE balances, purchases, NFTs and badges run in the browser behind the same function interface as the real Solana calls. The **MOE token itself is real** on devnet (mint `4BDLBADE7SE8wGc7d3X7BJL9TsNo5SQJ27GKHEbbCxGk`, supply 1,000,000).

## Potential (next, not built)
- Real on-chain MOE transfers, world NFTs and badges (treasury key from an env var, never committed)
- **Learn-to-earn** MOE rewards for finishing/reviewing worlds (Corey's design, held back for now)
- Game-type picker that learns per learner (multi-armed bandit)
- Pip voice, focus sensing, 3D worlds, creator pool split by measured learning

## Stack
Next.js 15 · React 19 · Phaser 3 · Tailwind 4 · Gemini (`@google/genai`) · `@solana/web3.js` + `@solana/spl-token` (Token-2022). All art drawn in code + emoji; data in `localStorage` for now.

## Run it
```bash
git clone https://github.com/cklaw25/edu-oasis-mark2 && cd edu-oasis-mark2
git checkout merge1
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (never commit it)
npm run dev                   # http://localhost:3000
```
WASD/arrows move · **E** interacts · **✦ Pip** bottom right · "reset demo" in the top-left card starts fresh.

## Branches
- `main`: everything up to the stuck-key fix (no MOE yet)
- `merge1`: main + Corey's MOE token and market, combined (this TL;DR)
- Corey's newer branches not merged yet: `corey/trading-system` / `cosmetics` (right-click island cosmetics), `corey/trading-theory` (trading doc), `corey/from-cklaw25-main` (neobrutalist hub design)

## Scripts
Pitch (2:00), demo video (≈2:30) and judge-table answers: [`docs/PITCH_AND_DEMO_SCRIPT.md`](PITCH_AND_DEMO_SCRIPT.md).
