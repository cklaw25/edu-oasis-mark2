# EduOasis game modes: research + catalogue of 70 modes

_24 Oct 2026. Goal: give the generator a large menu of game modes so no two islands feel the same, and pick modes whose **action itself is the learning**._
Companion to [`GAME_TYPE_LIBRARY.md`](GAME_TYPE_LIBRARY.md), which describes the 6 modes built so far.

---

## 1. What the research says

### What people actually play
- **Shooters and action-adventure** top global player surveys; **puzzle** is the most played genre on mobile almost everywhere (ESA Global Video Games Report 2025; Statista Q2 2025).
- **Roblox** (our users' age group): roleplay (Brookhaven), simulators/tycoons (Adopt Me!, Grow a Garden), action/anime combat (Blox Fruits, Strongest Battlegrounds), horror (Doors) and obbies (Tower of Hell) lead.
- **Hypercasual** mobile: tap, steer, swipe/drag, .io and puzzle subgenres (GameRefinery taxonomy). Mechanics like stacking, merging, gates and idle are tags layered on top, so they are cheap to mix and remix.

### What makes a learning game work
1. **Intrinsic integration beats a quiz with a game skin.** In *Zombie Division*, children learned more when dividing the enemy *was* the maths (the enemy splits into that many ghosts) than when a quiz popped up between fights. Given free choice, they played the integrated version about **7× longer** (Habgood & Ainsworth 2011). → Every mode below says what action carries the learning.
2. **Games help retention more than learning on day one:** d = 0.29 for learning, **d = 0.36 for retention**. They work best with **multiple sessions** and alongside other instruction (Wouters et al. 2013, 77 studies). → This fits our islands, which dry up and get replayed, with Pip and notes alongside.
3. **ADHD:** game-based digital interventions are among the stronger digital approaches (2025 meta-analysis). But studies **don't compare genres** (Acta Ludologica mapping study), so no genre is proven best. → **Variety plus measuring per learner** (bandit) is the honest design, not one "ADHD genre".

### Rules we take from this
- The action *is* the knowledge: dividing = splitting, ordering = jumping in order, who-made-what = fighting the person who throws it.
- Short loops (something changes every 10–20 s), cheap failure, pictures over words, cartoon (never gory) combat.
- **Vary the mode every island** (code-enforced) and learn which modes work for each learner.
- **Avoid:** word-heavy modes as defaults, gambling mechanics (loot boxes / gacha paid with MOE: never), anything needing heavy 3D or real-time multiplayer servers for now.

---

## 2. Content shapes (what the AI detects in the notes)

| Code | Shape | Example |
|---|---|---|
| **P** | Pairs: who/what ↔ what they did, made or found | Tesla ↔ AC motor; Loftus ↔ "smashed" = 40.8 mph |
| **G** | Groups: things belong to 2+ categories | causes: militarism / alliances / imperialism |
| **O** | Order: chronology, steps, stages | WW1 timeline, Calvin cycle steps |
| **C** | Cause → effect chains, systems | assassination → mobilisation → war |
| **T** | True / false, misconceptions, exam traps | "Milgram's participants were all paid actors" ✗ |
| **E** | Evaluation: strengths, limitations, validity | ecological validity of a lab study |
| **N** | Numbers: dates, stats, values | 65% obeyed to 450 V |
| **S** | Spatial: parts of a diagram, map, places | parts of a leaf, battle locations |
| **D** | Definitions / key terms | "reconstructive memory" |
| **V** | Perspectives, debates, arguments | for/against the Treaty of Versailles |
| **R** | Narrative / procedure you can act out | running the Bobo doll experiment |

---

## 3. The catalogue (70 modes)

**Fit:** **A** = fits our 2D Phaser engine + world-file JSON and is worth building soon · **B** = possible, needs more work (new engine piece or art) · **C** = not compatible or not recommended for now (reason given).
**Engine:** which shared engine the mode runs on (section 4). One engine runs many modes, which is how we get to 50+ without writing 50 games.

### Built (7)
| # | Mode | Inspired by | The action that carries the learning | Shapes | Fit | Engine |
|---|---|---|---|---|---|---|
| 1 | **Showdown** | arena shooters, Roblox combat | Fighters throw their signature thing; take down whoever owns the WANTED item | P | ✅ | TopDown |
| 2 | **Squad Board** | drag-drop sorting puzzles | Drag characters off a conveyor into their group | G | ✅ | Board |
| 3 | **Timeline Run** | obbies, Mario | Jump onto the platform holding the next step | O | ✅ | SideScroll |
| 4 | **Hold the Line** | arcade shooters | Shoot category A, let B pass | G, T | ✅ | TopDown |
| 5 | **Sort Storm** | party sorting | Calm two-way sorting; category flips every 10 s | G | ✅ (fallback) | TopDown |
| 6 | **Inspect Room** | escape rooms | Inspect objects, judge each claim, dodge Prof. Skeptic | E | ✅ | Explore |
| 7 | **Be the Experiment** | roleplay | Act out the study's conditions as the researcher | R | ✅ (hand-made) | Explore |

### Arcade & action (top-down)
| # | Mode | Inspired by | The action that carries the learning | Shapes | Fit | Engine |
|---|---|---|---|---|---|---|
| 8 | **Survive the Storm** | Natural Disaster Survival, bullet hell | Misconceptions rain down: dodge them, catch the true facts | T | A | TopDown |
| 9 | **Grow.io** | Agar.io, Slither.io | Eat items matching the current category to grow; bigger wrong ones eat you | G | A | TopDown |
| 10 | **Fact Snake** | Snake | Eat the steps in the right order; the tail spells the process | O | A | TopDown |
| 11 | **Maze Muncher** | Pac-Man | Munch the dots of a process in order; ghosts are misconceptions | O, T | A | TopDown |
| 12 | **Split Shot** | Asteroids, Zombie Division | Shoot a big concept and it splits into its correct parts; shoot the parts that belong | S, Y | A | TopDown |
| 13 | **Boss Battle** | Blox Fruits, Cuphead | Boss phases = subtopics; parry each attack with the right counter (definition, finding) | P, D | A | TopDown |
| 14 | **Dungeon Run** | Hades, Binding of Isaac | Rooms = subtopics; pick the door with the right answer; boons = mastered facts | P, T, O | A | TopDown |
| 15 | **Zone Rush** | battle royale shrinking zone | Grab only the correct items before the storm closes in | G, T | A | TopDown |
| 16 | **Escort** | escort missions | Guide a historical figure / molecule along the right path; wrong turns spawn enemies | O, C | B | TopDown |
| 17 | **Stealth Heist** | Hitman, Monaco | Sneak past guards; crack each vault lock with a fact | N, P | B | TopDown |
| 18 | **Monster Chase** | Doors, Piggy (mild horror) | Flee the monster; only the door with the right answer opens. Keep it spooky-cute | T, O | B (age-check the tone) | Explore |
| 19 | **Fishing Trip** | Roblox fishing games, Stardew | Cast for the fish that matches the prompt; rare fish = hard facts | P, D | A | TopDown |
| 20 | **Shepherd** | herding games | Herd creatures (examples) into the right pens (categories) | G | A | TopDown |
| 21 | **Lighthouse** | light-and-shadow puzzles | Shine light on the evidence that supports a claim; shadows hide the false ones | E, T | B | TopDown |

### Side-scrolling & runners
| # | Mode | Inspired by | The action that carries the learning | Shapes | Fit | Engine |
|---|---|---|---|---|---|---|
| 22 | **Lane Runner** | Subway Surfers | Switch to the lane whose gate is correct; wrong gates trip you | T, P | A | SideScroll |
| 23 | **Gate Crowd** | hypercasual multiplier gates | Run through the right gate to grow your army (numbers grow ×2 / +10); fight the final boss with it | N, T | A | SideScroll |
| 24 | **Tower Climb** | Tower of Hell | Each floor is a question; the correct platform holds you up | O, D | A | SideScroll |
| 25 | **Switch Puzzle** | Portal-lite, Limbo | Pull levers in the right order to open the path (process / procedure) | O, Y | B | SideScroll |
| 26 | **Glider** | Flappy Bird, Jetpack Joyride | Fly through the ring labelled with the right answer; streaks speed you up | T, D | A | SideScroll |
| 27 | **Kart Rally** | Mario Kart | Drive the checkpoints in historical order; boost pads for correct picks | O | B | TopDown |

### Drag, build & place
| # | Mode | Inspired by | The action that carries the learning | Shapes | Fit | Engine |
|---|---|---|---|---|---|---|
| 28 | **Concept Defense** | Plants vs Zombies, Plants vs Brainrots | Place concept towers; each only stops enemies that are its examples | G, D | A | Board |
| 29 | **Diagram Builder** | jigsaw, Operation | Drag the parts onto the diagram (leaf, brain, battlefield) | S | A | Board |
| 30 | **Timeline Cards** | the board game *Timeline* | Insert each event card into the right gap on the timeline | O, N | A | Board |
| 31 | **Assembly Line** | Factorio-lite, Overcooked | Route items through machines in the right order to make the product (glucose, a law) | Y, O | B | Board |
| 32 | **Kitchen Rush** | Overcooked, Cooking Mama | A recipe = the process; cook the steps fast and in order | O | A | Board |
| 33 | **Bridge Builder** | Poly Bridge | Build the cause → effect chain plank by plank; a missing link and the bridge falls | C | B | Board |
| 34 | **Merge Lab** | Merge Dragons, Little Alchemy | Merge smaller ideas into bigger ones (events → causes → war; atoms → molecules) | Y, C | A | Grid |
| 35 | **Crafting Table** | Minecraft crafting | Combine ingredients into a result (reactions, policies, inventions) | P, Y | A | Board |
| 36 | **Map Drop** | GeoGuessr | Drop each event or person on the map where it happened | S | A | Map |

### Puzzle & tile
| # | Mode | Inspired by | The action that carries the learning | Shapes | Fit | Engine |
|---|---|---|---|---|---|---|
| 37 | **Match-3 Groups** | Candy Crush | Match three tiles of the same category; specials for cross-category combos | G | A | Grid |
| 38 | **Block Stack** | Tetris | Falling blocks carry items; clear a line by completing a set | G, O | B | Grid |
| 39 | **2048 Climb** | 2048 | Merge tiles up a hierarchy (cell → tissue → organ) | Y, O | A | Grid |
| 40 | **Memory Flip** | Concentration | Flip cards to pair person ↔ thing; the pairs are pictures, not words | P | A | Grid |
| 41 | **Spot the Fake** | spot the difference | Two "documents"; tap the detail that's wrong | T, E | A | Explore |
| 42 | **Lockpick** | safe-cracking minigames | Turn dials to the right numbers/dates | N | A | Grid |
| 43 | **Word Hunt** | word search / crossword | Find the key terms. **Word-heavy, so dyslexia-unfriendly: optional only** | D | C (as a default) | Grid |
| 44 | **Term Guess** | Wordle, Hangman | Guess the key term from picture clues | D | B | Grid |

### Physics & aim
| # | Mode | Inspired by | The action that carries the learning | Shapes | Fit | Engine |
|---|---|---|---|---|---|---|
| 45 | **Slingshot** | Angry Birds | Launch the right concept to topple the misconception's tower | P, T | A | Physics |
| 46 | **Brick Breaker** | Breakout | Break only the bricks of the wanted group; wrong bricks speed up the ball | G | A | Physics |
| 47 | **Slice** | Fruit Ninja | Slice the true facts, let the false ones fall | T, G | A | Physics |
| 48 | **Pinball Combo** | pinball | Hit the bumpers in process order for a combo | O | B | Physics |
| 49 | **Penalty Shootout** | football games | Aim at the corner holding the right answer; the keeper dives at traps | T | A | Physics |
| 50 | **Mini Golf** | mini golf | Pick the right "club" (method, formula) for each hole | N, P | B | Physics |

### Rhythm & timing
| # | Mode | Inspired by | The action that carries the learning | Shapes | Fit | Engine |
|---|---|---|---|---|---|---|
| 51 | **Beat Steps** | Guitar Hero, Friday Night Funkin' | Notes are the steps of a process; hit them on beat, in order (rhythm as a mnemonic) | O, D | B | Rhythm |
| 52 | **Whack-a-Term** | whack-a-mole | Whack the mole holding the term that matches the definition | D, P | A | Rhythm |
| 53 | **Microgame Mix** | WarioWare, Fall Guys | 5-second microgames back to back, each a different mode. Pure ADHD variety | all | A | Mix |

### Cards, battles & strategy
| # | Mode | Inspired by | The action that carries the learning | Shapes | Fit | Engine |
|---|---|---|---|---|---|---|
| 54 | **Card Duel** | Hearthstone, Slay the Spire | Facts are cards with stats; play the right counter to the opponent's card | P, C | A | Turns |
| 55 | **Argument Battle** | Pokémon battles | Pick your strongest argument against the rival's; the type chart = which argument beats which | V, E | A | Turns |
| 56 | **Squad Draft** | Teamfight Tactics (auto-battler) | Draft a team; synergies only fire for members of the same group | G | B | Turns |
| 57 | **Collect-a-Dex** | Pokédex collecting (no paid gacha) | Catch concept creatures; each card shows its fact; complete the set | D, G | A | Explore |
| 58 | **Tactics Grid** | Into the Breach, chess | Replay a battle on a grid: put units where they really stood | S, O | B | Map |
| 59 | **War Room Map** | Total War campaign map | Move armies across the map in the right order of events | S, O, C | B | Map |
| 60 | **Tycoon** | Roblox tycoons | Run a business or state; your decisions apply the concept (supply, demand, policy) | C, N | B | Map |
| 61 | **Ecosystem Sim** | SimCity, Spore | Tweak variables and watch the effects (predator/prey, light vs photosynthesis rate) | C, N | B | Map |
| 62 | **Lab Sandbox** | PhET simulations | Sliders run a mini-experiment; predict, then see the result | C, N | B | Physics |

### Story, roleplay & social
| # | Mode | Inspired by | The action that carries the learning | Shapes | Fit | Engine |
|---|---|---|---|---|---|---|
| 63 | **Courtroom** | Ace Attorney | Present the evidence that breaks the witness's false claim | E, T | A | Talk |
| 64 | **Impostor** | Among Us | NPC crewmates each state a fact; vote out the one who's lying | T, E | A | Talk |
| 65 | **Be the Character** | visual novels, Life is Strange | Make choices as a historical figure or participant; see the real consequences | C, V, R | A | Talk |
| 66 | **Town Roleplay** | Brookhaven | Walk a town where AI NPCs *are* the concepts; talk to them (Pip-style) to finish quests | D, R | B | Explore |
| 67 | **Escape Room** | Doors, escape rooms | A chain of locks; each opens with a fact from the notes | R, N, E | A | Explore |
| 68 | **Pet Keeper** | Tamagotchi | Keep a creature alive by feeding it correct facts; it gets hungry as recall fades (TIME) | spaced review | B | Hub |

### Not compatible right now
| # | Mode | Why not (yet) |
|---|---|---|
| 69 | **MMO / real-time multiplayer battles** | Needs game servers and moderation for young players. Revisit after the deploy with turn-based or async play |
| 70 | **Full 3D / VR worlds** | Too heavy for the hackathon and low-end school laptops. The planned 3D pass is for the hub first |
| — | **Gacha / loot boxes / paid random rewards** | Gambling mechanics paid with MOE, aimed at young learners: never |
| — | **Typing shooters** (Typing of the Dead) | Spelling under time pressure punishes dyslexic learners. Optional mode at most |
| — | **Pure quiz shows** (Kahoot, Millionaire) | The extrinsic "quiz with a skin" the research says works worst. Fallback only |
| — | **Gory combat** | Cartoon effects only, always |

Count: 70 modes listed. 7 built + 60 more in the A/B tiers = **67 usable modes** (39 A-tier, 21 B-tier); 3 are not compatible yet.

---

## 4. How 67 modes stay buildable: 10 engines, shared data

Writing 67 separate games isn't realistic. Each mode = **an engine + rules + a theme skin**, filled from the same few data blocks the AI already writes.

| Engine | Modes it runs | Status |
|---|---|---|
| **TopDown** (move, dodge, shoot, collect) | Showdown, Hold the Line, Sort Storm, Survive the Storm, Grow.io, Snake, Maze Muncher, Split Shot, Boss, Dungeon, Zone Rush, Fishing, Shepherd… | ✅ exists |
| **SideScroll** (jump, lanes, fly) | Timeline Run, Lane Runner, Gate Crowd, Tower Climb, Glider, Switch Puzzle | ✅ exists |
| **Board** (drag & drop, place) | Squad Board, Concept Defense, Diagram Builder, Timeline Cards, Kitchen Rush, Crafting, Assembly Line | ✅ exists |
| **Explore** (walk a room, inspect, talk) | Inspect Room, Bobo, Escape Room, Spot the Fake, Collect-a-Dex, Monster Chase | ✅ exists |
| **Grid** (tiles) | Match-3, Merge Lab, 2048, Memory Flip, Lockpick, Block Stack | new |
| **Physics** (aim, launch, bounce) | Slingshot, Brick Breaker, Slice, Penalty, Pinball, Golf, Lab Sandbox | new (Phaser arcade/matter physics) |
| **Turns** (cards, battles) | Card Duel, Argument Battle, Squad Draft | new |
| **Talk** (dialogue, choices, AI NPCs) | Courtroom, Impostor, Be the Character | new (reuses the Pip API) |
| **Map** (map, grid strategy, sims) | Map Drop, Tactics Grid, War Room, Tycoon, Ecosystem | new |
| **Rhythm / Mix** | Beat Steps, Whack-a-Term, Microgame Mix | new |

**Data blocks** (one per content shape): `pairs`, `groups`, `sequence`, `claims` (true/false + why), `evaluation`, `numbers`, `parts` (diagram/map positions), `causes` (a small graph), `persona` (characters to talk to). Most modes read one or two blocks, so a new mode costs one scene, not a new AI pass.

---

## 5. How the AI should choose (fixes "the same 4 modes every time")

1. **Detect shapes:** the extract pass tags each fact with its shape (P/G/O/C/T/E/N/S/D/V/R).
2. **Shortlist:** code lists every mode whose shapes are well covered (e.g. ≥ 6 pairs for Showdown).
3. **Freshness + learner fit:** score = shape fit + **unused by this learner recently** (already in `pickGames`) + this learner's measured results per mode (the bandit, later) + a little randomness.
4. **Unique game brief per topic:** instead of "use the runner", the model writes a short brief for the chosen modes: setting, characters, twist and win condition, drawn from the topic itself. Examples:
   - **Marvel (MCU):** *Infinity Heist* (Stealth Heist: grab the stones in film order) + *Card Duel* (heroes with their real powers) + *Impostor* (which "fact" about the films is fake?)
   - **Napoleonic Wars:** *War Room Map* (move the Grande Armée through the campaigns in order) + *Boss Battle* vs the Seventh Coalition + *Courtroom* (judge Napoleon's legacy)
   - **Photosynthesis:** *Assembly Line* inside a chloroplast + *Split Shot* (split glucose back to its inputs)
   - **Milgram:** *Be the Character* (you're the Teacher; the shocks escalate) + *Argument Battle* on the ethics
5. **Prompting rules** for that brief: name real characters/objects from the notes, ≤ 5 words per label, one sentence of rules, the action must *be* the fact (intrinsic integration), and never reuse the previous island's setting.

## 6. Suggested build order (after the devnet transaction)
1. Data: add `claims`, `numbers`, `parts` blocks + shape tags to the extract pass.
2. Cheap wins on existing engines (A-tier): Survive the Storm, Boss Battle, Lane Runner, Gate Crowd, Timeline Cards, Escape Room, Concept Defense, Fishing.
3. Microgame Mix (strings 5-second versions of everything: the most ADHD-friendly mode).
4. One new engine at a time: Talk (Courtroom/Impostor, reuses Pip), then Grid, then Physics.
5. The game-brief prompt (section 5) + the per-learner bandit.

---

## Sources
- [ESA Global Video Games Report 2025 (summary)](https://gamedevreports.substack.com/p/esa-global-video-games-report-2025) · [Statista: global online games genre breakdown](https://statista.com/statistics/240990/global-online-games-genre-breakdown) · [Konvoy Q2 2025 gaming report](https://www.konvoy.vc/blogs/how-many-people-play-video-games)
- [Roblox genres and popularity (ExitLag)](https://www.exitlag.com/blog/roblox-game-genres-and-popularity/) · [Best Roblox games guide (ExitLag)](https://www.exitlag.com/blog/best-roblox-games-play-popular/)
- [GameRefinery genre taxonomy](https://www.gamerefinery.com/genre-taxonomy-update-january-2020/) · [Hyper-casual mechanics (Game-Ace)](https://game-ace.com/blog/hyper-casual-game-mechanics/) · [Mechanics vs controls (CrazyLabs)](https://www.crazylabs.com/?p=16144)
- [Habgood & Ainsworth: intrinsic integration (Zombie Division)](https://shura.shu.ac.uk/3556/) · [Habgood PhD thesis](https://eprints.nottingham.ac.uk/10385)
- [Wouters et al. 2013 meta-analysis of serious games](https://research-portal.uu.nl/en/publications/a-meta-analysis-of-the-cognitive-and-motivational-effects-of-seri/)
- [Game-based digital interventions for ADHD: 2025 meta-analysis](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12743074/) · [Games and ADHD: systematic mapping study](https://actaludologica.com/games-and-adhd-add-a-systematic-mapping-study/) · [Game technology for children with ADHD: review](https://journal.ugm.ac.id/v3/JNTETI/article/view/2001)
