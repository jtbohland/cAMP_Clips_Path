import { useParams, useNavigate, Link } from "react-router";
import { useViewer } from "@/components/ViewerContext";
import { useApiData } from "@/hooks/useApiData.js";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Deep link route: /clip/:clipId
 * Routes learners based on their exact state for this clip:
 *
 * - Not registered → "/" (registration form, then starts at Clip 1)
 * - Registered + clip locked → Locked message + "← Back to cAMP Clips"
 * - Registered + clip unlocked, not completed → /watch/{clipId} (video or Resume prompt)
 * - Registered + clip completed → /report/{clipId} (Ranger Report review page)
 */
export default function DeepLinkPage() {
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const { viewer, isLoading: viewerLoading } = useViewer();

  // Fetch the clip library to check unlock + completion status
  const { data, loading: dataLoading } = useApiData(
    "GetClipLibrary",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  // Route based on state — only when all data is resolved
  useEffect(() => {
    // Wait for viewer context to finish loading
    if (viewerLoading) return;

    // Not registered → send to registration
    if (!viewer) {
      navigate("/", { replace: true });
      return;
    }

    // Wait for clip data to load
    if (dataLoading || !data) return;

    const clips = data.clips ?? [];
    const targetClip = clips.find((c: any) => c.id === clipId);

    // Clip not found — don't navigate, show error UI below
    if (!targetClip) return;

    const isAdmin = viewer?.isAdmin === true;
    const isUnlocked = targetClip.unlocked === true;
    const isCompleted = targetClip.completed === true;

    // Admin bypasses lock
    if (isAdmin) {
      if (isCompleted) {
        navigate(`/report/${clipId}`, { replace: true });
      } else {
        navigate(`/watch/${clipId}`, { replace: true });
      }
      return;
    }

    // Locked → show locked message (don't navigate, render below)
    if (!isUnlocked) return;

    // Completed → Ranger Report
    if (isCompleted) {
      navigate(`/report/${clipId}`, { replace: true });
      return;
    }

    // Unlocked + not completed → Watch (handles both fresh and paused)
    navigate(`/watch/${clipId}`, { replace: true });
  }, [viewerLoading, viewer, dataLoading, data, clipId, navigate]);

  // === RENDER STATES (while routing hasn't happened yet) ===

  // Still loading viewer or data
  if (viewerLoading || !viewer || dataLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  const clips = data.clips ?? [];
  const targetClip = clips.find((c: any) => c.id === clipId);

  // Clip not found
  if (!targetClip) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-md p-6 text-center bg-white rounded-xl shadow-lg">
          <span className="text-4xl mb-3 block">❌</span>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Clip Not Found</h2>
          <p className="text-sm text-gray-500 mb-4">
            This clip doesn't exist in the program.
          </p>
          <Link to="/library">
            <Button variant="default">← Back to cAMP Clips</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Clip is locked — show locked modal overlay
  if (!targetClip.unlocked && !viewer?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-6 bg-gray-100">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Yellow header */}
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-5 text-center">
            <h2 className="text-lg font-bold text-gray-900">
              ⚠️ Clip Locked — You're Off the Trail!
            </h2>
          </div>
          {/* Body */}
          <div className="px-6 py-6 text-center">
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Complete the previous clip to unlock this one and stay on your path to the summit.
            </p>
            <Link to="/library">
              <button className="w-full py-3 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                🧭 Back to cAMP Clips
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fallback spinner while navigation effect fires
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}
