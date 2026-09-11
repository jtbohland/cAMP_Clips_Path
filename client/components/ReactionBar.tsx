import { useState, useCallback } from "react";

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
    <div className="pt-2">
      <p className="text-[10px] text-gray-400 font-medium mb-1 text-center">Add your cAMP Kudos!</p>
      <div className="flex flex-wrap gap-1 justify-center">
        {REACTION_EMOJIS.map((emoji) => {
          const count = counts[emoji] ?? 0;
          const isActive = userReactions.has(emoji);
          const isPending = pendingEmoji === emoji;

          return (
            <button
              key={emoji}
              onClick={() => handleToggle(emoji)}
              disabled={disabled || isPending}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-all
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
              {count > 0 && (
                <span className={`text-[9px] font-bold ${isActive ? "text-green-700" : "text-gray-500"}`}>
                  {count}
                </span>
              )}
              <span className="text-xs leading-none">{emoji}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { REACTION_EMOJIS };
export type { ReactionCounts, UserReactions };
