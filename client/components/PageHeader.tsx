import { useNavigate } from "react-router";
import { getLibraryPath } from "@/lib/libraryNav";

type PageHeaderProps = {
  emoji: string;
  title: string;
  subtitle: string;
  showBackButton?: boolean;
  subtitleClassName?: string;
};

/**
 * Standardized sub-page header bar.
 * White background, bottom border, emoji + title on left, back button on right.
 */
export default function PageHeader({ emoji, title, subtitle, showBackButton = true, subtitleClassName }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div
      className="border-b border-green-900/20 px-6 py-4"
      style={{ backgroundColor: "#1B4332" }}
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
        {/* Left — title + subtitle */}
        <div className="flex items-start gap-2.5">
          <span className="text-2xl leading-tight mt-0.5">{emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{title}</h1>
            <p className={subtitleClassName ?? "text-sm text-green-200 mt-0.5"}>{subtitle}</p>
          </div>
        </div>

        {/* Right — back button */}
        {showBackButton && (
          <button
            onClick={() => navigate(getLibraryPath())}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-200/30 bg-white/15 text-sm font-medium text-white hover:bg-white/25 transition-colors shadow-sm"
          >
            🎞️ Back to cAMP Clips
          </button>
        )}
      </div>
    </div>
  );
}
