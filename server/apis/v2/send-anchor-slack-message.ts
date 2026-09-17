import { api, z, slack, postgres } from "@superblocksteam/sdk-api";

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
  description: "Sends anchor failure Slack message to group DM with JT, manager, and belay buddy.",
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
    // 1. Fetch viewer info from DB
    const ViewerRow = z.object({
      email: z.string(),
      manager_email: z.string().nullable(),
      belay_buddy: z.string().nullable(),
    });
    const viewers = await ctx.integrations.apps_db.query(
      "SELECT email, manager_email, belay_buddy FROM cliptracker_v2_viewers WHERE id = $1",
      ViewerRow,
      [viewerId],
      { label: "Get viewer email/manager/belay buddy" }
    );
    if (viewers.length === 0) {
      return { success: false, channelId: null, recipientNames: [], error: "Viewer not found" };
    }
    const viewer = viewers[0];

    // 2. Look up Slack user IDs
    const recipientIds: string[] = [];
    const recipientNames: string[] = [];

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

    // 3. Open group DM
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

    // 4. Post the message
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

    return { success: true, channelId, recipientNames, error: null };
  },
});
