import { api, z, slack, postgres } from "@superblocksteam/sdk-api";
import { getTotalWeekdays, getEffectiveClipTotal } from "./pacing-helpers.js";

/** Summit Day = start + role weekdays + extension days (weekends skipped). */
function computeSummitDay(ascentDay1: string, role: string, extensionDays: number): Date {
  const [y, m, d] = ascentDay1.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  const total = getTotalWeekdays(role) + extensionDays;
  let counted = 0;
  while (counted < total) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) counted++;
  }
  return cursor;
}

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const SLACK_GRID = "a0ceb4b5-aa7d-4f85-b9c6-a54690421997";
const JT_EMAIL = "jt.bohland@amplitude.com";

/* ── Slack response schemas ─────────────────────────────────────────── */

const LookupByEmailSchema = z.object({
  user: z.object({ id: z.string(), real_name: z.string().optional() }),
});

const UsersListSchema = z.object({
  members: z.array(
    z.object({
      id: z.string(),
      real_name: z.string().optional(),
      profile: z.object({ display_name: z.string().optional() }).optional(),
      deleted: z.boolean().optional(),
    })
  ),
  response_metadata: z.object({ next_cursor: z.string().optional() }).optional(),
});

const ConvOpenSchema = z.object({
  channel: z.object({ id: z.string() }),
});

const PostMsgSchema = z.object({
  channel: z.string(),
  ts: z.string(),
});

/* ── Helper: look up Slack user by email ────────────────────────────── */

async function lookupByEmail(
  slackClient: any,
  email: string,
  label: string
): Promise<string | null> {
  const res = await slackClient.apiRequest(
    { method: "GET", path: "/users.lookupByEmail", params: { email } },
    { response: LookupByEmailSchema },
    { label }
  );
  if (!res.ok) return null;
  return res.user.id;
}

/* ── Helper: search user by display name (paginated) ────────────────── */

async function findByName(
  slackClient: any,
  displayName: string
): Promise<string | null> {
  const target = displayName.toLowerCase().trim();
  let cursor: string | undefined;
  let pages = 0;

  do {
    const res = await slackClient.apiRequest(
      {
        method: "GET",
        path: "/users.list",
        params: { limit: 200, ...(cursor ? { cursor } : {}) },
      },
      { response: UsersListSchema },
      { label: `Search for belay buddy: ${displayName} (page ${pages + 1})` }
    );
    if (!res.ok) return null;

    for (const m of res.members) {
      if (m.deleted) continue;
      const realMatch = m.real_name?.toLowerCase().trim() === target;
      const displayMatch = m.profile?.display_name?.toLowerCase().trim() === target;
      if (realMatch || displayMatch) return m.id;
    }
    cursor = res.response_metadata?.next_cursor || undefined;
    pages++;
  } while (cursor && pages < 10); // safety cap

  return null;
}

/* ── Main API ───────────────────────────────────────────────────────── */

