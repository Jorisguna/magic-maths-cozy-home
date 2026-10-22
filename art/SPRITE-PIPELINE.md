# Sprite pipeline: making animal sprites with AI tools

Goal: a repeatable way to produce small, transparent animal sprites that match the painted rooms, so animals can move around in the game (see the animation plan). Companion to `ART-BRIEF.md` (rooms) and `PROJECT_BRIEF.md`.

## 1. Approach in one paragraph
Generate **one clean pose per animal state** with an AI image tool, using a room image as the style reference. Cut out the background, clean the edges, check it against the room, and export small WebP files. The game animates them in code (bobbing, hopping, squash, flips, fades). This avoids the hardest AI problem: keeping a character consistent across many animation frames. Walk-cycle frames are a later upgrade, not the starting point.

## 2. Sprite spec
| Item | Rule |
|---|---|
| Format | Transparent WebP (PNG kept as the master) |
| Size | Master 512 px on the longest side. Shipped 256 px (about 128 px on screen in a 1408 px room) |
| Facing | Right. The game flips it for left |
| View | Side-on, straight camera, like the rooms |
| Style | Hand-painted storybook, soft ink outline, warm light from the upper left, same palette as the rooms |
| Edges | Clean outline, no white or green fringe, no ground shadow baked in (the game draws a soft shadow) |
| Text, props, people | None |
| File size | Under 40 KB each (the build inlines them as base64) |
| Naming | `sprites/<animal>/<state>.png`, e.g. `sprites/mouse/idle.png`, `sprites/mouse/run.png` |

### Poses per animal
- `idle`: standing or sitting, relaxed. Required.
- `move`: mid-stride, hop or flap. Required.
- `sleep`: curled up. Only for animals that sleep.
- `react`: surprised, happy or looking up. Used when tapped. Optional first round.

Two poses is enough to start: the game alternates `idle` and `move` while bobbing, which reads as walking at this size.

### Starter cast
| Animal | Where it lives | Poses | Notes |
|---|---|---|---|
| Mouse | Floor in both rooms | idle, move, react | Gentle, small |
| Songbird | Branches outside, window sill | idle, move (wings out), react | Flits between perches |
| Owl | Beam or bookcase top | idle, react (eyes wide) | Barely moves, blinks |
| Squirrel | Forest edges and vines | idle, move | Quick runs |
| Butterfly | Anywhere | move (wings open), idle (wings closed) | Drifts in curves |
| Cat (existing) | Armchair or rug | Cropped from the room art | No generation needed |

## 3. Tools: what to use for each step
Tool choice changes quickly, so judge each one against the requirements below rather than a brand name. Check current features and terms before committing.

| Step | What you need | Options to evaluate |
|---|---|---|
| Generate | Image reference input (style match) and native transparent background output | ChatGPT image generation, Adobe Firefly, Midjourney with style reference, Leonardo, Ideogram |
| Cut out (if no native transparency) | Clean edges on fur and feathers | Photoshop or Firefly "remove background", rembg (open source), remove.bg, Photopea |
| Clean up | Fix fringes and stray pixels, paint over mistakes | Photopea (free, in browser), Affinity, Krita |
| Compress | Small WebP | `cwebp` or Squoosh |

Selection rules, in order:
1. **Commercial use is allowed** for generated output, in writing, and the terms are saved in the log (section 6). This matters because the buyer may be schools or parents.
2. It accepts a **reference image** so the style stays the same.
3. It can output **transparent** images, or cuts out cleanly afterwards.
4. Cost per usable sprite is predictable.

Run a one-hour bake-off: the same prompt and the same reference in 2 or 3 tools, producing a mouse. Pick the tool whose best result needs the least cleanup. Do not choose on the best single image.

## 4. Prompt template
Attach `rooms/treehouse-bedroom/room.jpg` as the style reference, then:

> A single {ANIMAL} in a {POSE} pose, seen from the side facing right, in the same hand-painted storybook style as the reference image: soft dark ink outline, warm golden light from the upper left, rich colour, gentle and cute. Plain flat background, no ground, no shadow, no props, no text. The whole animal is visible and centred with space around it.

Rules that save time:
- Ask for **a plain flat background** (pure white or flat mid-green) if the tool cannot do real transparency, then cut out. Avoid a colour that appears in the animal.
- Generate **4 variants** per pose and keep the best.
- To keep one animal consistent across poses, **use the chosen idle sprite as the reference** for the move, sleep and react poses, along with the room image. Say "same animal, same colours, same markings as the first image".
- Keep the wording of the style sentences identical every time. Change only the animal and pose.
- If the style drifts, re-attach the room image and repeat the style sentence.

