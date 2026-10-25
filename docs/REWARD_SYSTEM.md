# EduOasis Reward System

**Author:** Corey · **Status:** score bands and play cap built; difficulty is theory (every island counts as Medium for now)

How much MOE DONE a player earns for finishing a game on an island. Code: `src/lib/rewards.ts`.

---

## 1. The rules (built)

| Score | MOE paid |
|---|---|
| Below 55% | **0**: the pass mark isn't reached |
| 55% | **The lowest reward**: 20% of the island's maximum |
| 55–100% | Scales evenly between the lowest and the maximum |
| 100% | **The island's maximum**, set by its difficulty |

Formula: `reward = min + (max − min) × (score − 55%) / 45%`, where `min = 20% of max`, rounded to the nearest 0.01 MOE. (All MOE amounts were cut 1,000× so a player starts with 30 MOE.)

- **10 earning plays per island.** Each island pays MOE for its first 10 *paying* games. After that the island can still be played for practice, and recall still improves, but it pays nothing. A failed game (under 55%) pays nothing and **does not** use up one of the 10.
- The island prompt shows how many earning plays are left, e.g. `E — enter Bobo Doll Experiment · 7/10 MOE plays left`.
- Paying games are logged in the wallet history as `reward`, next to the completion badge each game mints.
- Membership (the World Market's 90 MOE pass) unlocks every market world; it doesn't change game rewards.

### Example: a Medium island (max 2 MOE)

| Score | MOE |
|---|---|
| 50% | 0 |
| 55% | 0.4 |
| 70% | 0.93 |
| 85% | 1.47 |
| 100% | 2 |

Most a player can earn from one Medium island: 10 × 2 = **20 MOE**.

---

## 2. Difficulty (theory, not built yet)

Harder islands should pay more, so the maximum depends on difficulty:

| Difficulty | Max per game (100%) | Min per game (55%) | Max from one island (10 plays) |
|---|---|---|---|
| Easy | 1 | 0.2 | 10 |
| **Medium** (default) | 2 | 0.4 | 20 |
| Hard | 3.5 | 0.7 | 35 |
| Expert | 5 | 1 | 50 |

`WorldSummary.difficulty` is already in the types; when it's unset the island counts as Medium. The rest of the system works unchanged once worlds get a difficulty.

### How an island's difficulty could be decided

1. **Set by the creator** when they make or list a world, with a suggested level from the generator.
2. **Measured from play data**: the average first-attempt score across all players. For example, under 60% → Expert, 60–70% → Hard, 70–85% → Medium, over 85% → Easy. This makes the level honest, because it's based on how hard the island really was.
3. **From the game itself**: how many questions, the time limits, how many concepts it covers, and the type of game (a boss quiz is harder than explore-and-collect).

A good approach: start from the creator's level (1), then let real play data (2) move it once enough players have tried it.

### Why the 10-play cap

- Stops farming: you can't replay an easy island forever for MOE.
- Pushes players onto new topics and harder islands once they've mastered one.
- Puts a known ceiling on the total MOE supply that each island can create.

### Open questions

- Should the cap reset (e.g. monthly, or once recall has dropped below 50%) so players are paid again for *reviewing* an island they've forgotten?
- Should the first ever 100% on an island pay a one-off bonus?
- Should members get more than 10 earning plays per island?
