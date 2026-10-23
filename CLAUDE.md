# Stratosphere

Mobile flight tracker. Plain HTML/CSS/JS web app, no build tools.

## Before any work

Read these first:
- `docs/build-planner.md` - long-term plans and goals
- `docs/build-queue.md` - what we are building next

Do not suggest or start work that isn't in the queue until Jon approves it. Only edit these two files when Jon says to.

## Code structure

- `index.html` loads `css/styles.css` and the files in `js/` as classic `<script>` tags (not ES modules).
- The scripts share globals, so the load order in `index.html` matters. Don't reorder them.
- `js/data/` holds large map and airport data. Avoid opening these whole.
