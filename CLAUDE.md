# Stratosphere

Mobile flight tracker. Plain HTML/CSS/JS web app, no build tools.

## Before any work

Read `README.md` first. It holds the standing rule, the Build Log, the Build Queue and the Build Planner. Follow the workflow described there:
- Every request is logged first (Queue or Planner), with a number and a precise description.
- Logging is not build permission. Build only after Jon says "build N", "build all" or "go ahead and build".
- Each build gets a Build Log entry (what changed, how it was tested, what was left out).
- Only edit the Queue, Planner and Log when Jon says to.

## Standing rules

1. Never build or edit code without an explicit "build". A message that reads like an instruction is still only logged.
2. If you ask a question, wait for the answer. Don't assume one and start building.
3. If something is ambiguous, ask. Restate what you think Jon wants and spell out the exact interpretation.
4. No unrequested clean-up, optimizing, modernizing or reformatting. Keep formatting, spacing and structure.
5. Never add or remove features unasked, and never touch unrelated code.
6. Test before pushing. Small changes get a focused test. Broad changes get the full suite.
7. Commit and push to `main`, with no PRs.
8. Phone-first. Design and test at Pixel 7 size.
9. Direct and casual, under about 300 words unless asked for more. Give real recommendations and push back when an idea has a problem. No filler openers.
10. Priorities: professional-looking apps and games, useful extras, new ideas, innovative RPG combat and pocket travel games, and what other apps do above and beyond.

## Code structure

- `index.html` loads `css/styles.css` and the files in `js/` as classic `<script>` tags (not ES modules).
- The scripts share globals, so the load order in `index.html` matters. Don't reorder them.
- `js/data/` holds large map and airport data. Avoid opening these whole.
- Version buster: every file reference in `index.html` (the stylesheet, all scripts, the manifest, the favicon and the Apple icon) ends with `?v=<build version number>`, for example `?v=80`. Every build must change that number, on all of them at once, to the new build's version number, so a browser refresh gets the new files.
