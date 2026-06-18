import { useState, useMemo, useRef, useEffect } from "react";

type TranscriptEntry = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

type TranscriptPanelProps = {
  transcript: string | null;
  currentSeconds: number;
  onSeek: (seconds: number) => void;
};

/** Parse a simple VTT/SRT-like transcript (timestamp lines + text) */
function parseTranscript(raw: string): TranscriptEntry[] {
  if (!raw || !raw.trim()) return [];
  const entries: TranscriptEntry[] = [];

  // Try VTT-style: "00:01:23.456 --> 00:01:30.789\nSome text"
  const vttPattern = /(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})\s*\n([\s\S]*?)(?=\n\n|\n\d|\n$|$)/g;
  let match: RegExpExecArray | null;
  while ((match = vttPattern.exec(raw)) !== null) {
    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    const text = match[3].replace(/\n/g, " ").trim();
    if (text) entries.push({ startSeconds: start, endSeconds: end, text });
  }

  if (entries.length > 0) return entries;

  // Fallback: line-by-line with timestamps like "[00:05] Some text"
  const lines = raw.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const lineMatch = line.match(/\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.+)/);
    if (lineMatch) {
      const seconds = parseSimpleTimestamp(lineMatch[1]);
      entries.push({ startSeconds: seconds, endSeconds: seconds + 10, text: lineMatch[2].trim() });
    }
  }

  return entries;
}

function parseTimestamp(ts: string): number {
  const parts = ts.replace(",", ".").split(":");
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
}

function parseSimpleTimestamp(ts: string): number {
  const parts = ts.split(":");
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TranscriptPanel({ transcript, currentSeconds, onSeek }: TranscriptPanelProps) {
  const [search, setSearch] = useState("");
  const activeRef = useRef<HTMLButtonElement>(null);

  const entries = useMemo(() => parseTranscript(transcript ?? ""), [transcript]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => e.text.toLowerCase().includes(q));
  }, [entries, search]);

  // Auto-scroll to active entry
  useEffect(() => {
    if (!search && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentSeconds, search]);

  if (!transcript || !transcript.trim()) {
    return (
      <div className="flex flex-col h-full bg-white border-l border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            📄 Transcript
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-gray-400 text-center">
            No transcript available yet.
            <br />
            <span className="text-xs">Transcripts will appear here once uploaded.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-2">
          📄 Transcript
        </h3>
        <input
          type="text"
          placeholder="Search transcript…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 p-4 text-center">No results</p>
        ) : (
          filtered.map((entry, idx) => {
            const isActive =
              !search && currentSeconds >= entry.startSeconds && currentSeconds < entry.endSeconds;
            return (
              <button
                key={idx}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSeek(entry.startSeconds)}
                className={`w-full text-left px-4 py-2.5 flex gap-2.5 hover:bg-gray-50 transition-colors border-l-2 ${
                  isActive
                    ? "border-l-indigo-600 bg-indigo-50/50"
                    : "border-l-transparent"
                }`}
              >
                <span className="text-[10px] font-mono text-gray-400 pt-0.5 flex-shrink-0 w-10">
                  {formatTime(entry.startSeconds)}
                </span>
                <span className="text-xs text-gray-700 leading-relaxed">{entry.text}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
