import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getEffectiveClipTotal } from "./pacing-helpers.js";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time retroactive XP adjustment for the new Approach Accomplishment system:
 * 1. Awards +10 XP per completed approach module (meddpicc, challenger, camp101, wheel_deal)
 *    for all active (non-completed) learners who have module completions.
 * 2. Adjusts Peak Lift from 35 → 25 XP for learners who earned approach_complete.
 *
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING for XP inserts,
 * and the UPDATE is idempotent (35 → 25 only).
 */
export default api({
  name: "BackfillApproachModuleXP",
  description: "Retroactive XP: +10 per approach module, Peak Lift 35→25 adjustment",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    results: z.array(z.object({
      name: z.string(),
      modulesAwarded: z.number(),
      moduleXpAdded: z.number(),
      peakLiftAdjusted: z.boolean(),
      peakLiftDelta: z.number(),
    })),
    totalModuleXp: z.number(),
    totalPeakLiftReduction: z.number(),
  }),

  async run(ctx) {
    const results: Array<{
      name: string;
      modulesAwarded: number;
      moduleXpAdded: number;
      peakLiftAdjusted: boolean;
      peakLiftDelta: number;
    }> = [];

    // Sentinel clip for approach XP events (lowest sort_order live clip)
    const ClipIdSchema = z.object({ id: z.string() });
    const sentinelClip = await ctx.integrations.db.query(
      `SELECT id FROM cliptracker_v2_clips WHERE status = 'live' ORDER BY sort_order ASC LIMIT 1`,
      ClipIdSchema, [], { label: "Get sentinel clip" }
    );
    const approachClipId = sentinelClip[0]?.id;
    if (!approachClipId) {
      throw new Error("No live clip found for approach XP sentinel");
    }

    // Constants for total clips (to identify completed learners)
    const TOTAL_APPROACH_MODULES = 8;

    // Get all non-admin learners with their approach data + completion status
    const LearnerSchema = z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      clips_done: z.coerce.number(),
      approach_done: z.coerce.number(),
      max_sort_done: z.coerce.number(),
    });
    const learners = await ctx.integrations.db.query(
      `SELECT v.id, v.name, v.role,
        (SELECT COUNT(DISTINCT xe.clip_id)::int FROM cliptracker_v2_xp_events xe
         WHERE xe.viewer_id = v.id AND xe.source_id = 'watch') AS clips_done,
        (
          (SELECT COUNT(*)::int FROM cliptracker_v2_module_signoffs ms
           WHERE ms.viewer_id = v.id AND ms.module_key IN ('meddpicc', 'challenger'))
          +
          (SELECT COUNT(*)::int FROM cliptracker_v2_academy_screenshots acs
           WHERE acs.viewer_id = v.id AND acs.course_key IN ('analytics', 'experiment', 'session_replay', 'guides_surveys'))
          +
          (SELECT LEAST(COUNT(*)::int, 1) FROM cliptracker_v2_module_signoffs ms2
           WHERE ms2.viewer_id = v.id AND ms2.module_key = 'camp101')
          +
          (SELECT LEAST(COUNT(*)::int, 1) FROM cliptracker_v2_wd_verifications wd
           WHERE wd.viewer_id = v.id)
        ) AS approach_done,
        COALESCE((SELECT MAX(c.sort_order)::int FROM cliptracker_v2_sessions s JOIN cliptracker_v2_clips c ON c.id = s.clip_id WHERE s.viewer_id = v.id AND s.completed = true AND c.status = 'live'), 0) AS max_sort_done
      FROM cliptracker_v2_viewers v
      WHERE v.is_admin IS NOT TRUE
      ORDER BY v.name
      LIMIT 50`,
      LearnerSchema, [], { label: "Get all non-admin learners" }
    );

    // Filter to active learners only (not completed)
    const activeLearners = learners.filter(l => {
      const effectiveTotal = getEffectiveClipTotal(l.role, l.max_sort_done);
      const allComplete = l.clips_done >= effectiveTotal &&
        (l.approach_done >= TOTAL_APPROACH_MODULES || l.approach_done === 0);
      return !allComplete;
    });

    let totalModuleXp = 0;
    let totalPeakLiftReduction = 0;

    for (const learner of activeLearners) {
      let modulesAwarded = 0;
      let moduleXpAdded = 0;

      // Check completed modules for this learner
      const SignoffSchema = z.object({ module_key: z.string() });
      const signoffs = await ctx.integrations.db.query(
        `SELECT module_key FROM cliptracker_v2_module_signoffs WHERE viewer_id = $1`,
        SignoffSchema, [learner.id], { label: `Check signoffs: ${learner.name}` }
      );

      // Award XP for each signoff module (meddpicc, challenger, camp101)
      for (const s of signoffs) {
        try {
          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
             VALUES ($1, $2, 'base', $3, 10)
             ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
            [learner.id, approachClipId, `approach_module_${s.module_key}`],
            { label: `Award module XP: ${learner.name} - ${s.module_key}` }
          );
          modulesAwarded++;
          moduleXpAdded += 10;
        } catch (e) {
          ctx.log.info(`XP already exists: ${learner.name} - ${s.module_key}`);
        }
      }

      // Check W&D verification
      const WdSchema = z.object({ count: z.coerce.number() });
      const wdCheck = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_wd_verifications WHERE viewer_id = $1`,
        WdSchema, [learner.id], { label: `Check W&D: ${learner.name}` }
      );

      if (wdCheck[0]?.count > 0) {
        try {
          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
             VALUES ($1, $2, 'base', 'approach_module_wheel_deal', 10)
             ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
            [learner.id, approachClipId],
            { label: `Award module XP: ${learner.name} - wheel_deal` }
          );
          modulesAwarded++;
          moduleXpAdded += 10;
        } catch (e) {
          ctx.log.info(`XP already exists: ${learner.name} - wheel_deal`);
        }
      }

      // Adjust Peak Lift: 35 → 25 (reduce by 10)
      let peakLiftAdjusted = false;
      let peakLiftDelta = 0;

      const PeakLiftSchema = z.object({ xp_amount: z.coerce.number() });
      const peakLiftCheck = await ctx.integrations.db.query(
        `SELECT xp_amount FROM cliptracker_v2_xp_events
         WHERE viewer_id = $1 AND source_id = 'approach_complete' AND xp_amount = 35
         LIMIT 1`,
        PeakLiftSchema, [learner.id], { label: `Check Peak Lift: ${learner.name}` }
      );

      if (peakLiftCheck.length > 0) {
        await ctx.integrations.db.execute(
          `UPDATE cliptracker_v2_xp_events
           SET xp_amount = 25
           WHERE viewer_id = $1 AND source_id = 'approach_complete' AND xp_amount = 35`,
          [learner.id],
          { label: `Adjust Peak Lift 35→25: ${learner.name}` }
        );
        peakLiftAdjusted = true;
        peakLiftDelta = -10;
        totalPeakLiftReduction += 10;
      }

      totalModuleXp += moduleXpAdded;

      if (modulesAwarded > 0 || peakLiftAdjusted) {
        results.push({
          name: learner.name,
          modulesAwarded,
          moduleXpAdded,
          peakLiftAdjusted,
          peakLiftDelta,
        });
      }
    }

    ctx.log.info("Backfill complete", {
      learnersAffected: results.length,
      totalModuleXp,
      totalPeakLiftReduction,
    });

    return { results, totalModuleXp, totalPeakLiftReduction };
  },
});
