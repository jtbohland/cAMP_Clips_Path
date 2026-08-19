# Rules of the Ridge — Full Spec

## Overview

**Day Name:** Rules of Engagement
**Game Name:** Rules of the Ridge
**Day Number:** Day 12
**Path:** SDR ONLY (does not affect AE path)
**Week:** Week 4 (after Customer Stories)
**SME:** Derrick Williams
**Unlock:** Customer Stories completion → unlocks Rules of Engagement
**Completion:** Any score = complete. Badge earned no matter what.

---

## Current State (No Video)

This day functions like a **resource day** — identical to Pricing & Packaging 101:
- One resource: ROE Guide (Google Doc link)
- Instead of a **reflection**, the SDR plays **Rules of the Ridge**
- No engagement scoring, no trail markers, no S&R, no WtS
- The game IS the assessment. The badge IS how engaged they chose to be.

## Future State (Video Added, ~2–3 Weeks)

When the clip is recorded:
- Video plays first → engagement score, S&R modal (if triggered), or WtS
- Instead of "Back to Clips" button → transitions into Rules of the Ridge game
- End screen of the game is what takes them to Clips homescreen
- Engagement scoring applies to the video portion only

---

## Game Mechanics

### Flow

1. SDR clicks into Day 12 from Library
2. Reads the ROE Guide resource (cAMP Gear)
3. Launches "Rules of the Ridge" game
4. 10 scenarios presented one at a time (randomly drawn from 50)
5. For each scenario:
   a. Read the narrative (2–4 sentence case study)
   b. **Part 1:** "Does the SDR get credit?" → Yes / No
   c. **Part 2:** "Which rule applies?" → Pick from 4 ROE sections (1 correct, 3 distractors)
   d. **Crux Call:** Rate confidence → ⛏️ / ⛏️⛏️ / ⛏️⛏️⛏️
   e. Reveal answer → Show Derrick's Belay 🪢 if wrong
   f. Points animate into running Ridge Score
6. After 10 scenarios → End Screen

### Crux Call (Confidence Wager)

Set **after answering both parts, before seeing the result**. The SDR is wagering on their total judgment.

| Level | Label | Correct Multiplier | Wrong Penalty |
|-------|-------|--------------------|---------------|
| ⛏️ | Cautious | 1x | −0 |
| ⛏️⛏️ | Confident | 2x | −3 |
| ⛏️⛏️⛏️ | Sending It | 3x | −5 |

### Scoring

| Component | Points |
|-----------|--------|
| Yes/No correct | 5 base |
| Rule correct | 5 base |
| Both correct | 10 base × Crux multiplier |
| Yes/No wrong | 0 (+ Crux penalty) |
| Rule wrong | 0 (+ Crux penalty if Yes/No also wrong) |
| Half right (Yes/No correct, Rule wrong) | 5 × Crux multiplier (no penalty) |

**Max possible score:** 10 scenarios × 10 pts × 3x = **300 points**

### Running Ridge Score

Displayed in corner/header throughout the game. After each scenario resolves, points gained or lost animate into the tally. This makes the Crux Call a *strategic decision* — SDRs can see their running total and decide how much to risk.

### Derrick's Belay 🪢

When a wrong answer is revealed, show a coaching note:
- **"Derrick's Belay 🪢"** header
- 1–2 sentence explanation of why the correct answer applies
- References the specific ROE section

---

## Badges (Title = Badge)

Earned based on final Ridge Score. Four tiers:

| Threshold | Emoji | Badge Name |
|-----------|-------|------------|
| 0–99 | 🪨 | Ridge Rookie |
| 100–179 | ⛏️ | Trail Judge |
| 180–249 | 🏔️ | ROE Enforcer |
| 250–300 | 🌄 | Summit Authority |

All four are added to the badge system alongside existing badges (speed_hiker, swiss_army_knife, etc.).

---

## End Screen

After 10 scenarios, display:

1. **Ridge Score** (total points / 300 max)
2. **Badge earned** (emoji + title, animated reveal)
3. **Crux Accuracy** — how well-calibrated their confidence was (% of high-confidence answers that were correct)
4. **ROE Section Breakdown** — which sections they nailed vs. stumbled on
5. **XP Earned** — total XP from the game
6. **"Back to Clips"** button → returns to Library homescreen
7. **"Ridge Replay"** button → restarts with new random 10, no XP stakes

### Ridge Replay

- Same mechanics, same Crux Call UI
- XP is frozen — no gain, no loss
- New random 10 drawn from the full 50 each time
- Tagline: *"No stakes. No wagers. Just 10 fresh scenarios from 50+ in the vault."*

---

## Ranger Report (Post-Completion)

When SDR returns to Library homescreen after completing the game:
- The day's **cAMP Gear** button becomes a **Ranger Report**
- Contents:
  - Ridge Score at top
  - Summary of the day
  - XP earned
  - Badge earned
  - cAMP Gear (ROE Guide link)
  - **"Ridge Replay" tile** with tagline: *"No stakes. No wagers. Just 10 fresh scenarios from 50+ in the vault."*

---

## Summit / Unlock Chain

```
Customer Stories (Day 11) completion
  → unlocks Rules of Engagement (Day 12)
    → game completion (any score) triggers:
      - Badge awarded
      - XP awarded
      - Summit Gate (for SDR path)
```

**Summit Modal Trigger:** When SDR returns to Library homescreen after completing the game. This could be after first play or after replays. Key consideration: if they start a replay and close the app before returning to homescreen, the summit modal triggers on their next visit to the Library page (since the completion is already recorded in DB).

**No AE impact.** AE path summit chain is unchanged.

---

## XP Implications

- New XP source for SDRs only
- Max Ridge XP = to be calculated based on scoring + badge XP
- Update SDR max in XPlanation modal
- Update SDR cap on leaderboard
- AE max unchanged

---

## ROE Sections (for scenario categorization)

These are the 12 rule areas from the ROE Guide. Each scenario tests one of these:

1. **Primary Source Crediting** — meaningful engagement, logging touches
2. **S2 Qualification (3 Whys)** — Why Buy Anything, Why Buy Now, Why Amplitude + FLM validation
3. **Required SFDC Fields** — Meeting booked by, Sourcing Rep, S2 Date, Pipeline Source
4. **Out-of-Territory Meetings** — regional boundaries, event exceptions
5. **Secondary Source Crediting** — exception basis, proof of engagement before S3
6. **BoB Transitions** — 30-day window, outbound/inbound rules, same-quarter flip
7. **Live Chat Policy** — account ownership at S2 creation time
8. **Opportunity Amount Changes** — 40% threshold, 30-day true-up window
9. **Multiple Opps in Same Account** — distinct vs. duplicate
10. **Stage Movement (S1↔S2)** — back-and-forth, end-of-month snapshot
11. **Closed Lost / Clawbacks** — merge, no show, wrong person, 90-day clawback
12. **Parent/Child Hierarchies** — alignment rules, engagement origin, inbound routing
13. **Statute of Limitations** — 90-day activity window

---

## Scenario Format

Each of the 50 scenarios follows this structure:

```
ID: ROE-XX
Section: [ROE section being tested]
Narrative: [2–4 sentence case study with names, dates, specifics]
Question: "Does [SDR name] get credit?"
Correct Answer: Yes / No
Correct Rule: [ROE section name]
Distractors: [3 other plausible ROE sections]
Derrick's Belay: [1–2 sentence coaching explanation]
```
