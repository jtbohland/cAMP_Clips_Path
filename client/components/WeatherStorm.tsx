import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

type WeatherStormProps = {
  overview: string;
  takeaways: string[];
  timerMinutes: number;
  clipTitle: string;
  onTimerExpire: () => void;
};

export default function WeatherStorm({
  overview,
  takeaways,
  timerMinutes,
  clipTitle,
  onTimerExpire,
}: WeatherStormProps) {
  const [secondsLeft, setSecondsLeft] = useState(timerMinutes * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tabHidden, setTabHidden] = useState(false);

  // Start / stop the countdown interval
  const startTimer = useCallback(() => {
    if (intervalRef.current) return; // already running
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial start
  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [startTimer, stopTimer]);

  // Tab visibility detection — pause timer when tab hidden, resume when visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setTabHidden(true);
        stopTimer();
      } else {
        setTabHidden(false);
        // Only restart if there's time remaining
        setSecondsLeft((s) => {
          if (s > 0) startTimer();
          return s;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [startTimer, stopTimer]);

  useEffect(() => {
    if (secondsLeft === 0) {
      onTimerExpire();
    }
  }, [secondsLeft, onTimerExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / (timerMinutes * 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl p-6 bg-white shadow-xl border-2 border-destructive/20 rounded-xl">
        {/* Header with amber background */}
        <div className="bg-[#FFFBEB] rounded-lg px-4 py-3 mb-4 border border-amber-200/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⛈️</span>
              <h2 className="text-lg font-bold text-gray-900">Weather the Storm</h2>
            </div>
            <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-full">
              <span>⏱️</span>
              <span className="text-sm font-mono font-bold text-gray-900">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
              {tabHidden && (
                <span className="text-xs text-amber-600 font-medium">⏸</span>
              )}
            </div>
          </div>
          <p className="text-sm text-amber-800 text-center">
            You didn't quite make it through Trail Markers or Search & Rescue — but that's okay.
            Take {timerMinutes} minutes with these key takeaways before your next clip unlocks. 🌲
          </p>
        </div>

        {/* Timer progress bar */}
        <div className="w-full h-2 bg-gray-50 rounded-full mb-5 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Clip title — larger, accent color */}
        <p className="text-base font-semibold text-indigo-600 mb-3">{clipTitle}</p>

        {/* Overview */}
        <div className="bg-gray-50/50 rounded-lg p-4 mb-5">
          <p className="text-sm text-gray-900 leading-relaxed">{overview}</p>
        </div>

        {/* Key Takeaways */}
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          🔑 Key Takeaways
        </h3>
        <ul className="space-y-2 mb-5">
          {takeaways.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-900">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center text-xs font-bold mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-2">
          Next clip unlocks automatically when the timer ends. Hang tight! 🏕️
        </p>

        {secondsLeft === 0 && (
          <div className="flex justify-center mt-4">
            <Button className="bg-[#4F46E5] hover:bg-[#4338CA] text-white" onClick={onTimerExpire}>
              Continue →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
