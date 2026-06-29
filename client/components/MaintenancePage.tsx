import { useCallback } from "react";

export default function MaintenancePage() {
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ backgroundColor: "#ECFDF5" }}>
      <div className="text-center max-w-md space-y-6">
        <div className="text-6xl">🏔️</div>
        <h1 className="text-2xl font-bold text-emerald-900">Trail Maintenance</h1>
        <p className="text-emerald-700 text-base leading-relaxed">
          We're doing a bit of backend maintenance on the trail. Your progress is safe —
          check back in a few minutes and everything should be ready to go.
        </p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
          style={{ backgroundColor: "#065F46" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#047857")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#065F46")}
        >
          🔄 Try Again
        </button>
      </div>
    </div>
  );
}
