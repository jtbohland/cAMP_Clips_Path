import { useApiData } from "@/hooks/useApiData";

const TIMEZONE_PILL: Record<string, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  NAMER: { emoji: "🌎", label: "NAMER", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  EMEA:  { emoji: "🌍", label: "EMEA",  bg: "bg-red-50",  text: "text-red-700",  border: "border-red-200" },
  AAPJ:  { emoji: "🌏", label: "AAPJ",  bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300" },
};

function TzPill({ tz }: { tz: string | null }) {
  if (!tz) return <span className="text-gray-400 text-[10px]">—</span>;
  const p = TIMEZONE_PILL[tz];
  if (!p) return <span className="text-[10px]">{tz}</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${p.bg} border ${p.border} ${p.text} text-[10px] font-medium whitespace-nowrap`}>
      {p.emoji} {p.label}
    </span>
  );
}

function StatusDot({ done }: { done: boolean }) {
  return done
    ? <span className="text-green-600 text-xs">✅</span>
    : <span className="text-gray-300 text-xs">⬜</span>;
}

export default function Week1AnalyticsSection() {
  const { data, loading } = useApiData("GetWeek1Analytics", {});

  if (loading) {
    return <div className="py-4 text-sm text-gray-400">Loading Week 1 data…</div>;
  }

  const learners = data?.learners ?? [];
  if (learners.length === 0) {
    return <div className="py-4 text-sm text-gray-400">No learners yet</div>;
  }

  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Name</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">TZ</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">🚡 (0-8)</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">🧱</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">📦 (0-4)</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">🚀</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">🎡 Score</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">Unlock</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {learners.map((l) => {
            const modulesComplete = [l.meddpiccSigned, l.camp101Signed, l.challengerSigned].filter(Boolean).length;
            const wdDone = l.wdScore !== null;
            const approachTotal = modulesComplete + Math.min(l.academyCount, 4) + (wdDone ? 1 : 0);
            const allDone = modulesComplete === 3 && wdDone;

            return (
              <tr key={l.viewerId} className={allDone ? "bg-green-50/50" : ""}>
                <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{l.name}</td>
                <td className="px-3 py-2"><TzPill tz={l.timezone} /></td>
                <td className="px-3 py-2 text-center">
                  <span className={approachTotal >= 8 ? "text-green-600 font-bold" : approachTotal >= 4 ? "text-amber-600 font-semibold" : "text-gray-600"}>
                    {approachTotal}/8
                  </span>
                </td>
                <td className="px-3 py-2 text-center"><StatusDot done={l.meddpiccSigned} /></td>
                <td className="px-3 py-2 text-center">
                  <span className={l.academyCount >= 4 ? "text-green-600 font-semibold" : "text-gray-600"}>
                    {l.academyCount}/4
                  </span>
                </td>
                <td className="px-3 py-2 text-center"><StatusDot done={l.challengerSigned} /></td>
                <td className="px-3 py-2 text-center">
                  {l.wdScore !== null ? (
                    <span className="font-semibold text-gray-800">{l.wdScore}/12</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {l.week1UnlockedAt ? (
                    <span className="text-green-600 text-[10px]">✅ {new Date(l.week1UnlockedAt).toLocaleDateString()}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {l.week1UnlockType && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      l.week1UnlockType === "earned"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : l.week1UnlockType === "legacy"
                        ? "bg-blue-50 text-blue-600 border border-blue-200"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    }`}>
                      {l.week1UnlockType}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
