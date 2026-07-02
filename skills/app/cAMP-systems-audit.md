# cAMP Clips Path — Systems Audit Reference

> Canonical reference for all core systems. Verified 2026-07-01.
> Use this to confirm expected behavior before making changes.

---

## 1. Engagement Score (EndSession)

**File:** `server/apis/v2/end-session.ts`

| Component | Weight | Source |
|-----------|--------|--------|
| Questions answered | 25% | `questions_answered / questions_available` |
| Focus score | 30% | `focus_score` (0–100 from frontend) |
| Time-on-task | 45% | `actual_duration / expected_duration` (capped at 1.0) |

- Formula: `(q × 0.25) + (f × 0.30) + (t × 0.45)` → rounded to nearest integer (0–100)
- `passed` = `score >= 80`
- EndSession records metrics only — it does **NOT** mark clip as complete or unlock next

---

## 2. Search & Rescue Trigger

**File:** `client/pages/Watch/index.tsx` (handleFinishWatching)

- Triggered when **overall engagement score < 80** (the combined weighted score)
- **NEVER** triggered by trail marker score alone
- Trail markers contribute to the questions component (25%) but don't independently gate anything

**Rule:** S&R trigger = overall engagement < 80, period.

---

## 3. Search & Rescue Unlock Logic

**File:** `client/pages/Watch/index.tsx` (handleSearchRescueComplete)

- S&R quiz score ≥ 80% → clip marked complete → next clip unlocked
- S&R quiz score < 80% → Weather the Storm triggered
- The **S&R quiz score is the gate**, NOT a recalculated overall engagement score
- CompleteClipPath is called with `completion_type = 'search_rescue'`

**Rule:** S&R quiz ≥ 80% unlocks next. No engagement recalculation.

---

## 4. Weather the Storm

**File:** `client/pages/Watch/index.tsx` (handleWeatherExpire)

- Timer starts (duration from config)
- On expiry → `completeClipPath` called with `completion_type = 'weather_storm'`
- Navigates to Library page
- Clip is marked complete regardless — WtS is a "time served" completion

---

## 5. Clip Unlocks (Sequential)

**Files:** `server/apis/v2/complete-clip-path.ts`, `server/apis/v2/get-clip-library.ts`

### Unlock Rules:
| Condition | Unlocked? |
|-----------|-----------|
| Admin user | All clips unlocked |
| Clip at sort_order = 0 | Always unlocked (first clip) |
| `cliptracker_v2_unlock_overrides` has entry | Unlocked |
| `hasExistingSession` (legacy fallback) | Unlocked |

### How unlocks are created:
- `CompleteClipPath` inserts into `cliptracker_v2_unlock_overrides` for `sort_order + 1`
- Works for ALL completion types: `first_pass`, `search_rescue`, `weather_storm`
- Strictly sequential — no skip possible

---

## 6. Resource Day Unlocks (Day 5 & Day 9)

**Files:** `server/apis/v2/get-clip-library.ts`, `client/config/topicDays.ts`

| Day | Sort Order | Topic |
|-----|-----------|-------|
| Day 5 | 5 | Renewal Operations |
| Day 9 | 11 | Pricing & Packaging 101 |

