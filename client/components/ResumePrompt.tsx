import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type ResumePromptProps = {
  clipTitle: string;
  elapsedSeconds: number;
  answeredCount: number;
  totalQuestions: number;
  onResume: () => void;
  onStartFresh: () => void;
};

export default function ResumePrompt({
  clipTitle,
  elapsedSeconds,
  answeredCount,
  totalQuestions,
  onResume,
  onStartFresh,
}: ResumePromptProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center justify-center h-[calc(100dvh-57px)] bg-background">
      <Card className="w-full max-w-md p-6 shadow-xl border-2 border-primary/20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">⏸️</span>
          <h2 className="text-xl font-bold text-foreground">Resume Your Session?</h2>
        </div>

        {/* Session info */}
        <div className="rounded-lg bg-muted/50 p-4 mb-6">
          <p className="text-sm text-foreground leading-relaxed">
            You paused <span className="font-semibold">{clipTitle}</span>{" "}
            <span className="font-mono text-primary">{timeStr}</span> in, with{" "}
            <span className="font-semibold">
              {answeredCount}/{totalQuestions}
            </span>{" "}
            Trail Markers answered.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button onClick={onResume} size="lg" className="w-full">
            <Icon icon="play" /> Resume Where I Left Off
          </Button>
          <Button onClick={onStartFresh} variant="ghost" size="sm" className="w-full text-muted-foreground">
            Start Fresh
          </Button>
        </div>
      </Card>
    </div>
  );
}
