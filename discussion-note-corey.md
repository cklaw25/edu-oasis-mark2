# Discussion Note — Corey — MOE Token

**Date:** 2026-10-24
**Project:** Hackathon — create the **Moe Done (MOE)** token on Solana (Token-2022 with on-chain metadata)
**Status:** Script ready and tested up to the funding step. **The token is not created yet:** the treasury wallet needs devnet SOL.

---

## TL;DR for the team

1. Send **0.1 devnet SOL** to the treasury wallet:
   ```
   CNp9YiTDhKRomr9xAtPLQEK9GgpQ8riDgFDbRrTJVZUq
   ```
   The easiest way is https://faucet.solana.com: sign in with GitHub, choose **Devnet**, paste the address, set the amount to **1**, and click **Confirm Airdrop**. It needs a GitHub account with some activity. Sending from a Phantom wallet that has devnet SOL also works.
2. Run `node create-moe.js` on Corey's laptop. It creates MOE and mints **1,000,000 MOE** to the treasury.
3. Use the Solana Explorer link it prints for the demo.

---

## What happened, in order

### 1. Code review of the original script
Corey shared a Node.js script that creates a Token-2022 mint with metadata on devnet. The review found it basically correct, with these issues:
- It only created the mint and **never minted any tokens**, so the supply was 0.
- **Decimals were 0**, which makes the token indivisible.
- The airdrop asked for **2 SOL**, which devnet often refuses.
- It had dead code: a balance check that could never run, and a hand-set blockhash that gets overwritten.
- The metadata **URI was empty**, so wallets show no image.
- `treasury.json` stores the private key in plain text, so it must be git-ignored.
- It needs **web3.js v1**. v2 (`@solana/kit`) has no `Keypair` or `Transaction` classes.

Confirmed correct: the account is created at mint size with rent for mint plus metadata, since Token-2022 grows the account itself. The instruction order (metadata pointer, initialize mint, initialize metadata) and the signers are also right.

### 2. Script updated (`create-moe.js`)
- Mints an **initial supply of 1,000,000 MOE** to the treasury's token account. This is skipped if the treasury already holds MOE, so it's safe to rerun.
- **Decimals set to 9.**
- The airdrop asks for **1 SOL**.
- If the mint already exists, the script reuses it instead of exiting.
- The network is chosen with the `CLUSTER` environment variable (`devnet` by default, or `testnet`). The mint address is saved to `mint-<cluster>.txt`.
- Removed the dead code. Program logs still print if a transaction fails.
- Added `package.json`, and `.gitignore` covering `node_modules/` and `treasury.json`.

### 3. Environment setup
- Node.js wasn't installed. The first `winget` install stalled for 10 minutes on a hidden admin (UAC) prompt and was cancelled. Corey then installed **Node v24.22.1** manually.
- `npm install` succeeded. Two warnings are safe to ignore: "bigint: Failed to load bindings" (the library falls back to pure JavaScript) and 7 npm audit findings in dependencies bundled with the Solana libraries.

