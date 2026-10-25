# EduOasis

**Your notes become game worlds that dry up as you forget. Play to keep them alive, and earn MOE on Solana.**
Built for ADHD, autistic, dyslexic and other neurodivergent learners at OxHack 2026 (theme: **TIME**).

**▶ Live:** https://edu-oasis-mark2.vercel.app

## Demo
[![Watch the EduOasis Demo](https://img.youtube.com/vi/avPG4q7rlFs/0.jpg)](https://youtu.be/avPG4q7rlFs)

---

## The idea
Inspired by **Inside Out**, where Riley's memories live on islands that crumble when she stops caring about them. In EduOasis every topic becomes a **Kata** (a form you practise until it lives in your memory). A Kata stays green while you remember it and **dries up along your forgetting curve**. You keep it alive by playing it.

## Features
- **Slides → game world in ~15 s.** Upload notes, slides or PDFs. Gemini extracts every fact, then designs a world: picture-story intro slides plus action games chosen to fit the content (Showdown, Timeline Run platformer, Squad Board, Sorting Shooter, Arena, Inspect room). Code checks that every fact is taught.
- **Forgetting-curve prediction.** A half-life memory model per Kata; a demo clock (+1 day) shows Katas drying up. **Pip**, the AI companion, answers from your own notes with citations and tells you what to review next.
- **Tiger Data: data → prediction → decision.** Gameplay telemetry streams into a TimescaleDB hypertable. SQL predicts each learner's trend per Kata, and a UCB1 bandit picks the game type that teaches them best. That pick is fed into the next world Gemini generates and shown live in Pip → Data.
- **Solana learn-to-earn.** **MOE** is a real SPL Token-2022 mint on devnet. Finish a Kata and earn MOE by score (60% pass mark, 10 paid plays per Kata). Every browser has its own wallet, and **wallet-to-wallet MOE transfers are real on-chain** (with Solana Explorer links). The in-game balance syncs with the chain.
- **World Market.** Buy other students' worlds with MOE (SHA-256 fingerprint checked on purchase, creator royalties on resale), bounty pools on hard topics, membership, a Rapid Fire cosmetics market, and a 🐫 trading preview.

### What's real vs simulated
| Real today | Simulated (same interface, on-chain next) | Preview |
|---|---|---|
| MOE token, browser wallets, starter pack, peer-to-peer transfers, balance sync, Tiger Data analytics, AI generation | World NFTs, purchases, royalties, completion badges, bounty pools | Trading tab (demo data), 3D Kata (branch `test-3d`) |

## Tech stack
- **App / game:** Next.js 15, React 19, TypeScript, Phaser 3, Tailwind CSS
- **AI:** Google Gemini (`@google/genai`): 3-pass extract → design → coverage patch
- **Data:** Tiger Data / TimescaleDB (Postgres via `pg`): hypertable + continuous aggregate
- **Blockchain:** Solana devnet, `@solana/web3.js`, `@solana/spl-token` (Token-2022)
- **3D (test branch):** three.js, React Three Fiber, drei
- **Hosting:** Vercel

## How it works
```
slides/notes ──► /api/generate (Gemini: facts K1…Kn → game design → coverage patch) ──► WorldSpec JSON
                                         ▲ Tiger Data bandit pick
play (Phaser scenes) ──► telemetry ──► /api/telemetry ──► learning_events hypertable ──► game_daily aggregate
                                                                     │
                                         /api/insights ◄─────────────┘  (regr_slope trend, UCB1 game type)
finish Kata ──► MOE reward ──► wallet ──► /api/solana/transfer (server builds tx, browser signs, server submits)
```

## Run it locally
```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

`.env.local` (never commit it):
| Variable | What it's for |
|---|---|
| `GEMINI_API_KEY` | World generation and Pip |
| `TREASURY_SECRET_KEY` | Devnet treasury keypair (JSON byte array) that funds starter packs; MOE mint authority |
| `TIGER_DATABASE_URL` | Tiger Cloud (TimescaleDB) connection string; the schema is created on first use |

Without the treasury or Tiger variables, those features show a "not connected" message instead of crashing.

## Project layout
```
src/app/            page + API routes (generate, pip, telemetry, insights, solana/moe, solana/transfer)
src/components/     React panels: WorldFlow, Pip, World Market, Bounties, Rapid Fire Market, rewards card
src/game/           Phaser scenes: hub (Katas), showdown, runner, board, shooter, arena, lab, Bobo experiment
src/lib/            recall model, rewards, bounties, Tiger Data, Solana (devnet + demo wallet), telemetry
src/content/        hand-made worlds (Bobo doll experiment) and market catalog
docs/               pitch + demo script, game-type library, reward and trading design notes
```

## Team
**Team Oasis**, OxHack 2026, Oxford.

> Devnet only: MOE has no real-world value.
