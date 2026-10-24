# EduOasis Game Type Library

How EduOasis decides **which game to build for which content**. The generator reads this as rules (`src/lib/gameTypes.ts`), and the learner data later tunes it per player (the game-type picker that learns: a multi-armed bandit).

## Research basis (Oct 2026)
- **What players spend time in (Roblox):** roleplay and fighting/anime-combat make up more than half of the most-visited experiences. Brookhaven RP has 78B+ visits and Blox Fruits around 60B. Simulators are big (Grow a Garden was the fastest to 1B visits). 2026's "brainrot" trend blends familiar mechanics like **tower defense** (Plants vs Brainrots). Escape games are growing. Sources: [exitlag](https://www.exitlag.com/blog/roblox-game-genres-and-popularity/), [creation.dev](https://www.creation.dev/learn/trending-roblox-game-genres-2026), [statista](https://www.statista.com/statistics/1220905/roblox-most-visited-games).
- **ADHD / learning:** game-based interventions are increasingly recognised as effective for capturing attention, and there's an FDA-approved game therapeutic (EndeavorRx). But studies **don't separate results by genre**, so there's no evidence that one genre is best for everyone ([meta-analysis, 2025](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12743074/), [mapping study](https://actaludologica.com/games-and-adhd-add-a-systematic-mapping-study/)). A small study found a **platformer** raised concentration in children with ADHD ([UGM review](https://journal.ugm.ac.id/v3/JNTETI/article/view/2001)).
- **Our takeaway:** (1) match the game's *mechanic* to the *shape of the knowledge*; (2) keep text tiny and visuals big; (3) give constant action and feedback (ADHD-friendly); (4) **measure** which type works for each learner and adapt, since the research says it varies.

## Design rules for every game
0. **Pictures, not word lists.** Playtest feedback (24 Oct): even with shooting and jumping, A/B label games still feel like "word sorting". The best games move *characters and objects*: drag the person into their department, fight the inventor who throws their invention.
1. **The mechanic IS the learning.** The action you perform should mirror the idea: sorting = categorising, ordering jumps = sequencing, shooting false claims = rejecting misconceptions.
2. **Max 4–5 words per label**, always with an emoji/icon. Explanations appear only *after* an action (feedback), never as a wall before it.
3. **Every 10–20 seconds something changes** (a mode flip, a new wave, a checkpoint).
4. **Failing is cheap**: respawn at a checkpoint, the wrong item comes back later, no long game-over screens.
5. **Cartoon, not gory.** Combat uses stylised effects (bursts, stars, smoke). Fine for history battles, never graphic.
6. **A visual theme follows the topic** (war, lab, nature, space, ancient, ocean, city): background, colours, enemy/vehicle sprites.

## Game types

| Id | Name | Inspired by | Mechanic | Best for (knowledge shape) | Data it needs | Status |
|---|---|---|---|---|---|---|
| `runner` | **Timeline Run** | Roblox obbies, Mario | Side-scrolling platformer. At each checkpoint, jump onto the platform with the **next step**; wrong platforms crumble and you fall | **Sequences**: chronology, causes leading to events, processes/cycles, experimental procedures, algorithms | `sequence.steps[]` (ordered) | ✅ built |
| `shooter` | **Hold the Line** | Arcade shooters, Roblox combat | Targets carrying labels advance; **shoot** the ones in category A, let B pass; friendly fire or a miss costs a heart | **Fast classification under pressure**: causes vs effects, true vs false, supports vs contradicts. Great skin for war/conflict | `arena` (A/B items) | ✅ built |
| `arena` | **Sort Storm** | Party/arcade sorting | Calm top-down sorting; the wanted category flips every 10s; SPACE to sort | Two-category sorting at a gentler pace (lower intensity option) | `arena` | ✅ built |
| `inspect` | **Inspect Room** | Escape rooms, detective games | Explore a themed room, inspect objects, judge each claim, dodge Prof. Skeptic | **Evaluation**: strengths/limitations, validity, judging sources, critical thinking | `inspect.clues[]` | ✅ built |
| `showdown` | **Showdown** | Roblox combat/survival, arena shooters | Top-down survival. Fighters (people, groups, conditions) attack with their **signature thing** (Tesla throws ⚡ "AC motor", Oppenheimer throws 💣). A WANTED poster names a thing: dodge, then take down whoever owns it. Wrong hit = the fighter reveals who they are | **Pairs**: person ↔ invention/discovery, study ↔ finding, condition ↔ result, term ↔ example | `showdown.fighters[]` (name, avatar, weapon) | ✅ built |
| `board` | **Squad Board** | Drag-and-drop puzzle games, team builders | Characters ride a conveyor belt; **drag** each onto the zone (team, department, place, experiment) it belongs to before it rolls away. Combos for streaks | **Membership in 3+ groups**: people ↔ departments (Manhattan Project), organelles ↔ cell parts, facts ↔ experiment 1/2 | `board.zones[]`, `board.pieces[]` | ✅ built |
| `experiment` | **Be the Experiment** | Roleplay (Brookhaven) | You *act out* the study's conditions | Specific studies/experiments with conditions (hand-made per study for now) | hand-authored | ✅ Bobo only |
| `dodge` | **Survive the Storm** | Roblox "Natural Disaster Survival", bullet hell | Dodge falling misconceptions, catch true facts | Misconceptions, common exam traps | true/false facts | 🔜 planned |
| `defense` | **Defend the Idea** | Tower defense (Plants vs Brainrots) | Place "concept towers" that only stop matching enemies | Matching definitions ↔ examples, multi-category | multi-category items | 🔜 planned |
| `boss` | **Boss Battle** | Anime combat (Blox Fruits) | Dodge attacks, answer to land hits; the boss gets harder | End-of-world mastery check, recall under mild pressure | Q&A | 🔜 planned |
| `sim` | **Grow Your Oasis** | Simulators (Grow a Garden) | Long-term: the hub itself; learning grows and waters islands | Spaced repetition, progression levels | recall data | ✅ hub (+ progression levels later) |

## Content → game decision rules (what the generator follows)
0. Content with **who/what ↔ what they did, made or scored** → **`showdown`** (the most fun; use it whenever pairs exist). Things that belong to **3+ groups** → **`board`**. Prefer these visual games over word sorting.
1. Content with an **order** (dates, steps, stages, procedures, cycles) → **`runner`**.
2. Content with **two opposing categories** → **`shooter`** if the topic is conflict/war/competition, or the learner wants action; otherwise **`arena`**.
3. Content with **evaluation** (strengths/weaknesses, reliability, interpretations) → **`inspect`**.
4. Pick **2–3 games per world**, ordered from *learn* (board/runner) to *test* (showdown/shooter) to *judge* (inspect).
7. **Slides get pictures:** every intro slide has a `scene` (2–4 emoji actors, style flow / versus / crash / group) drawn on the world's theme.
5. Theme: war/conflict history → `war`; experiments/psychology/chemistry → `lab`; biology/ecology → `nature`; physics/astronomy → `space`; ancient history/classics → `ancient`; geography/marine → `ocean`; everything else → `city`.
6. **Personalisation (next):** the Data tab's accuracy per game type feeds a bandit that adjusts these defaults per learner.
