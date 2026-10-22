# Maths Magic

A web game where times-table sums cast spells that bring a grey room to life. Read `PROJECT_BRIEF.md` for the idea, decisions and spec.

## Files
| Path | What it is |
|---|---|
| `PROJECT_BRIEF.md` | Vision, maths rules, experience spec, timings, roadmap, open decisions |
| `CLAUDE-PROJECT-INSTRUCTIONS.md` | Text to paste into the Project's instructions |
| `src/index.template.html` | Page markup and the head (fonts, title) |
| `src/styles.css` | All styling: spellbook, keys, gems, effects |
| `src/game.js` | All behaviour: spells, sums, effects, reveal |
| `rooms/treehouse-bedroom/room.jpg` | The room picture (1408 x 768) |
| `rooms/treehouse-bedroom/hotspots.json` | The 22 restorable regions and their sums |
| `art/ART-BRIEF.md` | How to make more rooms that match |
| `build.py` | Builds `dist/maths-magic.html` |
| `dist/maths-magic.html` | The finished single-file page (this is what gets published) |

## Build
`python3 build.py` builds one page with every room under `rooms/`.

## Add a room
1. Make the image (see `art/ART-BRIEF.md`).
2. Create `rooms/<name>/` with `room.jpg`, `hotspots.json` (same format as the bedroom) and `room.json`.
3. Run `python3 build.py`. The room appears on the world map.

`room.json` fields (all optional): `title`, `order` (position on the map and in the sequence), `blurb`, `intro` (Pip's first line in the room), `requires` (id of the room that must be finished first; none means open from the start), `map` (`[x, y]` percentages on a wide screen; otherwise rooms zigzag across the map automatically).