### 4. Funding attempts (the blocker)
| Attempt | Result |
|---|---|
| Script airdrop on devnet (first wallet `Ce8NZ…A5cX`) | 429: airdrop limit reached |
| faucet.solana.com (Corey's GitHub) | GitHub account didn't meet the faucet's activity minimum (too few repos) |
| QuickNode faucet | Needs a SOL balance on mainnet |
| Chainstack faucet | Needs at least 0.8 SOL on mainnet, with history |
| Helius faucet | Paid plans only |
| New wallet `CNp9…VZUq` with a devnet airdrop | 429: the limit is per **IP address**, not per wallet |
| Testnet airdrop | 429: also rate-limited |
| Phone hotspot | Not possible: no mobile data |

**Why being on the same Wi-Fi matters:** the automatic airdrop is limited per internet connection, and everyone at the hackathon shares one. faucet.solana.com with a GitHub sign-in is limited **per GitHub account**, and a normal wallet transfer has **no limit**. So a teammate on the same Wi-Fi can still fund the wallet those two ways.

The faucet limit is a rolling window of about 24 hours, not a reset at midnight.

### 5. Local test network (fallback, not done)
- A local validator on the laptop would mean unlimited free SOL, but the token would only exist on that machine.
- WSL is not installed. LiteSVM has no Windows build.
- The download of Anza's official Windows tools (about 200 MB) was cancelled.
- This is still an option if no one can supply devnet SOL.

---

## Current state

| Item | Value |
|---|---|
| Treasury wallet | `CNp9YiTDhKRomr9xAtPLQEK9GgpQ8riDgFDbRrTJVZUq` (0 SOL) |
| Token name / symbol | Moe Done / MOE |
| Decimals | 9 |
| Initial supply | 1,000,000 MOE |
| Program | Token-2022 + metadata pointer + on-chain metadata |
| Network | devnet (default) |
| Node | v24.22.1 |
| Packages | @solana/web3.js 1.99.0, @solana/spl-token 0.4.15, @solana/spl-token-metadata 0.1.6 |

**Do not commit `treasury.json`.** It is the wallet's private key. It's devnet-only, but keep the habit.

## Next steps
1. A teammate funds `CNp9YiTDhKRomr9xAtPLQEK9GgpQ8riDgFDbRrTJVZUq` with 0.1 or more devnet SOL.
2. Run `node create-moe.js`.
3. Save the mint address (in `mint-devnet.txt`) and the Explorer link for the demo.
4. Optional: host a metadata JSON file (name, symbol, description, image) and set `TOKEN_URI` before creating the token, so wallets show a logo.

---

## UPDATE — Sat 24 Oct, ~16:00 (from Memphis + Claude)

### ✅ Blocker solved: the treasury is funded
- Memphis funded the treasury through faucet.solana.com with his own GitHub account (that faucet limits per GitHub account, not per Wi-Fi).
- `CNp9YiTDhKRomr9xAtPLQEK9GgpQ8riDgFDbRrTJVZUq` now holds **1 devnet SOL** (finalized).
- Transaction: https://explorer.solana.com/tx/2qASRNwtbcduXrHjP6WRsF6Az3fJxgzp14ZSJZZjtcyswo4v8GZijPgL11gSUYN7h4F2SZJFLaU86ucedGaFAs2d?cluster=devnet
- That's about 10× what `create-moe.js` needs, so there's spare SOL for the buy and badge transactions later. **Don't request more airdrops on venue Wi-Fi.** If we run low, Memphis can use the faucet again, or ask the Solana sponsor or MLH coach.

### 👉 Your next steps, Corey (in order)
1. **Run `node create-moe.js` now.** Send Memphis the **mint address** (`mint-devnet.txt`) and the **Explorer link**. Claude will check the name, symbol, 9 decimals and 1,000,000 supply on-chain.
2. **Read `DISCUSSION_NOTES.md` on `main`**, especially **section 6 (Solana plan)**. It has the full product context, what's already built, and the function list the game will call.
3. **Agree with Memphis what MOE is *for*** before building more on it. Judges will ask "why a token when SOL exists?". Proposed answer:
   - Learners **earn MOE when learning is proven**: their predicted recall goes up after replaying a world. The game already computes recall per island.
   - Creators **earn MOE** when their worlds teach well (players' measured results).
   - MOE is **spent to unlock market worlds or buy membership**, with SOL as the alternative.
   - Result: MOE = "proof-of-learning currency". It ties Solana to the data/prediction story (HRT track) and the TIME theme.
4. **Build the functions the game side will call.** Work against mocks first, so we can wire up the UI before the chain is finished:
   ```
   connectWallet()                        -> pubkey               (Phantom via the wallet adapter)
   mintWorld(spec, specHash, price)       -> worldAssetId          (Metaplex Core NFT; metadata stores creator + sha256(world file) + parent)
   buyMembership() / buyAccess(assetId)   -> txSignature           (one atomic transaction: pay + mint pass)
   hasAccess(pubkey, assetId?)            -> boolean
   mintBadge(pubkey, worldId, score)      -> badgeAssetId          (non-transferable, timestamped)
   rewardMoe(pubkey, amount, reason)      -> txSignature           (if we go with the MOE plan above)
   listWorlds()                           -> [{ assetId, title, creator, price, coverage, avgRecall }]
   ```
   Suggested libraries: `@solana/web3.js` v1 (already used), `@solana/spl-token`, Metaplex Core via `@metaplex-foundation/umi` + `mpl-core`, `@solana/wallet-adapter-react` (Phantom). No custom Anchor program unless there's spare time.
5. **Where to put the code:** the main app is Next.js in `main` (`src/…`). Put the Solana code in **`src/lib/solana/`** (client helpers) and **`src/app/api/solana/…`** (server routes that hold the treasury key from an env var, **never from a committed file**). Work on a branch, e.g. `corey/solana`, and open a PR into `main`.
6. **Memphis is building the market island UI next**, with buttons for buy, membership, mint world and badges. Those buttons will call your functions.

### ⏰ Timeline reminders
- **17:30–18:30:** we ask judges for feedback in person. Have the MOE Explorer link ready if possible.
- **Tonight:** chain integration end to end: mint world → buy → unlock → badge.
- **09:00 Sun:** feature freeze. **12:00 Sun:** Devpost deadline.

### 🔒 Reminders
- `treasury.json` stays git-ignored. When the app needs the treasury, load it from `.env.local` (e.g. `TREASURY_SECRET_KEY`), which is also git-ignored.
- Devnet only. No real money anywhere.
