---
name: S&R Unlock Logic
description: "How Search & Rescue unlocks the next clip: the S&R quiz score
  (≥80%) is the gate, NOT the recalculated overall engagement score. This is a
  foundational rule that must never be changed without explicit JT approval."
accessType: on_demand
isEnabled: true
createdAt: 2026-06-25T13:28:08.311Z
---

## S&R Unlock Logic — FOUNDATIONAL RULE

**Do NOT modify this logic without explicit JT approval. If any change will affect this flow, NOTIFY JT first.**

### The Flow
1. **1st attempt overall engagement < 80%** → triggers Search & Rescue
2. **S&R Quiz score ≥ 80%** → **UNLOCKS next clip** + shows Review Ranger Report on tile
3. **S&R Quiz score < 80%** → triggers Weather Storm (WtS)

### Key Distinction
- **What unlocks the next clip:** The S&R quiz score alone (≥ 80% = pass)
- **What appears on the Ranger Report:** The recalculated overall engagement score (S&R answers factored into question component 25% + focus 30% + time 45%)
- The recalculated engagement is for **honest display only** — it is NOT the unlock gate

### Why
If someone gets 20% engagement on first attempt, then passes S&R at 80%... the recalculated overall would still be very low (time/focus dragging it down). Using that as the unlock gate would falsely trigger WtS on someone who demonstrated knowledge recovery. S&R is the reward mechanism for improvement; the engagement score stays honest on the report.

### Summary Table
| Decision | Based On |
|---|---|
| Trigger S&R | Overall engagement < 80% |
| Unlock next clip | S&R quiz score ≥ 80% |
| Trigger WtS | S&R quiz score < 80% |
| Ranger Report display | Recalculated overall engagement (honest) |
