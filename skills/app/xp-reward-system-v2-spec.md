---
name: XP Reward System V2 Spec
description: "Complete specification for the XP reward system overhaul: Summit
  Rewards (tiered completion), Pacing Streak Bonuses, Grip Strength, Today's
  Patch Progress on pacing modals, Final Achievement modal, and legacy learner
  rules. Reference when building or modifying any XP, badge, milestone, or
  reward system."
accessType: on_demand
isEnabled: true
createdAt: 2026-07-02T18:33:56.646Z
---

# XP Reward System V2 — Full Spec

## Overview
Overhaul of the XP reward system to add tiered summit completion rewards, pacing streak bonuses, engagement performance bonus, daily motivation pills on pacing modals, and a Final Achievement modal.

## Summit Rewards (replaces old "Summit Reached +25")
| Emoji | Name | Condition | XP |
|---|---|---|---|
| 🌄 | Golden Summit | Approach ✅ + Ascent ✅ by Summit Day | +40 |
| ⛷️ | Speed Ascent | Ascent ✅ by Summit Day, Approach ❌ | +30 |
| 💨 | Second Wind | Both ✅ by Adjustment Day | +20 |
| 👣 | Every Step Counts | Finished Ascent after Adjustment | +10 |

## Pacing Streak Bonuses (NEW — new learners only)
| Emoji | Name | Condition | XP |
|---|---|---|---|
| 🥾 | Ridge Runner | 5 days Summit Bound | +10 |
| 🏔️ | Alpine Endurance | 10 days Summit Bound | +15 |
| 🦿 | Iron Legs | 15 days Summit Bound | +20 |
| 🐐 | Mountain Goat | 20 days Summit Bound | +30 |
| 🧗 | Free Solo | 0 rockslide/avalanche/anchor failure across all 20 Ascent days | +40 |

## Performance Bonus Addition
| Emoji | Name | Condition | XP |
|---|---|---|---|
| 💪 | Grip Strength | Average ≥85% engagement score across all 17 clips | +35 |

## Milestone Changes
- **Halfway Up** (+15): Changed from "Complete Clip 9" → "Complete Day 10" (resource day — earned when all resources reviewed + reflection submitted)
- **Summit Reached** (+25): REMOVED, replaced by Summit Rewards above
- All other milestones unchanged

## Existing Streaks (KEEP as-is)
- No Detours (+10): 5-clip window without S&R (×3 max)
- Leave No Trace (+15): 5/5 Trail Markers on 3-clip window (×5 max)

## Today's Patch Progress (pacing modal section)
- Header: 🎖️ **Today's Patch Progress**
- Subtitle: *Complete the task, earn your emblems, advance your rank! Here's what's at stake...*
- Shows personalized pills: emoji + badge name + XP value
- Footer: 🕶️ **Best case today: +XX XP**
- Calculates possible badges based on learner's unique state (current clip/day, streak windows, pacing streak count)
- Legacy learners: per-clip bonuses only (Perfect Hiker, Speed Hiker, No Detours, Leave No Trace, etc.)
- New learners: per-clip + pacing streak bonuses

## Final Achievement Modal
- Fires after summit is reached, BEFORE Grand Finale modal
- Flow: Summit reached → Final Achievement modal → "Final Anchor Point" button → Grand Finale modal
- Shows ONLY big achievements earned (if applicable):
  1. One Summit Reward (Golden Summit / Speed Ascent / Second Wind / Every Step Counts)
  2. Any earned Pacing Streak bonuses
  3. Grip Strength (if ≥85% average engagement)
- Standard per-clip XP/badges go to the XP bar — NOT shown in this modal
- Must be added to Modal Museum
- Pairs with existing Approach Achievement + New Achievement modals

## Legacy Learner Rules
- **CAN earn**: Summit Rewards, Grip Strength, Final Achievement modal, Today's Patch Progress (per-clip bonuses only), Halfway Up (new trigger), all existing per-clip bonuses
- **CANNOT earn**: Pacing Streak Bonuses (Ridge Runner, Alpine Endurance, Iron Legs, Mountain Goat, Free Solo) — new learners only
- No retroactive XP changes — if they already earned something, they keep it

## Build Phases
1. **XP-lanation page updates** — display changes (Summit Rewards section, Pacing Streaks section, Grip Strength, Halfway Up wording, updated max XP)
2. **Backend reward calculation** — Summit Reward logic, pacing streak tracking, Free Solo check, Grip Strength calculation, Halfway Up trigger change
3. **Final Achievement modal** — new component, wire into summit flow, add to Museum
4. **Today's Patch Progress** — helper function + pacing modal integration
