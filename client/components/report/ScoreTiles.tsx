type ScoreTilesProps = {
  engagementScore: number | null;
  engagementThreshold: number;
  trailMarkerCorrect: number;
  trailMarkerTotal: number;
  searchRescueCorrect: number;
  searchRescueTotal: number;
  searchRescueTriggered: boolean;
};

export default function ScoreTiles({
  engagementScore,
  engagementThreshold,
  trailMarkerCorrect,
  trailMarkerTotal,
  searchRescueCorrect,
  searchRescueTotal,
  searchRescueTriggered,
}: ScoreTilesProps) {
  const passed = engagementScore !== null && engagementScore >= engagementThreshold;

  return (
    <div className="flex items-stretch gap-3">
      {/* Tile 1: Engagement Score */}
      <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
        <div
          className={`text-3xl font-bold ${
            engagementScore === null
              ? "text-gray-400"
              : passed
                ? "text-green-600"
                : "text-red-500"
          }`}
        >
          {engagementScore !== null ? `${engagementScore}%` : "—"}
        </div>
        <p className="text-xs font-medium text-gray-700 mt-1.5">🦉 Engagement Score</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{engagementThreshold}% threshold</p>
      </div>

      {/* Tile 2: Trail Markers */}
      <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
        <div className="text-3xl font-bold text-gray-900">
          {trailMarkerCorrect}/{trailMarkerTotal}
        </div>
        <p className="text-xs font-medium text-gray-700 mt-1.5">🪧 Trail Markers</p>
      </div>

      {/* Tile 3: Search & Rescue (only if triggered) */}
      {searchRescueTriggered && (
        <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">
            {searchRescueCorrect}/{searchRescueTotal}
          </div>
          <p className="text-xs font-medium text-gray-700 mt-1.5">🚁 Search & Rescue</p>
        </div>
      )}
    </div>
  );
}
