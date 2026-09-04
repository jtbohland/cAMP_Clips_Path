import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Central save API for all audit edits.
 * Handles: summary, objectives, trail markers, S&R, WtS, cAMP Gear, clip notes.
 * Every edit is logged to the changelog with old/new values for rollback.
 */

export default api({
  name: "SaveAuditContent",
  description: "Saves an SME edit and logs it to the audit changelog",
  integrations: { apps_db: postgres(APPS_DB) },

  input: z.object({
    viewerId: z.string(),
    viewerName: z.string(),
    topicKey: z.string(),
    editType: z.enum([
      "summary", "objectives", "question", "weather_storm",
      "gear_update", "gear_remove", "gear_add", "clip_notes",
      "academy_notes", "wheel_notes", "smes", "clip_summary", "clip_objectives", "video_link",
      "game_scenario_edit",
    ]),
    // For summary/objectives edits
    fieldName: z.string().nullable(),
    oldValue: z.string().nullable(),
    newValue: z.string().nullable(),
    // For question edits (trail marker / S&R)
    questionId: z.string().nullable(),
    // For gear edits
    clipId: z.string().nullable(),
    gearIndex: z.number().nullable(),
    // For gear_add
    gearLabel: z.string().nullable(),
    gearUrl: z.string().nullable(),
    gearType: z.string().nullable(),
  }),

  output: z.object({ success: z.boolean(), changeId: z.string().nullable() }),

  async run(ctx, input) {
    const {
      viewerId, viewerName, topicKey, editType,
      fieldName, oldValue, newValue,
      questionId, clipId, gearIndex,
      gearLabel, gearUrl, gearType,
    } = input;

    // 1. Perform the actual edit
    switch (editType) {
      case "summary": {
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_day_metadata SET summary = $1 WHERE topic_key = $2`,
          [newValue, topicKey],
          { label: "Update summary" }
        );
        break;
      }
      case "objectives": {
        // newValue is JSON array string
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_day_metadata SET learning_objectives = $1::jsonb WHERE topic_key = $2`,
          [newValue, topicKey],
          { label: "Update objectives" }
        );
        break;
      }
      case "question": {
        // fieldName = "question_text" | "option_a" | "option_b" | "option_c" | "option_d" | "correct_option" | "correct_feedback"
        if (!questionId || !fieldName) throw new Error("questionId and fieldName required");
        const safeColumns = ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "correct_feedback"];
        if (!safeColumns.includes(fieldName)) throw new Error(`Invalid column: ${fieldName}`);
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_questions SET ${fieldName} = $1 WHERE id = $2`,
          [newValue, questionId],
          { label: `Update question ${fieldName}` }
        );
        break;
      }
      case "weather_storm": {
        // fieldName = "overview" or "takeaways" (JSON array)
        if (!clipId || !fieldName) throw new Error("clipId and fieldName required");
        if (fieldName === "overview") {
          await ctx.integrations.apps_db.execute(
            `UPDATE cliptracker_v2_weather_storm SET overview = $1 WHERE clip_id = $2`,
            [newValue, clipId],
            { label: "Update WtS overview" }
          );
        } else if (fieldName === "takeaways") {
          await ctx.integrations.apps_db.execute(
            `UPDATE cliptracker_v2_weather_storm SET takeaways = $1::jsonb WHERE clip_id = $2`,
            [newValue, clipId],
            { label: "Update WtS takeaways" }
          );
        }
        break;
      }
      case "gear_update": {
        if (!clipId || gearIndex === null || gearIndex === undefined) throw new Error("clipId and gearIndex required");
        // Update a specific gear item's label and url
        const parsed = JSON.parse(newValue ?? "{}");
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_clips
           SET resources = jsonb_set(jsonb_set(resources, ARRAY[$1::text, 'label'], to_jsonb($2::text)), ARRAY[$1::text, 'url'], to_jsonb($3::text))
           WHERE id = $4`,
          [String(gearIndex), parsed.label ?? "", parsed.url ?? "", clipId],
          { label: "Update gear item" }
        );
        break;
      }
      case "gear_remove": {
        if (!clipId || gearIndex === null || gearIndex === undefined) throw new Error("clipId and gearIndex required");
        // Remove gear item at index by rebuilding array without that index
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_clips
           SET resources = (
             SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
             FROM jsonb_array_elements(resources) WITH ORDINALITY AS t(elem, idx)
             WHERE t.idx != ($1::int + 1)
           )
           WHERE id = $2`,
          [gearIndex, clipId],
          { label: "Remove gear item" }
        );
        break;
      }
      case "gear_add": {
        if (!clipId) throw new Error("clipId required");
        const newGear = JSON.stringify({ label: gearLabel, type: gearType ?? "link", url: gearUrl });
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_clips SET resources = COALESCE(resources, '[]'::jsonb) || $1::jsonb WHERE id = $2`,
          [`[${newGear}]`, clipId],
          { label: "Add gear item" }
        );
        break;
      }
      case "clip_notes":
      case "academy_notes":
      case "wheel_notes":
      case "smes":
      case "clip_summary":
      case "clip_objectives":
      case "video_link":
      case "game_scenario_edit": {
        // Store in the changelog only (no table column needed)
        break;
      }
    }

    // 2. Log to changelog
    const changeIdResult = await ctx.integrations.apps_db.query(
      `INSERT INTO cliptracker_v2_audit_changelog (topic_key, viewer_id, entity_type, entity_id, field_name, old_value, new_value, change_type)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
       RETURNING id::text`,
      z.object({ id: z.string() }),
      [
        topicKey, viewerId, editType,
        questionId ?? clipId ?? topicKey,
        fieldName ?? editType,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        editType.startsWith("gear_remove") ? "remove" : editType.startsWith("gear_add") ? "add" : "update",
      ],
      { label: "Log changelog entry" }
    );

    return { success: true, changeId: changeIdResult[0]?.id ?? null };
  },
});
