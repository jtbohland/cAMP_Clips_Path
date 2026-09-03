/** Live countdown timer for audit cycle deadline */
import { useState, useEffect, useMemo } from "react";

interface Props {
  cycleLabel: string | null;
  deadline: string | null;
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

function getUrgencyStyle(totalMs: number) {
  const daysLeft = totalMs / (1000 * 60 * 60 * 24);
  if (daysLeft <= 3) return { bg: "bg-red-600", text: "text-white", border: "border-red-700", flash: true };
  if (daysLeft <= 7) return { bg: "bg-red-50", text: "text-red-700", border: "border-red-300", flash: false };
  if (daysLeft <= 14) return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300", flash: false };
  if (daysLeft <= 21) return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300", flash: false };
  return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300", flash: false };
}

function TimeBox({ value, label, textClass }: { value: number; label: string; textClass: string }) {
  return (
    <div className="flex flex-col items-center min-w-[48px]">
      <span className={`text-2xl font-black tabular-nums ${textClass}`}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

export default function AuditCountdown({ cycleLabel, deadline }: Props) {
  const deadlineDate = useMemo(() => (deadline ? new Date(deadline) : null), [deadline]);
  const [time, setTime] = useState(() => (deadlineDate ? getTimeRemaining(deadlineDate) : null));

  useEffect(() => {
    if (!deadlineDate) return;
    const tick = () => setTime(getTimeRemaining(deadlineDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineDate]);

  if (!deadlineDate || !time) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-center">
        <p className="text-sm text-gray-400 italic">No active audit cycle — create one from the admin dashboard to start the timer.</p>
      </div>
    );
  }

  if (time.isPast) {
    return (
      <div className="rounded-xl border-2 border-red-400 bg-red-50 px-5 py-4 text-center">
        <p className="text-base font-bold text-red-700">⏰ {cycleLabel ?? "Audit"} deadline has passed!</p>
        <p className="text-xs text-red-500 mt-1">
          Was due {deadlineDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>
    );
  }

  const style = getUrgencyStyle(time.total);

  return (
    <div className={`rounded-xl border-2 ${style.border} ${style.bg} px-5 py-4 ${style.flash ? "animate-pulse" : ""}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Label */}
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${style.text} opacity-80`}>
            {cycleLabel ?? "Audit"} Deadline
          </p>
          <p className={`text-sm font-semibold ${style.text}`}>
            {deadlineDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Timer boxes */}
        <div className="flex items-center gap-1">
          {time.weeks > 0 && (
            <>
              <TimeBox value={time.weeks} label="weeks" textClass={style.text} />
              <span className={`text-xl font-bold ${style.text} opacity-40 -mt-3`}>:</span>
            </>
          )}
          <TimeBox value={time.days} label="days" textClass={style.text} />
          <span className={`text-xl font-bold ${style.text} opacity-40 -mt-3`}>:</span>
          <TimeBox value={time.hours} label="hrs" textClass={style.text} />
          <span className={`text-xl font-bold ${style.text} opacity-40 -mt-3`}>:</span>
          <TimeBox value={time.minutes} label="min" textClass={style.text} />
          <span className={`text-xl font-bold ${style.text} opacity-40 -mt-3`}>:</span>
          <TimeBox value={time.seconds} label="sec" textClass={style.text} />
        </div>
      </div>
    </div>
  );
}
