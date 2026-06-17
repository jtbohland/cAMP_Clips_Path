import { useParams, useNavigate, Link } from "react-router";
import { useViewer } from "@/components/ViewerContext";
import { useApiData } from "@/hooks/useApiData.js";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClipEmoji } from "@/lib/clip-emojis";

/**
 * Deep link route: /clip/:clipId
 * Routes learners based on their state:
 * - Not registered → Registration (Library page) → then starts at Clip 1
 * - Registered, clip not unlocked → Message + link back to library
 * - Registered, clip unlocked → Straight into the video
 */
export default function DeepLinkPage() {
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();

  // If not registered, redirect to library (which shows registration form)
  useEffect(() => {
    if (!viewer) {
      navigate("/", { replace: true });
    }
  }, [viewer, navigate]);

  // Fetch the clip library to check unlock status
  const { data, loading } = useApiData(
    "GetClipLibrary",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  // Loading state
  if (!viewer || loading || !data) {
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
            <Button variant="default">Back to Library</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isUnlocked = targetClip.unlocked === true;
  const isAdmin = viewer?.isAdmin === true;

  // If unlocked or admin, go straight to video
  useEffect(() => {
    if (isUnlocked || isAdmin) {
      navigate(`/watch/${targetClip.id}`, { replace: true });
    }
  }, [isUnlocked, isAdmin, targetClip, navigate]);

  // If we're still here, clip is locked
  if (!isUnlocked && !isAdmin) {
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
            Complete <strong>{prevTitle}</strong> first to unlock this clip.
          </p>
          <Link to="/library">
            <Button variant="default">🎬 Back to cAMP Clips</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Fallback loading while redirect happens
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
