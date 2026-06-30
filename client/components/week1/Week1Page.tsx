import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";
import ModuleCard from "./ModuleCard";
import AcademyScreenshotSlots from "./AcademyScreenshotSlots";
import Camp101Signoff from "./Camp101Signoff";
import ChallengerCard from "./ChallengerCard";
import WheelDealCard from "./WheelDealCard";
import ApproachManifesto from "./ApproachManifesto";

// Reflection prompts
const MEDDPICC_REFLECTION = "Which letter of MEDDPICC is the biggest gap in how you've sold before, and what will you do differently here?";

// Shuffled cAMP 101 reflection — random combo of Product × Persona × Industry
const CAMP101_PRODUCTS = ["Analytics", "Experimentation", "Session Replay", "Guides & Surveys"];
const CAMP101_PERSONAS = ["CPO", "VP of Product", "Head of Data", "Head of Growth", "VP Engineering"];
const CAMP101_INDUSTRIES = ["Fintech", "E-commerce", "SaaS", "Media & Entertainment", "Healthcare"];

function getShuffledCamp101Prompt(viewerId: string): string {
  // Deterministic shuffle based on viewerId so it's consistent per learner
  const hash = viewerId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const product = CAMP101_PRODUCTS[hash % CAMP101_PRODUCTS.length];
  const persona = CAMP101_PERSONAS[(hash * 7) % CAMP101_PERSONAS.length];
  const industry = CAMP101_INDUSTRIES[(hash * 13) % CAMP101_INDUSTRIES.length];
  return `You're pitching ${product} to a ${persona} at a ${industry} company. In one sentence, why should they care?`;
}

const CHALLENGER_REFLECTION_INTRO = "Describe one commercial insight you could bring to your contact that reframes how they see their business — not just their analytics.";

// Academy courses
const ACADEMY_COURSES = [
  { key: "analytics", label: "Analytics", url: "https://academy.amplitude.com/amplitude-getting-started-with-analytics" },
  { key: "experiment", label: "Experiment", url: "https://academy.amplitude.com/getting-started-with-amplitude-experiment-learning-path" },
  { key: "session_replay", label: "Session Replay", url: "https://academy.amplitude.com/contextualize-user-experience-with-session-replay" },
  { key: "guides_surveys", label: "Guides & Surveys", url: "https://academy.amplitude.com/engage-your-users-with-guides-and-surveys" },
];

type UnlockResult = {
  alreadyUnlocked: boolean;
  earnedBadge: boolean;
  earnedXp: number;
};

type Week1PageProps = {
  viewerId: string;
  viewerName: string;
  isAdmin?: boolean;
  onBeginAscent: (unlockResult?: UnlockResult) => void;
};