export default api({
  name: "SendAnchorSlackMessage",
  description: "Sends a missed-Summit Slack to the camper, JT, manager and belay buddy, with eligibility checks.",
  integrations: {
    slack_grid: slack(SLACK_GRID),
    apps_db: postgres(APPS_DB),
  },
  input: z.object({
    viewerId: z.string(),
    message: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
    channelId: z.string().nullable(),
    recipientNames: z.array(z.string()),
    error: z.string().nullable(),
  }),

  async run(ctx, { viewerId, message }) {
    const blocked = (error: string) => {
      ctx.log.warn("Anchor Slack blocked", { viewerId, reason: error });
      return { success: false, channelId: null, recipientNames: [] as string[], error };
    };

    // 1. Fetch viewer info from DB
    const ViewerRow = z.object({
      email: z.string(),
      role: z.string(),
      ascent_day_1: z.string().nullable(),
      extension_days: z.coerce.number(),
      first_achievement_shown: z.boolean(),
      manager_email: z.string().nullable(),
      belay_buddy: z.string().nullable(),
    });
    const viewers = await ctx.integrations.apps_db.query(
      `SELECT email, role, ascent_day_1::text,
              COALESCE(extension_days, 0)::int AS extension_days,
              COALESCE(first_achievement_shown, false) AS first_achievement_shown,
              manager_email, belay_buddy
       FROM cliptracker_v2_viewers WHERE id = $1`,
      ViewerRow,
      [viewerId],
      { label: "Get viewer details" }
    );
    if (viewers.length === 0) return blocked("Viewer not found");
    const viewer = viewers[0];

    // 2. Guard: only the camper themselves can send their own message
    const callerEmail = (ctx.user.email ?? "").toLowerCase();
    if (!callerEmail || callerEmail !== viewer.email.toLowerCase()) {
      return blocked("Only the camper can send this message.");
    }

    // 3. Guard: confirmed completers are locked — never send
    const CompletionRow = z.object({
      summit_sent: z.boolean(),
      clips_done: z.coerce.number(),
    });
    const completion = await ctx.integrations.apps_db.query(
      `WITH me AS (SELECT id, role FROM cliptracker_v2_viewers WHERE id = $1)
       SELECT
         EXISTS(SELECT 1 FROM cliptracker_v2_checkin_emails WHERE viewer_id = $1 AND checkin_type = 'summit') AS summit_sent,
         (SELECT COUNT(*) FROM (
            SELECT s.clip_id FROM cliptracker_v2_sessions s
              JOIN cliptracker_v2_clips c ON c.id = s.clip_id JOIN me ON me.id = s.viewer_id
             WHERE s.completed AND c.status = 'live' AND (c.roles IS NULL OR c.roles @> to_jsonb(me.role))
            UNION
            SELECT x.clip_id FROM cliptracker_v2_xp_events x
              JOIN cliptracker_v2_clips c ON c.id = x.clip_id JOIN me ON me.id = x.viewer_id
             WHERE x.event_type = 'swiss_army_knife' AND c.status = 'live' AND (c.roles IS NULL OR c.roles @> to_jsonb(me.role))
         ) done) AS clips_done`,
      CompletionRow,
      [viewerId],
      { label: "Check completion status" }
    );
    const summitSent = completion[0]?.summit_sent ?? false;
    const clipsDone = completion[0]?.clips_done ?? 0;
    const pathTotal = getEffectiveClipTotal(viewer.role, 0);
    const confirmedCompleter = summitSent
      || (viewer.first_achievement_shown && clipsDone >= pathTotal - 1)
      || clipsDone >= pathTotal;
    if (confirmedCompleter) {
      return blocked("Camper has already completed Ascent.");
    }

    // 4. Guard: Summit Day must actually have passed
    if (!viewer.ascent_day_1) return blocked("Camper has no Ascent start date.");
    const summitDay = computeSummitDay(viewer.ascent_day_1, viewer.role, viewer.extension_days);
    const nowUtc = new Date();
    const today = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));
    if (today <= summitDay) {
      return blocked("Summit Day has not passed yet.");
    }

    // 5. Look up Slack user IDs
    const recipientIds: string[] = [];
    const recipientNames: string[] = [];

    // Camper (always — so they are on the thread)
    const camperId = await lookupByEmail(ctx.integrations.slack_grid, viewer.email, "Lookup camper");
    if (!camperId) {
      return blocked("Could not find the camper in Slack.");
    }
    recipientIds.push(camperId);
    recipientNames.push(viewer.email);

    // JT (always)
    const jtId = await lookupByEmail(ctx.integrations.slack_grid, JT_EMAIL, "Lookup JT");
    if (jtId) {
      recipientIds.push(jtId);
      recipientNames.push("JT Bohland");
    }

    // Manager (by email)
    if (viewer.manager_email) {
      const mgrId = await lookupByEmail(
        ctx.integrations.slack_grid,
        viewer.manager_email,
        "Lookup manager"
      );
      if (mgrId) {
        recipientIds.push(mgrId);
        recipientNames.push(viewer.manager_email);
      }
    }

    // Belay buddy (by display name — best effort)
    if (viewer.belay_buddy) {
      const bbId = await findByName(ctx.integrations.slack_grid, viewer.belay_buddy);
      if (bbId) {
        recipientIds.push(bbId);
        recipientNames.push(viewer.belay_buddy);
      } else {
        ctx.log.warn(`Could not find belay buddy "${viewer.belay_buddy}" in Slack`);
      }
    }

    if (recipientIds.length === 0) {
      return {
        success: false,
        channelId: null,
        recipientNames: [],
        error: "Could not find any recipients in Slack",
      };
    }

    // 6. Open group DM
    const convRes = await ctx.integrations.slack_grid.apiRequest(
      {
        method: "POST",
        path: "/conversations.open",
        body: { users: recipientIds.join(","), return_im: true },
      },
      { response: ConvOpenSchema },
      { label: "Open group DM" }
    );
    if (!convRes.ok) {
      return {
        success: false,
        channelId: null,
        recipientNames,
        error: `Failed to open DM: ${convRes.error}`,
      };
    }
    const channelId = convRes.channel.id;

    // 7. Post the message
    const postRes = await ctx.integrations.slack_grid.apiRequest(
      {
        method: "POST",
        path: "/chat.postMessage",
        body: {
          channel: channelId,
          text: message,
          mrkdwn: true,
          icon_emoji: ":camping:",
          username: "cAMP Ascent",
        },
      },
      { response: PostMsgSchema },
      { label: "Post anchor failure message" }
    );
    if (!postRes.ok) {
      return {
        success: false,
        channelId,
        recipientNames,
        error: `Failed to post message: ${postRes.error}`,
      };
    }

    // 8. Audit log — every send is recorded
    await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
       VALUES ('anchor_slack_sent', 'viewer', $1, $2, $3)`,
      [
        viewerId,
        callerEmail,
        JSON.stringify({ channelId, recipients: recipientNames, summitDay: summitDay.toISOString().slice(0, 10), clipsDone, pathTotal }),
      ],
      { label: "Log anchor Slack send" }
    );

    return { success: true, channelId, recipientNames, error: null };
  },
});
