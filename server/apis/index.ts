/**
 * API Registry — all cAMP Ascent APIs registered for runtime discovery.
 */
import AutoLookupViewer from './v2/auto-lookup-viewer.js';
import CleanupDuplicateResponses from './v2/cleanup-duplicate-responses.js';
import CleanupDuplicateSessions from './v2/cleanup-duplicate-sessions.js';
import AwardXP from './v2/award-xp.js';
import BackfillBadges from './v2/backfill-badges.js';
import BackfillTimezones from './v2/backfill-timezones.js';
import CompleteClipPath from './v2/complete-clip-path.js';
import EndSession from './v2/end-session.js';
import GetAdminClips from './v2/get-admin-clips.js';
import GetAnalyticsV2 from './v2/get-analytics.js';
import GetAnalyticsV3 from './v2/get-analytics-v3.js';
import GetWeek1Analytics from './v2/get-week1-analytics.js';
import MigrateClipLabels from './v2/migrate-clip-labels.js';
import GetClipForWatching from './v2/get-clip-for-watching.js';
import GetClipLibrary from './v2/get-clip-library.js';
import GetClipQuestions from './v2/get-clip-questions.js';
import GetClipReport from './v2/get-clip-report.js';
import GetPausedSession from './v2/get-paused-session.js';
import GetPitchClicks from './v2/get-pitch-clicks.js';
import GetLearnerProgress from './v2/get-learner-progress.js';
import GetViewers from './v2/get-viewers.js';
import GetWeatherStorm from './v2/get-weather-storm.js';
import LookupViewer from './v2/lookup-viewer.js';
import PauseSession from './v2/pause-session.js';
import PopulateResources from './v2/populate-resources.js';
import RegisterViewer from './v2/register-viewer.js';
import AdminRecoverSession from './v2/admin-recover-session.js';
import ResetViewerSessions from './v2/reset-viewer-sessions.js';
import ResetSession from './v2/reset-session.js';
import SaveClip from './v2/save-clip.js';
import SaveQuestions from './v2/save-questions.js';
import SeedContentV2 from './v2/seed-content.js';

import SeedQuestionsBatch from './v2/seed-questions-batch.js';
import SeedQuestionsFromFiles from './v2/seed-questions-from-files.js';
import SetViewerAdmin from './v2/set-viewer-admin.js';
import AddInitialEngagementColumn from './v2/add-initial-engagement-column.js';
import AddWatchedSecondsColumn from './v2/add-watched-seconds-column.js';
import AddLowVolumeColumn from './v2/add-low-volume-column.js';
import FixChrisXP from './v2/fix-chris-xp.js';
import FixKabirDoubleSummit from './v2/fix-kabir-double-summit.js';
import BackfillFeedback from './v2/backfill-feedback.js';
import BackfillManagers from './v2/backfill-managers.js';
import FixChrisClip3 from './v2/fix-chris-clip3.js';
import ResetJTSessions from './v2/reset-jt-sessions.js';
import AddManagerColumns from './v2/add-manager-columns.js';
import CreatePitchClicksTable from './v2/create-pitch-clicks-table.js';
import FixRecoveryFlags from './v2/fix-recovery-flags.js';
import LogPitchClick from './v2/log-pitch-click.js';
import SetupXpSchema from './v2/setup-xp-schema.js';
import StartSession from './v2/start-session.js';
import SubmitAnswer from './v2/submit-answer.js';
import UnlockClipForViewer from './v2/unlock-clip.js';
import SetupClipsSchemaV2 from './clips/setup-schema-v2.js';
import SetupPodcastSchema from './v2/setup-podcast-schema.js';
import TrackPodcastProgress from './v2/track-podcast-progress.js';
import GetPodcastProgress from './v2/get-podcast-progress.js';
import AwardPodcastXp from './v2/award-podcast-xp.js';
import FixGabiDate from './v2/fix-gabi-date.js';
import FixKabirDate from './v2/fix-kabir-date.js';
import FixBenChrisDates from './v2/fix-ben-chris-dates.js';
import AddBelayBuddyColumn from './v2/add-belay-buddy-column.js';
import RemoveDealDeskZoomClips from './v2/remove-deal-desk-zoom-clips.js';
import SetupTopicDays from './v2/setup-topic-days.js';
import TrackResourceClick from './v2/track-resource-click.js';
import GetResourceProgress from './v2/get-resource-progress.js';
import MigrateTimezoneDayLabels from './v2/migrate-timezone-daylabels.js';
import SetupWeek1Schema from './v2/setup-week1-schema.js';
import GetWeek1Progress from './v2/get-week1-progress.js';
import SubmitModuleSignoff from './v2/submit-module-signoff.js';
import SubmitAcademyScreenshot from './v2/submit-academy-screenshot.js';
import SubmitWdVerification from './v2/submit-wd-verification.js';
import UnlockAscent from './v2/unlock-ascent.js';
import SetupCheckinSchema from './v2/setup-checkin-schema.js';
import GetCheckinStatus from './v2/get-checkin-status.js';
import MarkCheckinSent from './v2/mark-checkin-sent.js';
import GetCheckinEmailData from './v2/get-checkin-email-data.js';
import MarkFirstAchievement from './v2/mark-first-achievement.js';
import SubmitTopicReflection from './v2/submit-topic-reflection.js';
import GetTopicReflections from './v2/get-topic-reflections.js';
import SubmitManagerFeedback from './v2/submit-manager-feedback.js';
import GetManagerFeedback from './v2/get-manager-feedback.js';
import GetSherpaSurveys from './v2/get-sherpa-surveys.js';
import GetLearnerReflections from './v2/get-learner-reflections.js';
import SetupCheckinColumn from './v2/setup-checkin-column.js';
import SetupLoginTracking from './v2/setup-login-tracking.js';
import TrackLogin from './v2/track-login.js';
import BackfillLastLogin from './v2/backfill-last-login.js';
import FixCustomerStoriesQuestion from './v2/fix-customer-stories-question.js';
import AdminFixBenSpekit from './v2/admin-fix-ben-spekit.js';
import CleanupFirstPassXP from './v2/cleanup-first-pass-xp.js';


