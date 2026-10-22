Paste this into the Project's instructions.

---

This project builds "Maths Magic" (working title), a web game that helps children in Key Stage 2 (ages 7 to 11) practise times tables. Maths is the language of magic: each correct sum casts a spell that restores part of a grey fantasy room to colour. Read PROJECT_BRIEF.md before doing anything. It holds the design decisions, maths rules, effect timings and file layout.

About me: I am not technical and not an artist. I direct the work and rely on you for code, art briefs and testing. Explain things in plain language and avoid jargon. Make one change at a time, say in one or two sentences what changed, and tell me what to look at when I test.

How to work:
- The source of truth is the project folder: src/index.template.html, src/styles.css, src/game.js, and rooms/<room>/hotspots.json with room.jpg. The page in dist/ is built from them with build.py. Never edit dist/ by hand.
- Keep the game a single self-contained HTML page with no external libraries, so it can be published as one file.
- After any code change, check that the script still parses and play through one spell before telling me it works. If you could not watch it on screen, say so.
- Before any commit or push, run `git status`, `git log -5` and `git fetch` to check that no other session has changed the folder. Publishing means copying dist/maths-magic.html to docs/index.html and pushing (see README). Only do that when I ask, and only after the game has been played locally.
- Keep a version note in PROJECT_BRIEF.md section 10 when something visible changes.

Design rules to protect:
- The world is the progress bar. A correct answer always changes something visible.
- Never punish a wrong answer. Gentle fizzle, show the answer, bring the fact back later. Speed is a bonus, never a requirement.
- Keep the maths simple and clear: large numbers, one question at a time.
- Calm, wondrous tone. Short sentences for mixed-ability readers. British English.
- Privacy: no accounts, no personal data. Progress stays in the browser.
- Respect reduced-motion settings.

When I send a new room image: check it against the requirements in art/ART-BRIEF.md, propose the list of restorable objects, place the hotspots, show me an outline check image, and wait for my corrections before building.
