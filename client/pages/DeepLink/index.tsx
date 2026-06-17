import { useParams, useNavigate, Link } from "react-router";
import { useViewer } from "@/components/ViewerContext";
import { useApiData } from "@/hooks/useApiData.js";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClipEmoji } from "@/lib/clip-emojis";

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
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
        <Card className="max-w-md p-6 text-center">
          <span className="text-4xl mb-3 block">❌</span>
          <h2 className="text-lg font-bold mb-2">Clip Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This clip doesn't exist in the program.
          </p>
          <Link to="/library">
            <Button variant="default">← Back to cAMP Clips</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Clip is locked — show locked message
  if (!targetClip.unlocked && !viewer?.isAdmin) {
    const prevClip = clips.find(
      (c: any) => c.sortOrder === targetClip.sortOrder - 1
    );
    const prevTitle = prevClip
      ? `${getClipEmoji(prevClip.sortOrder)} Day ${prevClip.sortOrder}: ${prevClip.title}`
      : "the previous clip";

    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md p-6 text-center">
          <span className="text-4xl mb-3 block">🔒</span>
          <h2 className="text-lg font-bold mb-2">Clip Locked</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You haven't unlocked this session yet. Complete{" "}
            <strong>{prevTitle}</strong> first to continue your climb. 🏔️
          </p>
          <Link to="/library">
            <Button variant="default">← Back to cAMP Clips</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Fallback spinner while navigation effect fires
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
