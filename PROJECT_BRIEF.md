# Maths Magic: project brief (prototype 0.5)

Working title. Read this first. It records what the game is, what has been decided, and how the prototype is built.

## 1. The idea
Maths is the language of magic. Every sum a child answers casts a spell, and every spell visibly changes the world. The world is the progress bar: a grey, cold room slowly fills with colour and light as practice adds up.

Why it is different: most times-table tools are a quiz with points and stars added on top. Here the reward is a lasting result in a story world, not a score.

## 2. Audience and market
- Key Stage 2 (ages 7 to 11), practising times tables. Year 4 multiplication tables check content is up to 12 x 12.
- Teaching method this serves: lots of repetitive sums to consolidate tables. The core question and answer is deliberately simple. The product is the world around it.
- Buyer: undecided (parents at home, or schools). Affects later features (teacher view, class progress), not the prototype.
- Privacy: no accounts, no data collection. Progress is stored only in the child's browser. UK Children's Code and GDPR apply if this ever changes.
- Success test: a 9-year-old plays for 10 minutes without help and asks to go back to restore the next part of the room.

## 3. The prototype: one room
Scene: a cosy treehouse bedroom (1408 x 768 image, `rooms/treehouse-bedroom/room.jpg`). It starts grey. Tone: gentle and wondrous. Guide character: Pip the fairy.

### Spells (22 restorable things)
| Type | Count | Sums each | Examples |
|---|---|---|---|
| Spark | 8 | 1 | fairy lights, lanterns, crystals, jar of flowers, globes |
| Incantation | 10 | 3 (cat: 4) | quilt, potion shelves, armchair, curtain, vines, sleeping cat |
| Ritual | 3 | 6 | fireplace, stained-glass window, the forest outside |
| Finale | 1 | 8 | The Great Tree: reveals everything left |

Total is 65 sums to finish the room. A child chooses any unlocked spell. Rituals unlock after 6 Sparks or Incantations are restored. The finale unlocks when all 21 others are restored.

### World stages (by share of spells restored)
Cold and grey (under 15%), First flicker (15%), Warming up (40%), Nearly home (65%), Alive (100%).

## 4. Maths rules
- Tables 2 to 12 can be switched on and off. Default is 2, 5 and 10. Multipliers run 1 to 12. Order of the two numbers is randomised.
- Adaptive: each fact has a miss count, stored locally. Weight = 1 + 2 x misses (capped at 7), so weak facts are asked more.
- Wrong answer: no penalty. The spell fizzles gently, the correct answer is shown, and that fact returns after at least one other question.
- Speed is a bonus only. A correct answer in under 6 seconds gets "Quick-cast!" from Pip. It has no effect on progress.
- Only a correct answer fills a gem, so a spell always needs its full number of right answers.

## 5. Experience spec (what has been built and approved)
Layout: Pip and her speech sit above the room. The room is the hero. On the right is a parchment spellbook (spell list and table chips when idle; the sum and keypad when casting). On phones it stacks under the room, and the room stays pinned at the top while casting.

Spellbook look: aged parchment, gold inner border, faint magic circle, decorative first letter on the spell name, double gold frame around the sum. Keypad: rune stones (digits), wooden plank (Clear), glowing gold seal (Cast).

Per-tap response: the tapped stone charges up (scale pop, number glows, energy ring, sparks). A glowing copy of the number flies along an arc into its place in the answer, growing to the answer size, and lands with a burst. Clear pops the last digit.

Correct answer: sparkle burst over the answer, then the answer melts into an orb of energy that flies to the next gem. The gem fills like liquid light, pops with a ring and sparks, and the energy chain between gems brightens. The next empty gem glows softly. Filled gems breathe and shimmer.

Wrong answer: the sum shakes, the correct answer appears in rose, rose wisps drift down, and Pip says it will come back.