## 5. Production workflow (per animal, about 30 to 45 minutes)
1. **Brief**: pick the animal, poses and room.
2. **Generate idle**: 4 variants, pick one. Save the raw output in `art/sprites-raw/<animal>/`.
3. **Generate other poses** using the idle sprite as a reference.
4. **Cut out**, clean the edges, and trim to the content with a small margin.
5. **Match check**: drop the sprite onto the room image at the planned size. Does it look like it belongs? Check lighting direction, outline weight and saturation.
6. **Grey check**: sprites appear only after their spell, so they are always seen in colour, but check against the grey room anyway.
7. **Export**: resize to 256 px, save the PNG master and the WebP into `rooms/<room>/sprites/` (or a shared `sprites/` folder).
8. **Log it** in `art/sprites-log.md` (section 6).
9. **Register it** in `critters.json` (section 7).

## 6. Operations and records
Keep `art/sprites-log.md`, one row per sprite:

| Sprite | Tool and version | Date | Prompt (or link to saved prompt) | Reference used | Licence or terms checked (link) | Edits made by hand |
|---|---|---|---|---|---|---|

Why: AI art can have weaker copyright protection (see `ART-BRIEF.md`). A record of the prompts, hand edits and licence terms helps if the project is sold, and shows what a person changed by hand.

Folders:
```
art/sprites-raw/<animal>/    untouched tool outputs (not shipped)
art/sprites-master/<animal>/ cleaned 512 px PNGs (not shipped)
rooms/<room>/sprites/        256 px WebP (shipped, inlined by build.py)
art/sprites-log.md           provenance log
```

Roles (one person can hold all three):
- **Director**: picks the cast, approves each sprite.
- **Generator**: runs the tool, cuts out, cleans.
- **Checker**: runs the QA list below. Ideally someone other than the generator, such as a child or teacher for the "is it cute and friendly" test.

## 7. Integration with the game
- `critters.json` per room, one entry per animal:
```json
{ "id": "mouse1", "sprite": "mouse", "scale": 0.5, "path": [[300, 700], [520, 690], [760, 710]],
  "speed": 40, "after": "cat", "behaviour": "wander" }
```
- `build.py` inlines each sprite as a base64 data URI, as it does for room images. Budget: 15 sprites at about 30 KB is about 450 KB per room, which is acceptable next to a 1408 px room JPEG.
- Animation (breathing, hops, flips, shadows) is done in code, not in the art.
- Reduced motion shows the `idle` pose and does not move it.

## 8. QA checklist (every sprite must pass)
- [ ] Transparent background with no halo when placed on the room image
- [ ] Faces right and the whole animal is in frame
- [ ] Same style, outline weight and lighting as the room
- [ ] Anatomy is plausible (right number of legs, ears, eyes; no extra limbs or melted paws)
- [ ] Friendly and not scary, at 128 px and at full size
- [ ] No text, logos or stray objects
- [ ] Poses of the same animal are clearly the same animal
- [ ] File under 40 KB
- [ ] Row added to `sprites-log.md`

Common AI failures to watch for: extra or fused legs, tails that merge into the background, mismatched eyes, a different colour or markings between poses, and a faint white edge after cutout.

## 9. Plan and estimate
| Stage | Work | Rough time |
|---|---|---|
| 0. Bake-off | Mouse in 2 or 3 tools, pick one, record terms | 1 to 2 hours |
| 1. Pilot | Mouse and songbird, full workflow, test in game | half a day |
| 2. Cast | Owl, squirrel, butterfly | 1 day |
| 3. Room 2 | Reuse animals, add 1 or 2 room-specific ones (fox, hedgehog) | half a day |
| 4. Upgrade (optional) | Walk-cycle frames for the one or two most visible animals | open-ended |

Estimates assume 2 to 4 tries per pose and are rough. Budget for tool subscription cost during the bake-off and pilot, then decide.

## 10. Risks and mitigations
- **Style drift between sessions.** Always attach the same room reference and reuse the exact style sentence.
- **Inconsistent animals across poses.** Use the idle sprite as a reference; if it still fails, generate only one pose and animate it in code.
- **Licence or copyright.** Check terms before the bake-off, save them in the log, keep the hand-edit records.
- **File size.** Compress to WebP at 256 px; drop animals that are not worth their bytes.
- **Animals look pasted on.** Draw a soft shadow in code, tint sprites slightly toward the room's colour, and keep animals to floor, branches and edges.

## 11. Open decisions
- Which tool wins the bake-off.
- Whether to commission an illustrator for a final cast later, using the AI sprites as placeholders.
- Whether the sprites are shared across rooms or tailored per room.
