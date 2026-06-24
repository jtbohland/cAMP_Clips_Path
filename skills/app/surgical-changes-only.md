---
name: Surgical Changes Only
description: When making code changes, only modify what's directly needed for
  the task at hand. Avoid touching unrelated systems, causing chain reactions,
  or fixing things that aren't broken.
accessType: on_demand
isEnabled: true
createdAt: 2026-06-24T18:12:54.747Z
---

## Surgical Changes Only

- **Only modify code directly related to the current task** — do not touch adjacent systems
- **Never cause chain reactions** — if a fix requires changes outside the task scope, stop and confirm with JT first
- **Don't fix what isn't broken** — if something works, leave it alone even if it could be "improved"
- **Move intentionally and thoughtfully** — this is a live app with real users (Chris, Ben, Kabir)
- **Test changes in isolation** — verify the specific thing changed, don't run broad refactors
