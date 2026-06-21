import { useNavigate } from "react-router";

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
      className="border-b border-gray-200 px-6 py-4"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
        {/* Left — title + subtitle */}
        <div className="flex items-start gap-2.5">
          <span className="text-2xl leading-tight mt-0.5">{emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
            <p className={subtitleClassName ?? "text-sm text-gray-500 mt-0.5"}>{subtitle}</p>
          </div>
        </div>

        {/* Right — back button */}
        {showBackButton && (
          <button
            onClick={() => navigate("/library")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            🎞️ Back to cAMP Clips
          </button>
        )}
      </div>
    </div>
  );
}
