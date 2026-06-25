# TODO / Ideas

## Other demos to explore (systems-thinking visualizations)

- [ ] **Capacity vs. lead time (The Phoenix Project / queueing theory).**
      As resource utilization climbs toward 100%, wait time / lead time explodes
      (Kingman's formula: wait ∝ utilization / (1 − utilization)). An interactive
      slider for "% busy" showing lead time shooting toward infinity near 100%
      would make the DevOps/Lean point viscerally. Pairs well with the sliding-block
      demo as part of a small "counterintuitive systems" gallery.
- [ ] Brainstorm additional demos for the same gallery (e.g., Little's Law,
      Theory of Constraints / bottleneck flow, batch size vs. throughput,
      bullwhip effect in supply chains).

## Sliding-blocks demo — resolved

- [x] **5×5 grid question:** No — a bigger grid does NOT widen the 1/2/3-space delta.
      Both 4×4 and 5×5 show the same shape: the real honest drop is 1-space → 2-spaces
      (≈ halves the moves); the 3rd space barely helps (on 5×5 it even ticked up — noise).
      Bigger grids just make optimal solving slow. So the clean 80→40→20 ladder isn't a
      natural law.
- [x] **Human solver tail-trap bug — FIXED.** Root cause: a single blank can't extract
      a tile from a degree-1 "pendant" cell. Fix: solve each row/column end-pair as one
      3-variable BFS over (posA, posB, blankPos), tracking both tiles at once. Verified
      0 failures / 50,000 random boards.
- [x] **Final story:** ship BOTH via an Algorithm dropdown. Optimal → descending
      (~30/20/16, exploits spaces). Human → flat (~80/78/74, ignores spaces). The toggle
      itself teaches that the savings come from smart solving, not the spaces.

## Sliding-blocks demo — possible follow-ups

- [ ] Optimal counts vary per shuffle (e.g. 2-space and 3-space can tie). Optionally
      average several shuffles, or label that it's a single instance.
- [ ] In Human mode on 2/3-space boards, some counted moves are invisible (the spare
      "phantom" hole shuffling). Honest, but could add a faint ghost tile if it reads odd.
