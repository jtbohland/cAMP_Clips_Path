import { useState, useCallback, useEffect, memo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";

type CheckinType = "approach" | "week2" | "week3" | "summit";

interface CheckinEmailModalProps {
  viewerId: string;
  viewerName: string;
  checkinType: CheckinType;
  onClose: () => void;
}

const CHECKIN_LABELS: Record<CheckinType, { title: string; emoji: string; description: string }> = {
  approach: {
    title: "The Approach Check-In",
    emoji: "🚡",
    description: "Week 1 wrap-up — MEDDPICC, cAMP 101, Challenger, W&D results",
  },
  week2: {
    title: "Week 2 Check-In",
    emoji: "🏕️",
    description: "Mid-Ascent progress — clip scores, XP, engagement trends",
  },
  week3: {
    title: "Week 3 Check-In",
    emoji: "🧗",
    description: "Summit push — near-completion stats, final encouragement",
  },
  summit: {
    title: "Summit Celebration",
    emoji: "🏔️",
    description: "Program completion — final stats, badge showcase, next steps",
  },
};

function CheckinEmailModalInner({ viewerId, viewerName, checkinType, onClose }: CheckinEmailModalProps) {
  const label = CHECKIN_LABELS[checkinType];

  const { data, loading, isError, error } = useApiData(
    "GetCheckinEmailData",
    { viewerId, checkinType },
    { enabled: true }
  );

  const { run: markSent, loading: marking } = useApi("MarkCheckinSent");
  const [sent, setSent] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSend = useCallback(async () => {
    if (!data?.viewer) return;

    const feedbackToken = crypto.randomUUID();
    try {
      const result = await markSent({
        viewerId,
        checkinType,
        managerEmail: data.viewer.managerEmail,
        belayBuddyEmail: data.viewer.belayBuddyEmail,
        feedbackToken,
        learnerReflection: null,
      });

      if (result?.alreadySent) {
        toast.info("This check-in was already marked as sent.");
      } else {
        toast.success(`${label.title} marked as sent for ${viewerName}`, {
          style: { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
        });
      }
      setSent(true);
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      toast.error("Error marking check-in: " + message);
    }
  }, [data, viewerId, checkinType, markSent, viewerName, label.title]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[85vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-lg font-bold text-white flex items-center gap-2">
              <span>{label.emoji}</span> {label.title}
            </p>
            <p className="text-sm text-indigo-200">{label.description}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none px-2">
            &#10005;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {loading && (
            <div className="space-y-3">
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-24 bg-gray-100 rounded animate-pulse" />
            </div>
          )}

          {isError && (
            <div className="text-center py-6">
              <p className="text-sm text-red-600">Failed to load data: {(error as any)?.message ?? "Unknown error"}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Viewer info */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Learner:</span>{" "}
                    <span className="font-semibold text-gray-900">{data.viewer.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span className="font-medium text-gray-700">{data.viewer.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Manager:</span>{" "}
                    <span className="font-medium text-gray-700">{data.viewer.managerEmail ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Belay Buddy:</span>{" "}
                    <span className="font-medium text-gray-700">{data.viewer.belayBuddyEmail ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">XP:</span>{" "}
                    <span className="font-bold text-indigo-600">{data.viewer.totalXp}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tier:</span>{" "}
                    <span className="font-semibold text-gray-900">{data.viewer.tier}</span>
                  </div>
                </div>
              </div>

              {/* Approach-specific: Module reflections */}
              {checkinType === "approach" && data.moduleReflections.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Module Reflections</h3>
                  <div className="space-y-3">
                    {data.moduleReflections.map((r: any, i: number) => (
                      <div key={i} className="text-sm">
                        <p className="font-medium text-gray-700">{r.reflectionPrompt}</p>
                        <p className="text-gray-600 mt-1 bg-amber-50 rounded px-3 py-2 border border-amber-100">
                          {r.reflectionResponse}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approach-specific: W&D result */}
              {checkinType === "approach" && data.wdVerification && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Wheel & Deal Result</h3>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{data.wdVerification.product}</span>
                    {" — "}
                    <span>{data.wdVerification.scenario}</span>
                    {" — "}
                    <span className="font-bold text-indigo-600">{data.wdVerification.score}%</span>
                  </div>
                </div>
              )}

              {/* Clip stats (week2/week3/summit) */}
              {checkinType !== "approach" && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Clip Progress</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-indigo-600">
                        {data.clipStats.completedClips}/{data.clipStats.totalClips}
                      </p>
                      <p className="text-xs text-gray-500">Clips Done</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{data.clipStats.avgScore}%</p>
                      <p className="text-xs text-gray-500">Avg Score</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">
                        #{data.leaderboard.rank}/{data.leaderboard.totalLearners}
                      </p>
                      <p className="text-xs text-gray-500">Leaderboard</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Engagement breakdown */}
              {checkinType !== "approach" && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Engagement Breakdown</h3>
                  <div className="grid grid-cols-4 gap-3 text-center text-sm">
                    <div>
                      <p className="font-bold text-gray-900">{data.engagement.avgQuestionScore}%</p>
                      <p className="text-xs text-gray-500">Questions</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{data.engagement.avgFocusScore}%</p>
                      <p className="text-xs text-gray-500">Focus</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{data.engagement.avgTimeScore}%</p>
                      <p className="text-xs text-gray-500">Time</p>
                    </div>
                    <div>
                      <p className="font-bold text-indigo-600">{data.engagement.overallEngagement}%</p>
                      <p className="text-xs text-gray-500">Overall</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
          <p className="text-xs text-gray-500">
            {sent ? "Marked as sent — email data captured above." : "Review the data above, then mark as sent."}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            {!sent && (
              <button
                onClick={handleSend}
                disabled={marking || loading || isError}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {marking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Marking…
                  </>
                ) : (
                  "Mark as Sent"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CheckinEmailModal = memo(CheckinEmailModalInner);
export default CheckinEmailModal;
