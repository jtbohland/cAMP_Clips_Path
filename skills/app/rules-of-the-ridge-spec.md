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

### Crux Call (Confidence Wager — Real cAMP XP)

Set **after answering both parts, before seeing the result**. The SDR is wagering their **real cAMP XP** — gains and losses apply to their actual total and affect leaderboard position.

| Level | Label | If Right | If Wrong |
|-------|-------|----------|----------|
| ⛏️ | Cautious | +1 XP | −1 XP |
| ⛏️⛏️ | Confident | +2 XP | −1 XP |
| ⛏️⛏️⛏️ | Sending It | +3 XP | −2 XP |

**Range across 10 scenarios: −20 to +30 XP**

Every level has real stakes. There is no free play — even ⛏️ risks 1 XP per scenario.

### Scoring

Scoring is based on the Crux Call wager outcome. The two-part answer (Yes/No + Rule) determines **right vs. wrong** for the wager:

| Outcome | Crux Call Result |
|---------|------------------|
| Both parts correct (Yes/No + Rule) | RIGHT — earn XP per Crux level |
| Either part wrong | WRONG — lose XP per Crux level |

XP is added/subtracted from the SDR's **real cAMP total**. Net XP change across 10 scenarios determines the badge tier.

**Max possible gain:** +30 XP (all correct, all ⛏️⛏️⛏️)
**Max possible loss:** −20 XP (all wrong, all ⛏️⛏️⛏️)

### Running Ridge Score

Displayed in corner/header throughout the game. After each scenario resolves, points gained or lost animate into the tally. This makes the Crux Call a *strategic decision* — SDRs can see their running total and decide how much to risk.

### Derrick's Belay 🪢

When a wrong answer is revealed, show a coaching note:
- **"Derrick's Belay 🪢"** header
- 1–2 sentence explanation of why the correct answer applies
- References the specific ROE section

---

## Badges (Title = Badge)

Earned based on net XP change from the game. Five tiers:

| Net XP Range | Emoji | Badge Name |
|--------------|-------|------------|
| −20 to −1 | 🪢 | Whipper |
| 0 to +9 | 🪨 | Ridge Rookie |
| +10 to +19 | ⛏️ | Trail Judge |
| +20 to +26 | 🏔️ | ROE Enforcer |
| +27 to +30 | 🌄 | Summit Authority |

All five are added to the badge system alongside existing badges (speed_hiker, swiss_army_knife, etc.).

**Whipper** (🪢) — climbing term for taking a big fall but being caught by the rope. Light-hearted, not harsh.

---

## End Screen

After 10 scenarios, display:

1. **Net XP Change** (−20 to +30, shown prominently with + or − and color)
2. **Badge earned** (emoji + title, animated reveal)
3. **Crux Accuracy** — how well-calibrated their confidence was (% of high-confidence answers that were correct)
4. **ROE Section Breakdown** — which sections they nailed vs. stumbled on
5. **New cAMP XP Total** — updated total after gains/losses
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

- Real cAMP XP wagered — SDRs can gain up to +30 or lose up to −20
- Net XP change affects leaderboard position
- Update SDR max in XPlanation modal (+30 theoretical max)
- Update SDR cap on leaderboard (+30 theoretical max)
- AE max unchanged
- Ridge Replay has NO XP stakes — practice only

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
