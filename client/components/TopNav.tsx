import { useNavigate, useLocation } from "react-router";
import { useViewer } from "./ViewerContext";

const NAV_TABS = [
  { path: "/library", label: "Clips", emoji: "🎬" },
  { path: "/xp", label: "XP-lanation", emoji: "🔭" },
  { path: "/analytics", label: "Analytics", emoji: "📊" },
  { path: "/admin", label: "Admin", emoji: "⚙️" },
];

/** Pages that show a back button instead of the tab bar */
const PAGE_META: Record<string, { title: string; emoji: string; description: string }> = {
  "/xp": { title: "XP-lanation", emoji: "🔭", description: "How to earn XP, unlock badges, and ascend the ranks" },
  "/analytics": { title: "Analytics", emoji: "📊", description: "Track your progress across all clips" },
  "/admin": { title: "Admin", emoji: "⚙️", description: "Manage the cAMP Ascent experience" },
};

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { viewer } = useViewer();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Determine if we're on a sub-page that should show back button instead of tabs
  const currentPageMeta = PAGE_META[location.pathname] ?? null;
  const showTabs = !currentPageMeta;

  return (
    <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Row 1: Brand + User */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Brand */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => navigate("/library")}
        >
          <span className="text-2xl">🏕️</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">
              cAMP Ascent: Sales
            </h1>
            <p className="text-[11px] text-gray-500 leading-tight">
              🎞️ Watch. Engage. Ascend.
            </p>
          </div>
        </div>

        {/* User info — no logout button */}
        {viewer && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">
                {viewer.name}
              </span>
              <span className="text-xs text-gray-500">{viewer.role}</span>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Nav tabs OR Back button + page header */}
      {showTabs ? (
        <div className="flex justify-center pb-2">
          <nav className="flex items-center gap-1 bg-gray-50/50 rounded-xl p-1">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive(tab.path)
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                }`}
              >
                <span className="text-base">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      ) : (
        <div className="px-6 pb-3">
          <button
            onClick={() => navigate("/library")}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors mb-2"
          >
            ← 🎞️ Back to cAMP Clips
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentPageMeta.emoji}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {currentPageMeta.title}
              </h2>
              <p className="text-xs text-gray-500">
                {currentPageMeta.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
