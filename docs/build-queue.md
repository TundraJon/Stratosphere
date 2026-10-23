# Build Queue

Rules for Claude: read this before suggesting or starting any work. Only build what is at the top of the queue after Jon approves it. Edit it only when Jon says to.

## Queued (not built)
1. **Delete the orphaned zoom-debug comment**
   - Where: lines 841-843, just under the "Reset" button block
   - What: a comment-only change, so no code or behavior is touched
   - Ships as: v63

## Shipped
- **v62**
  - Landmarks: Arlington Cemetery (🪦) and Dollywood (🦋)
  - Home location POI
  - Heading freeze at 2 knots or below
  - 12 state season-date fixes
  - Removed the main-map runway lines and the diagnostic displays
  - Automatic cutscene trigger disabled
  - Binary Overview/Follow popup camera
  - Auto-open at 1 nm, with a 9 nm / 20-minute re-arm

## Waiting on you
- Real-world tuning after your GPS-loss flight test. The 60 ft lateral margin, 150 ft along-track margin, and 7° alignment are the values to watch.

## Repo setup (done)
- Commit original app as index.html
- Split index.html into css/ and js/ files (no code changes)
