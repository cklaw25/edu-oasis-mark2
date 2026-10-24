# EduOasis Trading System: Theory

**Author:** Corey · **Status:** design idea, not built · **Date:** 24 Oct 2026

How players could trade **island NFTs** and **MOE DONE** with each other, building on what is already in the game: fixed-price Shop worlds, player listings at any price, and learn-to-earn rewards.

---

## 1. What exists today (the starting point)

| Piece | How it works now |
|---|---|
| **MOE DONE** | Token-2022 on devnet (`4BDLBADE7SE8wGc7d3X7BJL9TsNo5SQJ27GKHEbbCxGk`). In-game balance is still a browser demo. |
| **Earning** | Each finished world session pays 200–2,000 MOE: base + accuracy + a bonus for reviewing an island you were forgetting. |
| **Shop** | EduOasis sells subject worlds at a fixed 10,000 MOE. This is the *primary market*. |
| **Player listings** | Owners list an island NFT at any price; anyone can buy it outright. This is the *secondary market*. |
| **Islands** | 1 free island + islands claimed by buying worlds (3 slots today). |

The trading system below adds ways to trade **other than** "list at a price, someone pays it".

---

## 2. Trading methods

### 2.1 Fixed-price listings (already built)
Seller sets a price; first buyer to pay gets the island. Simple and the default.

### 2.2 Offers (bids)
A buyer offers MOE for **any** island, even one that isn't listed. The offered MOE is locked in escrow, so the offer is real.
- The owner accepts → the island and MOE swap instantly.
- The owner declines, or the offer expires (e.g. 48 hours) → MOE goes back to the buyer.
- Why: lets demand show up for islands nobody has listed yet.

### 2.3 Auctions
Owner sets a **starting price** and an **end time**. Highest bid wins when time runs out.
- Each new bid must beat the last by at least 5%.
- A bid in the last 5 minutes extends the auction by 5 minutes, which stops last-second sniping.
- Why: fair price discovery for rare or popular worlds.

### 2.4 Island-for-island swaps
Two players trade islands directly, optionally with MOE added to balance it ("my Asch + 2,000 MOE for your Milgram").
- Both players must approve; the swap happens in one step so nobody can back out halfway.
- Why: students can trade topics they've finished for ones they still need to revise.

### 2.5 Rentals (stretch)
Lend an island for a fixed time (e.g. 7 days) for a MOE fee. The renter can play it; ownership never moves and the island returns automatically.
- Why: revise a topic before an exam without buying it.

---

## 3. Fees and royalties: where MOE flows

Every secondary sale (listing, offer, auction, swap with MOE) splits the price:

| Share | Goes to | Why |
|---|---|---|
| **90%** | Seller | Their sale |
| **5%** | Original **creator** of the world (royalty) | Creators keep earning when their world is resold |
| **3%** | **Learning pool** | Paid back out as learn-to-earn rewards |
| **2%** | EduOasis treasury | Runs the platform |

Example: an island sells for 10,000 MOE → seller 9,000, creator 500, learning pool 300, treasury 200.

The **learning pool** is the key loop: trading activity funds rewards for people who actually study. Speculation pays for learning.

---

## 4. Keeping it about learning (not just speculation)

Ideas to make value come from learning, not hype:

1. **Teaching score on every island.** Show each world's measured results (average recall gain, coverage of the syllabus) on its listing. Good worlds will hold value; weak ones won't.
2. **"Learned by" badge.** Islands record how many learners improved on them. A proven world is worth more.
3. **Earned MOE vs. bought MOE.** Track MOE earned from studying separately. Some perks (e.g. creator status, voting on new subjects) only count earned MOE.
4. **Holding cooldown.** A bought island can't be resold for 24 hours, which slows down flipping.
5. **Price bands for new players.** Accounts under a week old can't list above, say, 50,000 MOE, which protects younger students from being exploited.

---

## 5. How it maps to Solana

| Feature | On-chain approach |
|---|---|
| Island NFT | Metaplex Core asset; metadata stores creator, world hash, parent (for remixes) |
| Listings, offers, auctions | Escrow: the NFT (for listings) or MOE (for offers/bids) is held by a program until the trade completes or is cancelled |
| Swaps | One transaction containing both transfers, signed by both players (atomic: all or nothing) |
| Royalties | Metaplex Core Royalties plugin enforces the creator's 5% on transfer |
| Fee split | Same transaction sends MOE to seller, creator, learning pool and treasury |
| Rentals | Delegate "use" rights for a time window without transferring ownership (Core plugin) |
| Learning pool | A treasury-controlled MOE account that funds `rewardMoe()` payouts |

**Simplest real version first:** a marketplace like Tensor/Magic Eden already supports Core NFTs with listings, offers and royalties. EduOasis could use one of those for the secondary market and only build the learning-pool split and in-game UI itself.

---

## 6. Build order (if we do this)

| Phase | What | Effort |
|---|---|---|
| 1 | Offers on unlisted islands (demo, in-browser like listings) | Small |
| 2 | Fee split + learning pool (demo) | Small |
| 3 | Teaching score on listings | Small–medium |
| 4 | Island-for-island swaps (demo) | Medium |
| 5 | Auctions (demo) | Medium |
| 6 | Move MOE balances on-chain (player wallets, real `rewardMoe()`) | Medium |
| 7 | Mint islands as real Core NFTs; listings/offers via escrow or an existing marketplace | Large |
| 8 | Rentals | Large |

Phases 1–5 can be demoed in the game without any blockchain work, the same way listings are today.

---

## 7. Open questions for the team

- Should EduOasis Shop prices stay fixed, or follow demand?
- Do we allow selling your **free** island's world, or only bought ones?
- Should MOE be tradeable for SOL (a real market price), or stay in-game only? Staying in-game avoids financial and age-regulation questions; this matters because users are students.
- Who sets the creator royalty: fixed 5%, or chosen by each creator within a range?