- Identified by `video_url IS NULL` (`isTopicDay`)
- Unlocked via same sequential override (previous clip's completion)
- Completion tracked via `swiss_army_knife` XP event (no video session)
- `topicCompletedSet.has(clip.id)` checks for this event
- Once complete, next clip's override is inserted

---

## 7. Week Unlocks (Two-Key System)

**Files:** `client/pages/Library/index.tsx`, `client/components/LearnerCheckinModal.tsx`, `server/apis/v2/mark-checkin-sent.ts`

Weeks are gated by a **two-key system**: sequential clip unlock in the DB + Anchor Point check-in email at the UI level.

| Transition | DB Gate | UI Gate |
|------------|---------|---------|
| Week 1 → Week 2 | UnlockAscent (3 modules + W&D) | Approach Anchor Point email |
| Week 2 → Week 3 | Day 5 resource completion → Day 6 clip unlocked | Week 2 Anchor Point email |
| Week 3 → Week 4 | Day 10 completion → Day 11 clip unlocked | Week 3 Anchor Point email |

### How the UI gate works:
- `LearnerCheckinModal` has **no close button** until the email is marked as sent
- Modal blocks the entire Library — learner cannot see or click clips behind it
- Trigger uses `sessionStorage` — refreshing re-prompts the modal (no escape)
- `MarkCheckinSent` API sets `{type}_checkin_sent_at` timestamp on the viewer record
- Library checks `progressData.{type}CheckinSentAt` to decide whether to trigger

### Trigger conditions:
| Check-in | Fires when |
|----------|-----------|
| Approach (callback) | After FirstAchievement dismiss (Day ≤7) or Oh Deer dismiss (Day 8+) |
| **Approach (auto-trigger)** | **Every Library load: `ascentDay1` exists + `approachCheckinSentAt` is null — persistent gate** |
| Week 2 | 5+ clips complete + approach sent + `week2CheckinSentAt` is null |
| Week 3 | 10+ clips complete + `week3CheckinSentAt` is null |
| Summit | All clips complete (summit celebration flow) |

All check-ins (Approach, Week 2, Week 3) use both a callback trigger AND an auto-trigger useEffect.
The auto-trigger is the persistent gate — it re-fires on every Library load until the email is sent.

### Pacing status on check-in modals:
- All check-in types (including Approach) show the pacing banner when `ascentDay1` exists
- Shows: Ascent Date, Pacing Status (tier emoji + label), Summit Day
- Email body also includes pacing context with descriptive note (days remaining, resource days open, etc.)

### Key detail:
- Clips unlock sequentially in the DB regardless of check-in status
- The check-in modal **prevents Library access** until sent — this is the actual week gate
- `On the Trail` pace bonuses have week-based windows but don't block access
- Admins bypass check-in modals via `allowClose` flag

---

## 8. XP System

**File:** `server/apis/v2/award-xp.ts`

### XP Components:
| Type | Points | Condition |
|------|--------|-----------|
| Base completion | 10 | Every clip completion |
| Performance bonus | 5 | First-pass completion (no S&R/WtS) |
| Streak bonus | 5 | 3+ consecutive first-pass completions |
| Milestone bonus | 10 | Clips 5, 10, 15 |
| On the Trail (pace) | 5 | Completed within expected week window |
| Swiss Army Knife | 10 | Topic day (resource day) completion |
| Begin Ascent | 35 (on-time) / 17 (late) | UnlockAscent — 3 modules + W&D verified |

### Protection:
- All XP inserts use `ON CONFLICT DO NOTHING` — no double-awards possible
- Each event type + clip combo is unique per user

---

## 9. Tier Thresholds

**File:** `client/lib/pacing.ts`

| Tier | XP Required | Badge |
|------|-------------|-------|
| Basecamp | 0 | — |
| Pathfinder | 150 | 🥾 |
| Trailblazer | 325 | 🏔️ |
| Summit | 500 | ⛰️ |

---

## 10. Pacing System (Ascent)

**File:** `client/lib/pacing.ts`

- 20-weekday schedule from `start_date`
- Topic-day based counting (15 topic days in Ascent)
- Pace tiers: On Pace / Slightly Behind / Behind / At Risk
- Modals show catch-up guidance based on tier
- "Tomorrow is Summit Day" and "Today is Summit Day" warnings on ALL tiers
- Approach completion indicator appears on ALL Ascent modals

---

## 11. Approach Pacing (Week 1)

**File:** `client/lib/pacing.ts`, `client/components/ApproachPacingModal.tsx`

- 7 total items (NOT 8 — cAMP 101 is not separately trackable)
- Expected by day: [0, 2, 4, 5, 6, 7] (Day 1→0, Day 2→2, Day 3→4, Day 4→5, Day 5→6, Day 6+→7)
- Items: 4 Academy courses + Slack channel + Manager intro + Amplitude org access
- Day 6–8 failure: Oh Deer modal, then hard block at Day 8
- Legacy learners: fully exempt, auto-get green pill

---

## 12. Summit Reached Gate

**File:** `client/pages/Library/index.tsx`

- Requires BOTH: `ascentComplete === true` AND `approachStatus?.complete === true`
- If Ascent done but Approach incomplete → Summit in Sight modal (not Summit Reached)
- Both conditions must be true for confetti + Summit Reached celebration

---

## 13. UnlockAscent Requirements

**File:** `server/apis/v2/unlock-ascent.ts`

| Requirement | Detail |
|-------------|--------|
| Module signoffs | 3 required (from `module_signoffs` table) |
| W&D verification | `wands_verified = true` on user record |
| On-time window | Within 5 weekdays of start_date |
| On-time reward | 35 XP + "Begin Ascent" badge |
| Late reward | 17 XP, no badge |
