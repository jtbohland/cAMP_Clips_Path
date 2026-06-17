/**
 * API Registry — all cAMP Ascent APIs registered for runtime discovery.
 */
import AutoLookupViewer from './v2/auto-lookup-viewer.js';
import AwardXP from './v2/award-xp.js';
import CompleteClipPath from './v2/complete-clip-path.js';
import EndSession from './v2/end-session.js';
import GetAdminClips from './v2/get-admin-clips.js';
import GetAnalyticsV2 from './v2/get-analytics.js';
import GetClipForWatching from './v2/get-clip-for-watching.js';
import GetClipLibrary from './v2/get-clip-library.js';
import GetClipQuestions from './v2/get-clip-questions.js';
import GetLearnerProgress from './v2/get-learner-progress.js';
import GetViewers from './v2/get-viewers.js';
import GetWeatherStorm from './v2/get-weather-storm.js';
import LookupViewer from './v2/lookup-viewer.js';
import RegisterViewer from './v2/register-viewer.js';
import SaveClip from './v2/save-clip.js';
import SaveQuestions from './v2/save-questions.js';
import SeedContentV2 from './v2/seed-content.js';
import SeedQuestionsBatch from './v2/seed-questions-batch.js';
import SeedQuestionsFromFiles from './v2/seed-questions-from-files.js';
import SetViewerAdmin from './v2/set-viewer-admin.js';
import SetupXpSchema from './v2/setup-xp-schema.js';
import StartSession from './v2/start-session.js';
import SubmitAnswer from './v2/submit-answer.js';
import UnlockClipForViewer from './v2/unlock-clip.js';
import SetupClipsSchemaV2 from './clips/setup-schema-v2.js';

const apis = {
  AutoLookupViewer,
  AwardXP,
  CompleteClipPath,
  EndSession,
  GetAdminClips,
  GetAnalyticsV2,
  GetClipForWatching,
  GetClipLibrary,
  GetClipQuestions,
  GetLearnerProgress,
  GetViewers,
  GetWeatherStorm,
  LookupViewer,
  RegisterViewer,
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
