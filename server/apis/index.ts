/**
 * API Registry — all cAMP Ascent APIs registered for runtime discovery.
 */
import AutoLookupViewer from './v2/auto-lookup-viewer.js';
import CleanupDuplicateResponses from './v2/cleanup-duplicate-responses.js';
import CleanupDuplicateSessions from './v2/cleanup-duplicate-sessions.js';
import AwardXP from './v2/award-xp.js';
import BackfillBadges from './v2/backfill-badges.js';
import CompleteClipPath from './v2/complete-clip-path.js';
import EndSession from './v2/end-session.js';
import GetAdminClips from './v2/get-admin-clips.js';
import GetAnalyticsV2 from './v2/get-analytics.js';
import GetAnalyticsV3 from './v2/get-analytics-v3.js';
import MigrateClipLabels from './v2/migrate-clip-labels.js';
import GetClipForWatching from './v2/get-clip-for-watching.js';
import GetClipLibrary from './v2/get-clip-library.js';
import GetClipQuestions from './v2/get-clip-questions.js';
import GetClipReport from './v2/get-clip-report.js';
import GetPausedSession from './v2/get-paused-session.js';
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
import FixChrisXP from './v2/fix-chris-xp.js';
import FixChrisClip3 from './v2/fix-chris-clip3.js';
import ResetJTSessions from './v2/reset-jt-sessions.js';
import FixRecoveryFlags from './v2/fix-recovery-flags.js';
import SetupXpSchema from './v2/setup-xp-schema.js';
import StartSession from './v2/start-session.js';
import SubmitAnswer from './v2/submit-answer.js';
import UnlockClipForViewer from './v2/unlock-clip.js';
import SetupClipsSchemaV2 from './clips/setup-schema-v2.js';

const apis = {
  AutoLookupViewer,
  AwardXP,
  BackfillBadges,
  CleanupDuplicateResponses,
  CleanupDuplicateSessions,
  CompleteClipPath,
  EndSession,
AddInitialEngagementColumn,
AddWatchedSecondsColumn,
FixChrisXP,
FixChrisClip3,
FixRecoveryFlags,
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
} as const;

export default apis;

/** Type for useApi inference — exported for client type-only imports */
export type ApiRegistry = typeof apis;