const apis = {
  AutoLookupViewer,
  AwardXP,
  BackfillBadges,
  BackfillTimezones,
  CleanupDuplicateResponses,
  CleanupDuplicateSessions,
  CompleteClipPath,
  EndSession,
AddInitialEngagementColumn,
AddManagerColumns,
AddWatchedSecondsColumn,
AddLowVolumeColumn,
BackfillFeedback,
BackfillManagers,
FixChrisXP,
FixKabirDoubleSummit,
FixChrisClip3,
CreatePitchClicksTable,
FixRecoveryFlags,
LogPitchClick,
ResetJTSessions,
  GetAdminClips,
  GetAnalyticsV2,
  GetAnalyticsV3,
  MigrateClipLabels,
  GetClipForWatching,
  GetClipLibrary,
  GetClipQuestions,
  GetClipReport,
  GetPausedSession,
  GetPitchClicks,
  GetLearnerProgress,
  GetViewers,
  GetWeatherStorm,
  LookupViewer,
  PauseSession,
  PopulateResources,
  AdminRecoverSession,
  RegisterViewer,
  ResetViewerSessions,
  ResetSession,
  SaveClip,
  SaveQuestions,
  SeedContentV2,

  SeedQuestionsBatch,
  SeedQuestionsFromFiles,
  SetViewerAdmin,
  SetupXpSchema,
  StartSession,
  SubmitAnswer,
  UnlockClipForViewer,
  SetupClipsSchemaV2,
  SetupPodcastSchema,
  TrackPodcastProgress,
  GetPodcastProgress,
  AwardPodcastXp,
  FixGabiDate,
  FixKabirDate,
  FixBenChrisDates,
  AddBelayBuddyColumn,
  RemoveDealDeskZoomClips,
  SetupTopicDays,
  TrackResourceClick,
  GetResourceProgress,
  MigrateTimezoneDayLabels,
  SetupWeek1Schema,
  GetWeek1Progress,
  SubmitModuleSignoff,
  SubmitAcademyScreenshot,
  SubmitWdVerification,
  UnlockAscent,
  GetWeek1Analytics,
  SetupCheckinSchema,
  GetCheckinStatus,
  MarkCheckinSent,
  GetCheckinEmailData,
  MarkFirstAchievement,
  SubmitTopicReflection,
  GetTopicReflections,
  SubmitManagerFeedback,
  GetManagerFeedback,
  GetSherpaSurveys,
  GetLearnerReflections,
  SetupCheckinColumn,
  SetupLoginTracking,
  TrackLogin,
  BackfillLastLogin,
  FixCustomerStoriesQuestion,
  AdminFixBenSpekit,
  CleanupFirstPassXP,
} as const;

export default apis;

/** Type for useApi inference — exported for client type-only imports */
export type ApiRegistry = typeof apis;
