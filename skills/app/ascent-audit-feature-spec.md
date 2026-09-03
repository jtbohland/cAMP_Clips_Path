---
name: Ascent Audit Feature Spec
description: "Complete specification for the SME Content Audit system (Ascent
  Audit). Reference when building or modifying any part of the audit feature:
  registration, landing page, day audit view, admin dashboard, change tracking,
  or rollback."
accessType: on_demand
isEnabled: true
createdAt: 2026-09-03T14:52:20.169Z
---

# Ascent Audit — SME Content Audit System

## Purpose
SMEs audit all cAMP training content directly in the app instead of via Google Docs. Changes go live immediately with full tracking and rollback.

## Key Design Decisions

| Decision | Answer |
|---|---|
| **Topic scope** | One tile per day — SME audits everything on that day together |
| **Edit flow** | Live immediately + change log + rollback |
| **SME mapping** | All listed SMEs see & edit their assigned days; changes attributed per person |
| **Audit cycles** | Hybrid — quarterly cycles (Q4 2026, Q1 2027…) with preserved history + ad-hoc edits anytime |
| **Admin access** | "Ascent Audit" tab in Analytics (passcode-protected) |
| **SME access** | See all tiles, edit only their own assigned days |
| **Resource-only days** | Clear note to SME: "This is a resource-only training day — no video clip is attached" |
| **Clips** | Watch-only + notes + MP4 upload (no delete/remove) |
| **Tile organization** | One flat grid of ALL unique topics across all paths; shared clips appear once, path-specific clips labeled (e.g. "SDR Only") |

## SME Registration
- Add "Subject Matter Expert (SME)" to role dropdown
- When SME selected: **hide** region, belay buddy, timezone, Day 1 pacing fields — only collect name + email
- Button changes to "🍁 Start the Ascent Audit"
- SME viewers route to SME Landing Page (not Library)

## Content SMEs Can Audit

| Content | Storage | Edit capability |
|---|---|---|
| Summaries & Objectives | `cliptracker_v2_day_metadata` (migrated from topicDays.ts) | Read → Edit → Save |
| Trail Markers | `cliptracker_v2_questions` (is_recovery=false) | Read → Edit → Save |
| S&R Questions | `cliptracker_v2_questions` (is_recovery=true) | Read → Edit → Save |
| Weather the Storm | `cliptracker_v2_weather_storm` | Read → Edit → Save |
| cAMP Gear | `cliptracker_v2_clips.resources` JSONB | Review, check off, update links, remove outdated, add new |
| Clips (video) | `cliptracker_v2_clips.video_url` | Watch-only + notes + MP4 upload |
| Games (Price is Right, ROE) | `cliptracker_v2_price_scenarios`, `cliptracker_v2_ridge_scenarios` | Play to verify, then read → edit → save |

## Change Tracking & Rollback
- Every edit logged: who, what field, old value, new value, timestamp, cycle reference
- Each change is individually reversible by admin
- AI-generated change summary on SME sign-off

## Phases
- **Phase 1**: DB foundation, SME registration, landing page with tiles, read-only audit view, sign-off, admin tab
- **Phase 2**: Inline editing for questions/gear/WtS, change log with attribution + rollback
- **Phase 3**: Clip notes + MP4 upload, game play-to-verify, AI change summary
