# Build Planner (ideas, not spec'd, not queued)

Rules for Claude: read this at the start of a session. Edit it only when Jon says to.

## From the handoff doc
1. **Cutscene runway color:** black -> medium grey (no hex chosen)
2. **Cutscene background gradient gap:** the main map uses scattered-dot
   seasons, but the cutscene likely still uses a plain gradient
   - Low value now: the automatic cutscene trigger is disabled
     (the manual test buttons still run it)

## Surfaced this session
3. **Home location isn't saved between sessions:** you have to re-enter
   the lat/lon each launch. You raised this as a pain point, and v62
   doesn't fix it.
4. **GPS-noise tuning after your flight test:** 60 ft lateral margin,
   150 ft along-track margin, 7° alignment, 50 mph threshold
5. **Wyoming's snow start (Oct 11) comes before its dead-time (Oct 21):**
   a known choice, parked
6. **Track-Up mode never gets the idle-snapshot caching:** a limitation,
   not a regression

## Status unknown (can't confirm either way)
7. **Plane icon reading the same variable as the Flight Info lat/lon:**
   in the handoff doc's old queue. I can't tell whether it was ever built.

## Notes

- Web app only for now (not Google Play).
- Repo is private.