Spell complete: all gems pulse, lift off their sockets, spiral together, merge into one comet (with a ring of tiny gems orbiting it) and fly to the point in the room being revealed. On landing there is a burst and two shockwave rings, and the colour spreads out from that point. Pip speaks and a "Spell cast!" card offers the next spell.

Reduced motion: if the device asks for it, flights and bursts are skipped and changes appear instantly.

### Timings (all in `src/game.js` and `src/styles.css`)
| What | Value |
|---|---|
| Key charge animation | 0.6 s |
| Number flight to answer | 540 ms |
| Correct: orb launches after | 250 ms |
| Orb flight to gem | 520 ms |
| Next sum appears after correct | 1100 ms |
| Last answer: gems lift off after | 1000 ms |
| Gems gather | 420 ms (+45 ms stagger each) |
| Comet flight to room | 800 ms |
| Colour reveal spread | 1700 ms (finale 2600 ms) |
| Pause after a wrong answer | 2600 ms |
| Quick-cast threshold | 6000 ms |

Whole completion from last answer to the room waking is about 2.4 seconds. This may feel long for a one-sum Spark. A shorter Spark version is an open idea.

## 6. How it is built
- One self-contained HTML page. No libraries, no server. Fonts from Google Fonts: Fondamento (headings) and Nunito (numbers and body).
- The reveal: the room image is shown twice. A grey copy (CSS greyscale and darken) sits underneath. A colour copy is drawn on a canvas on top and masked so it shows only inside soft ellipses ("hotspots"). Each completed spell fades its ellipses from 0 to 1.
- Effects: a second full-screen canvas draws sparks, flying digits, orbs, gems and the comet. Positions are read from the live layout, so it works at any screen size.
- Data: `rooms/<room>/hotspots.json`. Each hotspot has `id`, `name`, `kind` (spark, incantation, ritual, finale), `sums`, `shapes` (list of `[x, y, rx, ry]` in image pixels; rx and ry are the outer reach, the solid core is 62% of that), and `line` (what Pip says). The finale has `"full": true` and reveals the whole image.
- Saved in the browser (local storage): `mm_restored` (finished spells), `mm_tables` (chosen tables), `mm_stats` (miss counts).
- Prototype tools (a small section under the page): show the answer, preview the finished room, reset the room.
- Build: `python3 build.py` makes `dist/maths-magic.html`.

## 7. Known limits and ideas
- Hotspot shapes were placed by eye. Some colour may spill onto neighbouring objects. Fix by editing numbers in `hotspots.json`.
- For spells with several parts (forest, vines, potions) the comet lands on the first part only.
- No sound yet. A soft chime per tap, rising as the answer builds, and a larger sound for a finished spell would add a lot. Check sound with a real child first.
- One room is about 65 sums, which is one or two sessions. More rooms are the scalable answer (see `art/ART-BRIEF.md`).
- Not yet done: teacher view, accessibility pass (screen reader flow, dyslexia-friendly font option, larger text), playtest with children, tablet testing of keypad size.

## 8. Roadmap suggestion
1. Playtest this room with 2 or 3 children and a teacher, watched without help.
2. Add a second and third room (new art plus hotspots).
3. A simple world map: the small treehouses in the background of the room become doors to the next rooms.
4. Sound.
5. Decide the buyer, then build teacher or parent features.

## 9. Open decisions
- Buyer: parents or schools.
- Final name (Maths Magic is a working title).
- Which tables appear first, and how fast to introduce others.
- Whether Sparks get a shorter completion animation.
- Commercial use of AI-generated art: check the image tool's terms, and note that AI-generated art can have weaker copyright protection.

## 10. Version history
- 0.1 Grey room, clickable regions fade into colour, sums and keypad.
- 0.2 Pip moved above the room. Panel restyled as a spellbook. Feedback moved to Pip.
- 0.3 Per-tap effects: charged stone, flying number, landing sparks.
- 0.4 Dynamic gems. Correct answer melts into an orb that fills the next gem.
- 0.5 On completion the gems gather into a comet and fly to the point being revealed.