export default function Week1Page({ viewerId, viewerName, isAdmin, onBeginAscent }: Week1PageProps) {
  const navigate = useNavigate();
  // Admin "Test as New Learner" toggle — resets view to fresh state
  const [testMode, setTestMode] = useState(false);

  const { data: rawData, loading, refetch } = useApiData(
    "GetWeek1Progress",
    { viewerId },
    { enabled: !!viewerId }
  );

  // In test mode, override progress to show empty/fresh state
  const data = useMemo(() => {
    if (!testMode || !rawData) return rawData;
    return {
      ...rawData,
      moduleSignoffs: [],
      academyScreenshots: [],
      wdVerification: null,
      week1UnlockedAt: null,
      isLegacyLearner: false,
    };
  }, [testMode, rawData]);

  const { run: submitSignoff } = useApi("SubmitModuleSignoff");
  const { run: submitScreenshot } = useApi("SubmitAcademyScreenshot");
  const { run: submitWd } = useApi("SubmitWdVerification");
  const { run: unlockAscent } = useApi("UnlockAscent");

  const [challengerAccount, setChallengerAccount] = useState("");
  const [challengerContact, setChallengerContact] = useState("");

  const isLegacy = data?.isLegacyLearner ?? false;
  const isUnlocked = !!data?.week1UnlockedAt;

  // Sign-off lookups
  const signoffMap = useMemo(() => {
    const map: Record<string, typeof data extends { moduleSignoffs: infer T } ? T extends Array<infer U> ? U : never : never> = {};
    for (const s of data?.moduleSignoffs ?? []) {
      map[s.moduleKey] = s;
    }
    return map;
  }, [data?.moduleSignoffs]);

  const screenshotMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const s of data?.academyScreenshots ?? []) {
      map[s.courseKey] = true;
    }
    return map;
  }, [data?.academyScreenshots]);

  // Completion checks
  const allModulesSigned = !!signoffMap.meddpicc && !!signoffMap.camp101 && !!signoffMap.challenger;
  const wdVerified = !!data?.wdVerification;
  const allComplete = allModulesSigned && wdVerified;

  // Handlers
  const handleModuleSignoff = useCallback(async (moduleKey: string, signoffData: {
    screenshotData: string;
    screenshotFilename: string;
    screenshotHash: string;
    reflectionResponse: string;
    signature: string;
  }, reflectionPrompt: string) => {
    const result = await submitSignoff({
      viewerId,
      moduleKey: moduleKey as any,
      screenshotData: signoffData.screenshotData,
      screenshotFilename: signoffData.screenshotFilename,
      screenshotHash: signoffData.screenshotHash,
      reflectionPrompt,
      reflectionResponse: signoffData.reflectionResponse,
      signature: signoffData.signature,
    });
    if (result?.alreadySubmitted) {
      toast.info("This module was already signed off");
    } else {
      toast.success(`${moduleKey === 'meddpicc' ? 'MEDDPICC' : moduleKey === 'camp101' ? 'cAMP 101' : 'Challenger'} signed off!`);
    }
    await refetch();
  }, [viewerId, submitSignoff, refetch]);

  const handleAcademyUpload = useCallback(async (courseKey: string, uploadData: {
    screenshotData: string;
    screenshotFilename: string;
    screenshotHash: string;
  }) => {
    await submitScreenshot({
      viewerId,
      courseKey: courseKey as any,
      screenshotData: uploadData.screenshotData,
      screenshotFilename: uploadData.screenshotFilename,
      screenshotHash: uploadData.screenshotHash,
    });
    toast.success("Screenshot uploaded!");
    await refetch();
  }, [viewerId, submitScreenshot, refetch]);

  const handleWdSubmit = useCallback(async (wdData: { product: string; scenario: string; score: number }) => {
    const result = await submitWd({
      viewerId,
      product: wdData.product,
      scenario: wdData.scenario,
      score: wdData.score,
    });
    if (result?.validationError) {
      throw new Error(result.validationError);
    }
    toast.success("Wheel & Deal verified!");
    await refetch();
  }, [viewerId, submitWd, refetch]);

  const handleBeginAscent = useCallback(async () => {
    try {
      const result = await unlockAscent({ viewerId });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.alreadyUnlocked) {
        toast.info("Already unlocked!");
      }
      // Pass unlock result to parent — First Achievement modal handles celebration
      onBeginAscent({
        alreadyUnlocked: result?.alreadyUnlocked ?? false,
        earnedBadge: result?.earnedBadge ?? false,
        earnedXp: result?.earnedXp ?? 0,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to unlock The Ascent");
    }
  }, [viewerId, unlockAscent, onBeginAscent]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const camp101Prompt = getShuffledCamp101Prompt(viewerId);
  const challengerPrompt = challengerAccount && challengerContact
    ? `Describe one commercial insight you could bring to ${challengerContact} at ${challengerAccount} that reframes how they see their business — not just their analytics.`
    : CHALLENGER_REFLECTION_INTRO;

  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full">
      {/* Admin test mode toggle */}
      {isAdmin && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔧</span>
            <span className="text-sm font-semibold text-purple-900">Admin View</span>
            <span className="text-xs text-purple-600">
              {testMode ? "Showing fresh learner view" : "Showing your real progress"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/modal-museum")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-purple-700 border border-purple-300 hover:bg-purple-100 transition-colors"
            >
              🖼️ Modal Museum
            </button>
            <button
              onClick={() => setTestMode((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                testMode
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-white text-purple-700 border border-purple-300 hover:bg-purple-100"
              }`}
            >
              {testMode ? "👁️ Show My Progress" : "🧪 Test as New Learner"}
            </button>
          </div>
        </div>
      )}

      {/* Welcome to The Approach — manifesto */}
      {<ApproachManifesto viewerId={viewerId} />}

      {/* Legacy learner banner */}
      {isLegacy && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>📋 Legacy Learner:</strong> You started cAMP before Week 1 was introduced.
            All resources below are available for your reference, but sign-off fields are disabled.
            Continue your Ascent on the 🧗 The Ascent tab.
          </p>
        </div>
      )}

      {/* Module 1: MEDDPICC */}
      <ModuleCard
        moduleKey="meddpicc"
        emoji="🧱"
        title="MEDDPICC"
        description="Amplitude's qualification framework — the backbone of every deal"
        resources={[
          { emoji: "🧠", label: "MindTickle Course", url: "https://lms.amplitude.com/new/ui/learner/training/programs/2035017193528628430?series=2035017193528628430" },
          { emoji: "📚", label: "Discovery Question Repository", url: "https://docs.google.com/document/d/11po0r9LxK_tiooyYb64bdDeqhIhRX_7k-HSlPppf1A4/edit?tab=t.5c34f94kg7l4", isCampGear: true },
        ]}
        screenshotLabel="Upload MindTickle completion screenshot"
        reflectionPrompt={MEDDPICC_REFLECTION}
        isSignedOff={!!signoffMap.meddpicc}
        signoffData={signoffMap.meddpicc ? {
          reflectionResponse: signoffMap.meddpicc.reflectionResponse,
          signature: signoffMap.meddpicc.signature,
          completedAt: signoffMap.meddpicc.completedAt,
        } : undefined}
        isLegacy={isLegacy}
        onSignOff={async (d) => handleModuleSignoff("meddpicc", d, MEDDPICC_REFLECTION)}
      />

      {/* Module 2: cAMP 101 */}
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-[#1B4332]">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h3 className="text-base font-bold text-white">cAMP 101</h3>
            {!!signoffMap.camp101 && <span className="ml-auto text-sm text-green-300">✅ Signed Off</span>}
          </div>
          <p className="text-xs text-white/70 mt-1">Amplitude Academy courses + product fundamentals</p>
        </div>

        <div className="bg-white divide-y divide-gray-100">
          {/* Resources */}
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resources</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://app.spekit.co/app/wiki/?&topic=1d04d90d-e516-408c-bab2-837788fed772&tag=Platform%20and%20Products"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <span>🐙</span> Spekit ↗ <span className="ml-1 text-[10px] opacity-70">⛺ cAMP Gear</span>
              </a>
            </div>
          </div>

          {/* Academy screenshot slots */}
          <AcademyScreenshotSlots
            slots={ACADEMY_COURSES.map((c) => ({
              key: c.key,
              label: c.label,
              url: c.url,
              uploaded: !!screenshotMap[c.key],
            }))}
            isLegacy={isLegacy}
            onUpload={handleAcademyUpload}
          />

          {/* cAMP 101 sign-off — reflection unlocks once all 4 screenshots uploaded */}
          <Camp101Signoff
            isSignedOff={!!signoffMap.camp101}
            signoffData={signoffMap.camp101 ? {
              reflectionResponse: signoffMap.camp101.reflectionResponse,
              signature: signoffMap.camp101.signature,
              completedAt: signoffMap.camp101.completedAt,
            } : undefined}
            isLegacy={isLegacy}
            allScreenshotsUploaded={Object.keys(screenshotMap).length >= 4}
            reflectionPrompt={camp101Prompt}
            onSignOff={async (d) => handleModuleSignoff("camp101", d, camp101Prompt)}
          />
        </div>
      </div>

      {/* Module 3: Challenger — custom layout with account/contact inputs */}
      <ChallengerCard
        isSignedOff={!!signoffMap.challenger}
        signoffData={signoffMap.challenger ? {
          reflectionResponse: signoffMap.challenger.reflectionResponse,
          signature: signoffMap.challenger.signature,
          completedAt: signoffMap.challenger.completedAt,
        } : undefined}
        isLegacy={isLegacy}
        challengerAccount={challengerAccount}
        challengerContact={challengerContact}
        onAccountChange={setChallengerAccount}
        onContactChange={setChallengerContact}
        reflectionPrompt={challengerPrompt}
        onSignOff={async (d) => handleModuleSignoff("challenger", d, challengerPrompt)}
      />

      {/* Module 4: Wheel & Deal */}
      <WheelDealCard
        isVerified={wdVerified}
        verificationData={data?.wdVerification ?? undefined}
        isLegacy={isLegacy}
        onSubmit={handleWdSubmit}
      />

      {/* Begin The Ascent button */}
      {!isLegacy && !isUnlocked && (
        <div className="mt-4">
          <button
            onClick={handleBeginAscent}
            disabled={!allComplete}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
              allComplete
                ? "bg-[#1B4332] text-white hover:bg-[#2D6A4F] shadow-lg hover:shadow-xl"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {allComplete ? "🧗 Begin The Ascent" : "🔒 Complete all modules to unlock The Ascent"}
          </button>
          {!allComplete && (
            <p className="text-xs text-gray-400 text-center mt-2">
              {!signoffMap.meddpicc && "⬜ MEDDPICC · "}
              {!signoffMap.camp101 && "⬜ cAMP 101 · "}
              {!signoffMap.challenger && "⬜ Challenger · "}
              {!wdVerified && "⬜ Wheel & Deal"}
            </p>
          )}
        </div>
      )}

      {isUnlocked && !isLegacy && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-center">
          <p className="text-sm text-green-800 font-semibold">
            🚡 The Approach is complete! Head to The Ascent tab to continue.
          </p>
        </div>
      )}
    </div>
  );
}
