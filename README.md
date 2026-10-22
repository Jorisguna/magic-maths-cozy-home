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
| `dist/maths-magic.html` | The finished single-file page, built by `build.py` |
| `docs/index.html` | A copy of the built page. GitHub Pages serves this, so it is the live version |

## Build
`python3 build.py` builds one page with every room under `rooms/`.

## Add a room
1. Make the image (see `art/ART-BRIEF.md`).
2. Create `rooms/<name>/` with `room.jpg`, `hotspots.json` (same format as the bedroom) and `room.json`.
3. Run `python3 build.py`. The room appears on the world map.

`room.json` fields (all optional): `title`, `order` (position on the map and in the sequence), `blurb`, `intro` (Pip's first line in the room), `requires` (id of the room that must be finished first; none means open from the start). Rooms are placed on the great tree automatically, first room at the bottom.

## Test locally
Run `python3 build.py`, then double-click `dist/maths-magic.html` (Finder: MagicMathsCozyHome, then dist). Refresh the browser tab after each rebuild. Use "Prototype tools" under the game to preview a finished room, and "Reset all progress" under the map to start fresh.

## Publish (makes a change live)
Only do this when the change has been played locally.
1. Check nothing unexpected has changed: `git status`, `git log -5` and `git fetch` then `git status -sb`. Only one session should work in this folder at a time.
2. Commit the source changes (`src/`, `rooms/`, docs).
3. `python3 build.py`, then copy `dist/maths-magic.html` to `docs/index.html`.
4. Commit that and `git push origin main`.
5. Wait a minute or two, then hard-refresh the live page (Cmd+Shift+R). The title area should show the new prototype number.

Live page: https://jorisguna.github.io/magic-maths-cozy-home/ (GitHub Pages, served from `docs/` on `main`; confirm in the repository's Settings, then Pages).
