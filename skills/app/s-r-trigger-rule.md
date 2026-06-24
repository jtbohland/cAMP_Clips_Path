---
name: S&R Trigger Rule
description: The Search & Rescue trigger is based on OVERALL ENGAGEMENT SCORE
  (questions 25% + focus 30% + time 45%), never trail marker score alone. This
  is a foundational design rule for the entire learning path system.
accessType: on_demand
isEnabled: true
createdAt: 2026-06-23T22:45:25.571Z
---

## S&R Trigger — Foundational Rule

**Search & Rescue triggers when overall engagement score < 80%.** This is non-negotiable.

- Engagement score = `(question_score × 0.25) + (focus_score × 0.30) + (time_score × 0.45)`
- Trail marker score is only 25% of this — a learner can ace trail markers but still fail engagement
- The `EndSession` API computes the real engagement score and returns `passed: boolean`
- `handleFinishWatching` must `await endSession()` and use `res.passed` for the S&R decision
- **NEVER use `correctCount / trailMarkerCount` for pass/fail** — that ignores focus and time

### Full Flow
1. **First attempt:** Engagement ≥ 80 → pass, unlock clip, Ranger Report. < 80 → fail, S&R triggered
2. **S&R:** ≥ 80 → pass, unlock clip, Ranger Report. < 80 → fail, WtS triggered
3. **WtS:** Timer expires → unlocks clip, Ranger Report

### XP Implications
- `passedFirstPass: true` is ONLY set when engagement ≥ 80 on first attempt
- Performance bonuses (`perfect_hiker`, `speed_hiker`, `first_pass_unlock`) require `passedFirstPass`
- If engagement < 80, learner MUST go through S&R — no shortcuts
