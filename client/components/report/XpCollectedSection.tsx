type XpEvent = {
  eventType: string;
  xpAmount: number;
};

type XpCollectedSectionProps = {
  xpEvents: XpEvent[];
  totalXpEarned: number;
  formatEventType: (type: string) => string;
};

export default function XpCollectedSection({
  xpEvents,
  totalXpEarned,
  formatEventType,
}: XpCollectedSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🪵</span>
        <h2 className="text-base font-bold text-gray-900">XP Collected</h2>
        <span className="ml-auto text-lg font-bold text-indigo-600">+{totalXpEarned} XP</span>
      </div>
      {xpEvents.length > 0 ? (
        <div className="space-y-1.5">
          {xpEvents.map((event, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{formatEventType(event.eventType)}</span>
              <span className="font-medium text-gray-900">+{event.xpAmount} XP</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No XP events recorded yet.</p>
      )}
    </div>
  );
}
