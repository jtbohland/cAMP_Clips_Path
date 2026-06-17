import { Card } from "@/components/ui/card";
import { getClipEmoji } from "@/lib/clip-emojis";
import { toast } from "sonner";
import { useCallback } from "react";

type ClipLibraryCardProps = {
  clip: {
    id: string;
    title: string;
    sortOrder: number;
    videoUrl: string | null;
    durationSeconds: number | null;
  };
  isLocked: boolean;
  isCompleted: boolean;
  score: number | null;
  attempts: number;
  xpEarned: number;
  previousClipTitle?: string;
  onWatch: () => void;
  onReview?: () => void;
};

function getWeekLabel(sortOrder: number): string {
  if (sortOrder <= 4) return "WEEK 2";
  if (sortOrder <= 9) return "WEEK 3";
  return "WEEK 4";
}

function getDayLabel(sortOrder: number): string {
  return `DAY ${sortOrder}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

/** Extract the session title without the "Day X:" prefix */
function getSessionTitle(title: string): string {
  const match = title.match(/^Day \d+\w?:\s*(.+)$/);
  return match ? match[1] : title;
}

type ClipState = "not_started" | "in_progress" | "completed" | "locked";

function getClipState(isLocked: boolean, isCompleted: boolean, attempts: number): ClipState {
  if (isLocked) return "locked";
  if (isCompleted) return "completed";
  if (attempts > 0) return "in_progress";
  return "not_started";
}

export default function ClipLibraryCard({
  clip,
  isLocked,
  isCompleted,
  score,
  attempts,
  xpEarned,
  previousClipTitle,
  onWatch,
  onReview,
}: ClipLibraryCardProps) {
  const state = getClipState(isLocked, isCompleted, attempts);
  const emoji = getClipEmoji(clip.sortOrder);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const deepLink = `${window.location.origin}/clip/${clip.id}`;
    navigator.clipboard.writeText(deepLink).then(() => {
      toast.success("Link copied!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  }, [clip.id]);

  const statusBadge = () => {
    switch (state) {
      case "completed":
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            ✅ Completed{score !== null && ` (${score}%)`}
            {xpEarned > 0 && <span className="ml-1 text-indigo-600">• +{xpEarned} XP</span>}
          </span>
        );
      case "in_progress":
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            ▶ In Progress
          </span>
        );
      default:
        return null;
    }
  };

  const actionButton = () => {
    switch (state) {
      case "not_started":
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onWatch(); }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            ▶ Start Session
          </button>
        );
      case "in_progress":
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onWatch(); }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            ▶ Resume Session
          </button>
        );
      case "completed":
        return (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onReview ? onReview() : onWatch(); }}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              📋 Review Ranger Report
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onWatch(); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ↩ Rewatch Video
            </button>
          </div>
        );
      case "locked":
        return (
          <button
            disabled
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            🔒 Locked{previousClipTitle ? ` — Complete ${previousClipTitle} first` : ""}
          </button>
        );
    }
  };

  return (
    <Card
      className={`p-4 transition-all duration-200 ${
        isLocked ? "opacity-60" : "hover:shadow-md cursor-pointer"
      }`}
      onClick={!isLocked ? onWatch : undefined}
    >
      <div className="flex flex-col gap-3">
        {/* Top row: week/day labels + emoji + status badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              {getWeekLabel(clip.sortOrder)} · {getDayLabel(clip.sortOrder)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge()}
            <button
              onClick={handleShare}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Copy share link"
            >
              🔗
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-foreground leading-snug">
          {getSessionTitle(clip.title)}
        </h3>

        {/* Metadata line */}
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
          {clip.durationSeconds ? (
            <>
              <span>⏱ {formatDuration(clip.durationSeconds)}</span>
              <span>•</span>
            </>
          ) : null}
          <span>80% engagement required</span>
          <span>•</span>
          <span>Ranger Report ✨</span>
        </p>

        {/* Action button */}
        {actionButton()}
      </div>
    </Card>
  );
}
