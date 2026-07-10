---
name: Question Writing Standards
description: "Rules and conventions for writing trail marker and S&R questions:
  content-specific from transcript, 4 equally plausible options, identical
  feedback explanations, accuracy above all, timestamp placement from SRT, and
  structural patterns."
accessType: on_demand
isEnabled: true
createdAt: 2026-07-10T20:21:37.855Z
---

## cAMP Question Writing Standards

### Core Philosophy
Every question should test whether the learner was **paying attention to the specific content** — not whether they can guess the right answer from general knowledge. A learner who watched the clip carefully should get it right. A learner who skimmed or zoned out should find all four options equally plausible.

### The Rules

**1. Content-specific, never general knowledge**
- Questions must reference what a **specific SME said** in the clip — by name when possible ("Michele explained...", "Matt described...")
- The correct answer should only be knowable from watching the video, not from prior sales experience or common sense
- Avoid questions that could be answered by reading a generic sales playbook

**2. Four equally plausible options**
- All four options should sound like something that *could* have been said in the clip
- Wrong answers should use realistic terminology, plausible structures, and the same level of specificity as the correct answer
- No throwaway options — if a learner can eliminate 2 options by instinct, the question is too easy
- Wrong options should be the same approximate length and detail as the correct one

**3. Identical detailed explanation in both correct AND incorrect feedback**
- The explanation text is word-for-word the same — only the emoji/label wrapper differs:
  - ✅ `{"emoji": "🌲", "label": "Forest Preserver! Correct:", "explanation": "..."}`
  - ❌ `{"emoji": "🔥", "label": "Fire Starter! Incorrect:", "explanation": "..."}`
- The explanation should teach — not just confirm. It recaps what the SME actually said, often with direct quotes or near-quotes, so the learner walks away understanding the content regardless of whether they got it right

**4. Accuracy above all**
- Every claim in the correct answer and explanation must be verifiable against the transcript
- If unsure about a detail, go back to the transcript — don't paraphrase loosely
- SME names, specific numbers, exact terminology, and framework names must be precise

**5. Trail markers vs S&R questions**
- **Trail markers** (`is_recovery = false`): Fire at specific timestamps during the video. Test content the learner just watched. `trigger_at_seconds` is set to fire AFTER the relevant section concludes
- **S&R questions** (`is_recovery = true`): Fire only when engagement score drops below threshold. `trigger_at_seconds = 0` always. Cover broader clip themes — still content-specific but can reference content from anywhere in the clip

**6. Timestamp placement (trail markers only)**
- Use the SRT transcript timestamps to verify exactly when content is discussed
- Place the trigger AFTER the section wraps — not in the middle of it
- Space markers roughly evenly through the video so they don't cluster
- The learner needs to have heard the full answer before the question fires

**7. Question structure patterns that work**
- "SME described X. What is Y?" — tests recall of a specific framework, list, or distinction
- "SME explained the difference between A and B. What is the key distinction?" — tests comprehension
- "SME laid out steps for doing X. What are they?" — tests process recall
- Avoid yes/no framing or "which of these is NOT..." patterns

**8. Sort order**
- Trail markers numbered sequentially within each clip (sort_order 1, 2, 3...)
- S&R questions also numbered sequentially (sort_order 1, 2, 3...)
- Sort order determines display order within their respective contexts

**9. Correct option position**
- Frontend uses Fisher-Yates shuffle on display, so `correct_option` position in DB doesn't matter to the learner
- Convention: correct_option = 1 (0-indexed, second option in the stored array)
