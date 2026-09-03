/** Live countdown timer for audit cycle deadline — visually impactful */
import { useState, useEffect, useMemo } from "react";

interface Props {
  cycleLabel: string | null;
  deadline: string | null;
  completedTopics?: number;
  totalTopics?: number;
}

function parseDeadlineAsLocalEOD(deadline: string): Date {
  // Parse as local date at end of day (11:59:59 PM) so "Oct 9" always shows as Oct 9
  const parts = deadline.slice(0, 10).split("-");
  return new Date(+parts[0], +parts[1] - 1, +parts[2], 23, 59, 59);
}

function getTimeRemaining(deadline: Date) {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, weeks: 0, isPast: true };

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  return { total: diff, days, hours, minutes, seconds, weeks, isPast: false };
}

function getUrgencyConfig(totalMs: number) {
  const daysLeft = totalMs / (1000 * 60 * 60 * 24);
  if (daysLeft <= 3) return { theme: "critical" as const, flash: true };
  if (daysLeft <= 7) return { theme: "danger" as const, flash: false };
  if (daysLeft <= 14) return { theme: "warning" as const, flash: false };
  if (daysLeft <= 21) return { theme: "caution" as const, flash: false };
  return { theme: "safe" as const, flash: false };
}

function Digit({ value, label, theme }: { value: number; label: string; theme: string }) {
  const bgMap: Record<string, string> = {
    safe: "from-emerald-600 to-emerald-800",
    caution: "from-yellow-500 to-yellow-700",
    warning: "from-orange-500 to-orange-700",
    danger: "from-red-500 to-red-700",
    critical: "from-red-600 to-red-900",
  };
  return (
    <div className="flex flex-col items-center">
      <div className={`bg-gradient-to-b ${bgMap[theme]} rounded-lg px-3 py-2 min-w-[52px] shadow-lg`}>
        <span className="text-2xl font-black tabular-nums text-white drop-shadow-md block text-center">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1">{label}</span>
    </div>
  );
}

function Separator({ theme }: { theme: string }) {
  const colorMap: Record<string, string> = {
    safe: "text-emerald-400",
    caution: "text-yellow-400",
    warning: "text-orange-400",
    danger: "text-red-400",
    critical: "text-red-500",
  };
  return <span className={`text-2xl font-black ${colorMap[theme]} -mt-3 mx-0.5`}>:</span>;
}

export default function AuditCountdown({ cycleLabel, deadline, completedTopics = 0, totalTopics = 0 }: Props) {
  const deadlineDate = useMemo(() => (deadline ? parseDeadlineAsLocalEOD(deadline) : null), [deadline]);
  const [time, setTime] = useState(() => (deadlineDate ? getTimeRemaining(deadlineDate) : null));

  useEffect(() => {
    if (!deadlineDate) return;
    const tick = () => setTime(getTimeRemaining(deadlineDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineDate]);

  // Format display date from the raw deadline string (local date)
  const displayDate = useMemo(() => {
    if (!deadline) return "";
    const d = parseDeadlineAsLocalEOD(deadline);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [deadline]);

  if (!deadlineDate || !time) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-center">
        <p className="text-sm text-gray-400 italic">No active audit cycle — create one from the admin dashboard to start the timer.</p>
      </div>
    );
  }

  if (time.isPast) {
    return (
      <div className="rounded-2xl border-2 border-red-400 bg-red-600 px-6 py-5 text-center shadow-xl">
        <p className="text-2xl font-black text-white">⏰ TIME'S UP!</p>
        <p className="text-sm text-red-100 mt-1 font-medium">
          {cycleLabel ?? "Audit"} deadline was {displayDate}
        </p>
      </div>
    );
  }

  const { theme, flash } = getUrgencyConfig(time.total);

  const outerBg: Record<string, string> = {
    safe: "from-emerald-900 via-emerald-800 to-emerald-900",
    caution: "from-yellow-800 via-yellow-700 to-yellow-800",
    warning: "from-orange-800 via-orange-700 to-orange-800",
    danger: "from-red-800 via-red-700 to-red-800",
    critical: "from-red-900 via-red-800 to-red-900",
  };

  const accentText: Record<string, string> = {
    safe: "text-emerald-300",
    caution: "text-yellow-300",
    warning: "text-orange-300",
    danger: "text-red-300",
    critical: "text-red-200",
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-r ${outerBg[theme]} px-6 py-5 shadow-xl ${flash ? "animate-pulse" : ""}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left: Label + date + progress */}
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${accentText[theme]}`}>
            ⏱ {cycleLabel ?? "Audit"} Deadline
          </p>
          <p className="text-lg font-bold text-white mt-0.5">
            {displayDate}
          </p>
          {totalTopics > 0 && (
            <p className="text-xs text-white/70 mt-1 font-semibold">
              🏔️ {completedTopics} / {totalTopics} topics complete
            </p>
          )}
        </div>

        {/* Right: Timer digits */}
        <div className="flex items-center gap-1">
          {time.weeks > 0 && (
            <>
              <Digit value={time.weeks} label="weeks" theme={theme} />
              <Separator theme={theme} />
            </>
          )}
          <Digit value={time.days} label="days" theme={theme} />
          <Separator theme={theme} />
          <Digit value={time.hours} label="hrs" theme={theme} />
          <Separator theme={theme} />
          <Digit value={time.minutes} label="min" theme={theme} />
          <Separator theme={theme} />
          <Digit value={time.seconds} label="sec" theme={theme} />
        </div>
      </div>
    </div>
  );
}
