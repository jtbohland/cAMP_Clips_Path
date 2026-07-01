---
name: Approach Pacing System — Full Spec
description: Complete specification for Week 1 (Approach) pacing modals, daily
  expectations, XP/badge rewards, auto-unlock logic, Day 6-8 failure flows, and
  the Oh Deer modal. Reference this whenever building or modifying Approach
  pacing, Week 1 modals, or the Begin Ascent flow.
accessType: on_demand
isEnabled: true
createdAt: 2026-07-01T21:22:15.226Z
---

# Approach Pacing System — Full Spec

## Overview
Approach = Week 1 = 5 weekdays, self-paced, no clips. Modules only.
Begin Ascent button is **locked** until all 8 modules are complete.
Once all modules done → learner can Begin Ascent (Day 5 or earlier since self-paced).

## Week 1 Modules (8 trackable items)
- **MEDDPICC** signoff (screenshot + reflection) ✍🏽
- **Academy screenshots** (4 courses) 🎓:
  - Getting Started with Analytics (40m + assessment)
  - Getting Started with Experiment (40m + assessment)
  - Contextualize User Experience with Session Replay (15m + assessment)
  - Engage Your Users with Guides & Surveys (30m + assessment)
- **cAMP 101** signoff ✍🏽
- **Challenger** signoff (account + contact + screenshot + reflection) ✍🏽
- **Wheel & Deal** verification 🎡

⏱️ Total: ~7h 20m | Daily average: ~1h 28m/day

## Daily Pace Schedule

| Day | What to complete | Cumulative items | Expected array |
|-----|-----------------|------------------|----------------|
| Day 1 | MEDDPICC + Analytics Academy | 2 | 2 |
| Day 2 | Experiment Academy + Session Replay Academy + start Challenger reading | 4 | 4 |
| Day 3 | Guides & Surveys Academy + cAMP 101 signoff + continue Challenger | 6 | 6 |
| Day 4 | Finish Challenger signoff | 7 | 7 |
| Day 5 | Wheel & Deal | 8 | 8 |

Expected-by-day array: `[0, 2, 4, 6, 7, 8]`

Note: Challenger is 4.5 hours spread across Days 2-4. We can only track the signoff (Day 4), not reading progress. Pacing is based on trackable completions.

## Pacing Modals — When They Fire
- **Day 1**: NO modal (just started, welcome modal from registration handles this)
- **Days 2, 3, 4, 5**: Pacing modal fires on login (once per day, same localStorage pattern as Ascent)
- **Day 6**: Missed deadline modal (no Slack accountability)
- **Day 7**: Final warning modal
- **Day 8+**: 🦌 Oh Deer modal — auto-unlock (client-triggered)

## Pacing Modal Design
- Uses **same tier system** as Ascent: summit_bound, off_the_trail, lost_in_the_woods, rockslide, avalanche_warning, anchor_failure
- Same colors, same visual design, same tier names
- **Approach-specific content inside:**
  - "Modules Completed: X/8" instead of "Clips Completed"
  - CTA button: "🚡 Continue to Approach"
  - Prescriptive **"Today's Plan" to-do list** with ☐/✅ + emojis (🎓 ✍🏽 🎡 📖)
  - If behind: **"Catch up" section** (amber/red) stacks overdue items above Today's Plan
  - Day 4: **⚠️ Due Tomorrow** banner
  - Day 5: **⏰ Due Today** banner

### Prescriptive Daily To-Do Lists (shown in modal)

**Day 2:**
- ☐ Academy: Getting Started with Experiment (40m + assessment) 🎓
- ☐ Academy: Session Replay (15m + assessment) 🎓
- 📖 Start Challenger reading (6 modules, 4h 30m total)

**Day 3:**
- ☐ Academy: Guides & Surveys (30m + assessment) 🎓
- ☐ cAMP 101 sign-off ✍🏽
- 📖 Continue Challenger

**Day 4 (⚠️ Due Tomorrow):**
- ☐ Finish Challenger sign-off ✍🏽

**Day 5 (⏰ Due Today):**
- ☐ Wheel & Deal with your manager (10–15m) 🎡
- 🧗 Begin The Ascent!

## Day 6-7: Missed Deadline Flow

**Day 6 modal:**
- Anchor failure style — missed Week 1 deadline
- NO Slack message accountability
- Message: "You have until tomorrow to catch up. After Day 7, we auto-unlock your Ascent path and you'll be expected to begin. You can revisit the Approach tab to finish what you missed, but all modules must be done by end of Ascent."
- Includes "Modules to complete" section
- If they complete Approach + Begin Ascent on Day 6 → FirstAchievementModal fires, **half XP (+17), no badge**

**Day 7 modal:**
- Anchor failure + catch-up list
- Message: "If you don't finish Approach today, Ascent opens tomorrow and you'll be expected to start Day 1: ICP. You're also off pace, so you'll need to catch up to reach your summit on time."
- If they complete Approach + Begin Ascent on Day 7 → FirstAchievementModal fires, **half XP (+17), no badge**

## Day 8+: 🦌 Oh Deer Modal (Auto-Unlock)
- NEW MODAL — animal theme
- Client-triggered: fires on first visit at Day 8+
- Message: "Ascent has been auto-unlocked. Please click Begin Ascent to go to the next part of your journey. You're still on the hook to finish Approach modules before you can reach the summit. Start Day 1: ICP."
- **No XP, no badge, no FirstAchievementModal**
- The only modal they get is this Oh Deer modal

## XP & Badge Rewards
- **On-time (Day ≤ 5)**: +35 XP + 🚡 Peak Lift badge (via existing FirstAchievementModal / UnlockAscent API)
- **Late catch-up (Day 6-7)**: +17 XP, no badge (FirstAchievementModal fires with reduced reward)
- **Auto-unlock (Day 8+)**: No XP, no badge, no achievement modal — only Oh Deer modal

## Timing & Ascent Impact
- 20 weekday total trajectory (unchanged)
- Approach = weekdays 1-5, Ascent = weekdays 6-20
- Ascent Week 2 Day 1 SHOULD start on weekday 6 — if it does, summit bound
- Start Ascent on weekday 7 = 1 day behind
- Start Ascent on weekday 8 = 2 days behind
- Late auto-unlock: pacing calculated from when Ascent SHOULD have started (weekday 6), not when they actually unlocked
- If they don't open app until Day 9/10: auto-unlock fires then, but they're already 3-4 days behind on Ascent pacing
- Expectation: still 1 topic per day

## Legacy Learners
- **ZERO impact** — Approach pacing does NOT apply to legacy learners
- They already have `isLegacyLearner` flag
- No Approach pacing modals, no Day 6/7/8 flows
- Their 20-weekday flight path and Ascent pacing stays exactly as-is
- They all started "on time" by design (Approach was omitted for them)
