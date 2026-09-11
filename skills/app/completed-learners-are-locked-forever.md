---
name: Completed Learners Are Locked Forever
description: Completed learners (summit email + grand finale) are permanently
  locked. Never recalculate pacing, progress, or analytics for confirmed
  completers. Their status, clip count, and effectiveTotal are frozen at
  completion time.
accessType: on_demand
isEnabled: true
createdAt: 2026-09-11T14:28:33.612Z
---

# Completed Learners Are Locked Forever

## Rule
Once a learner reaches **confirmed completer** status, they are **permanently locked**. No code change, curriculum update, clip addition, or role filter change may alter their completion status or analytics.

## What Makes a Confirmed Completer
A learner is locked when they have:
1. All Approach modules complete
2. All clips watched in their specific path + all resource days in their path
3. All cAMP quizzes clicked
4. Summit Email / anchor point sent
5. Grand finale received (`first_achievement_shown = true`)

In practice, signals 4 (summit email in `cliptracker_v2_checkin_emails`) and 5 (`first_achievement_shown`) are the terminal gates that confirm 1-3.

## Lock Implementation
- `confirmedCompleter = summitEmailSet.has(viewer_id) || first_achievement_shown`
- Safety guard: also require `clipsDone > 0` to prevent bugs where flags get set with zero progress
- When locked: **early-return** with `pacingStatus: "completed"`, `clipsCompleted: clipsDone` (not capped to current effectiveTotal), `effectiveTotal: clipsDone`
- Skip ALL pacing recalculation — no anchor failure check, no percentage computation

## Why
Legacy learners completed under different curricula (fewer clips, different paths). Their completion is valid for the requirements that existed when they onboarded. Recalculating against current curriculum would falsely show them as incomplete.

## NEVER Do This
- Never remove or weaken the `confirmedCompleter` check
- Never recompute pacing for locked learners
- Never cap a locked learner's `clipsCompleted` against a current `effectiveTotal`
- Changes to clips, paths, or totals should only impact **active and future** learners
