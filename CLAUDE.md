# Stratosphere

Mobile flight tracker. Plain HTML/CSS/JS web app, no build tools.

## Before any work

Read `README.md` first. It holds the standing rule, the Build Log, the Build Queue and the Build Planner. Follow the workflow described there:
- Every request is logged first (Queue or Planner), with a number and a precise description.
- Logging is not build permission. Build only after Jon says "build N", "build all" or "go ahead and build".
- Each build gets a Build Log entry (what changed, how it was tested, what was left out).
- You own editing the Build Log, Build Queue and Build Planner sections of `README.md` as part of doing the work. Update them yourself, as you go. Don't wait for Jon to write them and don't ask him to. Jon decides what moves from the Planner into the Queue, and when to build.
- Build Log entries are append-only. Once something ships, a later correction is its own new Build Log entry, not an edit to the old one.
- Check the real file (or run the command) before telling Jon what the Queue, Planner, Log, tests or versions say. Never report from memory.
- The full workflow is in `docs/BUILD-WORKFLOW.md`.

## Standing rules

1. Never build or edit code without an explicit "build". A message that reads like an instruction is still only logged.
2. If you ask a question, wait for the answer. Don't assume one and start building.
3. If something is ambiguous, ask. Restate what you think Jon wants and spell out the exact interpretation.
4. No unrequested clean-up, optimizing, modernizing or reformatting. Keep formatting, spacing and structure.
5. Never add or remove features unasked, and never touch unrelated code.
6. Test before pushing, and keep it to about 5 minutes at most. `node tests/run.js` is the quick check (version numbers, a smoke test, and only the suites for the files that changed; about 2 minutes). Run `node tests/run.js --full` (5 to 6 minutes) only when Jon asks, or when a build touches the loader, service worker, caching or startup code. Details in `tests/README.md`.
7. Commit and push to `main`, with no PRs.
8. Phone-first. Design and test at Pixel 7 size.
9. Direct and casual, under about 300 words unless asked for more. Give real recommendations and push back when an idea has a problem. No filler openers.
10. Priorities: professional-looking apps and games, useful extras, new ideas, innovative RPG combat and pocket travel games, and what other apps do above and beyond.

## Code structure

- `index.html` loads `css/styles.css` and the files in `js/` as classic `<script>` tags (not ES modules).
- The scripts share globals, so the load order in `index.html` matters. Don't reorder them.
- `js/data/` holds large map and airport data. Avoid opening these whole.
- Version buster: every file reference in `index.html` (the stylesheet, all scripts, the manifest, the favicon and the Apple icon) ends with `?v=<build version number>`, for example `?v=80`. Every build must change that number, on all of them at once, to the new build's version number, so a browser refresh gets the new files.
