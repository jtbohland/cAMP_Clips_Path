/** Read-only section components for the day audit view */

export function SummarySection({ summary, objectives, smes }: {
  summary: string | null;
  objectives: string[];
  smes: Array<{ name: string; title: string; note?: string | null }>;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>📝</span> Summary & Learning Objectives
      </h3>

      {summary && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{summary}</p>
      )}
      {!summary && (
        <p className="text-sm text-gray-400 italic mb-4">No summary available for this topic yet.</p>
      )}

      {objectives.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Learning Objectives:</p>
          <ol className="list-decimal list-inside space-y-1">
            {objectives.map((obj, i) => (
              <li key={i} className="text-sm text-gray-700">{obj}</li>
            ))}
          </ol>
        </div>
      )}

      {smes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Subject Matter Experts:</p>
          <div className="space-y-1">
            {smes.map((sme, i) => (
              <p key={i} className="text-sm text-gray-700">
                <span className="font-medium">{sme.name}</span>
                <span className="text-gray-400"> · {sme.title}</span>
                {sme.note && <span className="text-amber-500 italic"> ({sme.note})</span>}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrailMarkersSection({ markers, clipTitle }: {
  markers: Array<{
    id: string;
    questionText: string;
    options: any;
    correctOption: number;
    correctFeedback: string | null;
    triggerAtSeconds: number | null;
    sortOrder: number;
  }>;
  clipTitle: string;
}) {
  if (markers.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>🌲</span> Trail Markers — {clipTitle}
      </h3>
      <div className="space-y-4">
        {markers.map((m, idx) => {
          const opts = Array.isArray(m.options) ? m.options : [];
          let feedback: { emoji?: string; label?: string; explanation?: string } = {};
          try { feedback = m.correctFeedback ? JSON.parse(m.correctFeedback) : {}; } catch { /* */ }

          return (
            <div key={m.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Q{idx + 1}</span>
                {m.triggerAtSeconds != null && (
                  <span className="text-[10px] text-gray-400">@ {Math.floor(m.triggerAtSeconds / 60)}:{String(m.triggerAtSeconds % 60).padStart(2, "0")}</span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 mb-2">{m.questionText}</p>
              <div className="space-y-1 mb-2">
                {opts.map((opt: string, oi: number) => (
                  <div key={oi} className={`flex items-start gap-2 text-sm rounded px-2 py-1 ${
                    oi === m.correctOption
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium"
                      : "text-gray-600"
                  }`}>
                    <span className="text-xs mt-0.5">{oi === m.correctOption ? "✅" : "○"}</span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
              {feedback.explanation && (
                <p className="text-xs text-gray-500 italic border-l-2 border-emerald-300 pl-2">
                  {feedback.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SearchRescueSection({ questions, clipTitle }: {
  questions: Array<{
    id: string;
    questionText: string;
    options: any;
    correctOption: number;
    correctFeedback: string | null;
    sortOrder: number;
  }>;
  clipTitle: string;
}) {
  if (questions.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>🚁</span> Search & Rescue — {clipTitle}
      </h3>
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          return (
            <div key={q.id} className="border border-amber-100 rounded-lg p-3 bg-white">
              <p className="text-xs font-bold text-amber-700 mb-1">S&R Q{idx + 1}</p>
              <p className="text-sm font-medium text-gray-900 mb-2">{q.questionText}</p>
              <div className="space-y-1">
                {opts.map((opt: string, oi: number) => (
                  <div key={oi} className={`flex items-start gap-2 text-sm rounded px-2 py-1 ${
                    oi === q.correctOption ? "bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium" : "text-gray-600"
                  }`}>
                    <span className="text-xs mt-0.5">{oi === q.correctOption ? "✅" : "○"}</span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeatherStormSection({ wts, clipTitle }: {
  wts: { overview: string; takeaways: any; timerMinutes: number } | null;
  clipTitle: string;
}) {
  if (!wts) return null;
  const takeaways = Array.isArray(wts.takeaways) ? wts.takeaways : [];

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>⛈️</span> Weather the Storm — {clipTitle}
        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full ml-auto">{wts.timerMinutes} min timer</span>
      </h3>
      <p className="text-sm text-gray-700 mb-3">{wts.overview}</p>
      {takeaways.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Key Takeaways:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {takeaways.map((t: string, i: number) => (
              <li key={i} className="text-sm text-gray-700">{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function GearSection({ resources, clipTitle }: {
  resources: any;
  clipTitle: string;
}) {
  const items = Array.isArray(resources) ? resources : [];
  if (items.length === 0) return null;

  const typeEmoji: Record<string, string> = {
    slides: "💻", spekit: "🐙", sfdc: "☁️", gdrive: "📑", link: "🔗",
    sheets: "📊", mindtickle: "🧠", slack: "💬",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>🎒</span> cAMP Gear — {clipTitle}
      </h3>
      <div className="space-y-2">
        {items.map((r: any, i: number) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
          >
            <span>{typeEmoji[r.type] ?? "📎"}</span>
            <span className="text-sm text-gray-800 font-medium">{r.label}</span>
            {r.note && <span className="text-xs text-gray-400 ml-auto">{r.note}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
