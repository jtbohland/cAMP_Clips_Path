import { useNavigate, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useViewer } from "./ViewerContext";

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { viewer, logout } = useViewer();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const tabs = [
    { path: "/library", label: "Clips", emoji: "🎬" },
    { path: "/xp", label: "XP-lanation", emoji: "✨" },
    { path: "/analytics", label: "Analytics", emoji: "📊" },
    { path: "/admin", label: "Admin", emoji: "⚙️" },
  ];

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Logo / Brand */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => navigate("/library")}
      >
        <span className="text-2xl">🏕️</span>
        <h1 className="text-xl font-bold text-primary tracking-tight">
          cAMP Ascent
        </h1>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
          Training
        </span>
      </div>

      {/* Navigation tabs */}
      <nav className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(tab.path)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* User info */}
      <div className="flex items-center gap-3">
        {viewer && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">
                {viewer.name}
              </span>
              <span className="text-xs text-muted-foreground">{viewer.role}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <Icon icon="log-out" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
