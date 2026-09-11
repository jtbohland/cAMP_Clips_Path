import { useState, useCallback, useMemo } from "react";

const REACTION_EMOJIS = ["👍", "⭐", "❤️", "🏆", "🔥", "👏", "⚡", "⛰️", "🦋", "💡", "🦅", "🙌🏻"];

type ReactionCounts = Record<string, number>;
type UserReactions = Set<string>;

type ReactionBarProps = {
  lessonKey: string;
  /** Counts per emoji across all learners */
  counts: ReactionCounts;
  /** Emojis the current user has toggled on */
  userReactions: UserReactions;
  /** Called when user toggles a reaction */
  onToggle: (lessonKey: string, emoji: string) => void;
  disabled?: boolean;
};

export default function ReactionBar({ lessonKey, counts, userReactions, onToggle, disabled }: ReactionBarProps) {
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (emoji: string) => {
      if (disabled || pendingEmoji) return;
      setPendingEmoji(emoji);
      try {
        await onToggle(lessonKey, emoji);
      } finally {
        setPendingEmoji(null);
      }
    },
    [lessonKey, onToggle, disabled, pendingEmoji]
  );

  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {REACTION_EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const isActive = userReactions.has(emoji);
        const isPending = pendingEmoji === emoji;

        return (
          <button
            key={emoji}
            onClick={() => handleToggle(emoji)}
            disabled={disabled || isPending}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all
              ${
                isActive
                  ? "bg-green-100 border border-green-300 shadow-sm"
                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              }
              ${isPending ? "opacity-60" : ""}
              ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            `}
            title={`${count} reaction${count !== 1 ? "s" : ""}`}
          >
            <span className="text-sm">{emoji}</span>
            {count > 0 && (
              <span className={`text-[10px] font-semibold ${isActive ? "text-green-700" : "text-gray-500"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { REACTION_EMOJIS };
export type { ReactionCounts, UserReactions };
