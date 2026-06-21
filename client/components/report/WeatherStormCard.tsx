type WeatherStormCardProps = {
  overview: string;
  takeaways: string[];
};

export default function WeatherStormCard({ overview, takeaways }: WeatherStormCardProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">⛈️</span>
        <h2 className="text-base font-bold text-gray-900">Weather the Storm</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{overview}</p>
      {takeaways.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Key Takeaways
          </h3>
          <ul className="space-y-1.5">
            {takeaways.map((takeaway: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-900">
                <span className="text-indigo-600 font-bold mt-0.5">•</span>
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
