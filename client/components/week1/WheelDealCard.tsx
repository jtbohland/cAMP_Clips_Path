import { useState, useCallback } from "react";
import { toast } from "sonner";

const VALID_SCENARIOS = [
  'Tell Me About It',
  'Handle the Objection',
  'Scenario',
  'Challenger Play',
];

type WheelDealCardProps = {
  isVerified: boolean;
  verificationData?: { product: string; scenario: string; score: number; completedAt: string };
  isLegacy: boolean;
  onSubmit: (data: { product: string; scenario: string; score: number }) => Promise<void>;
};

export default function WheelDealCard({ isVerified, verificationData, isLegacy, onSubmit }: WheelDealCardProps) {
  const [product, setProduct] = useState("");
  const [scenario, setScenario] = useState("");
  const [score, setScore] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const WHEEL_AND_DEAL_URL = "https://app.superblocks.com/code-mode/applications/fef97ebe-4fb9-401f-b97c-c52c1693b31b/";

  const handleSubmit = useCallback(async () => {
    if (!product.trim()) {
      toast.error("Please enter the product from your spin");
      return;
    }
    if (!scenario) {
      toast.error("Please select a challenge type");
      return;
    }
    if (score === "") {
      toast.error("Please enter your score");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ product: product.trim(), scenario, score: Number(score) });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit verification");
    } finally {
      setSubmitting(false);
    }
  }, [product, scenario, score, onSubmit]);

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-[#1B4332]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎡</span>
          <h3 className="text-base font-bold text-white">Wheel & Deal</h3>
          {isVerified && <span className="ml-auto text-sm text-green-300">✅ Verified</span>}
        </div>
        <p className="text-xs text-white/70 mt-1">
          Complete a spin with your manager and log your results
        </p>
      </div>

      <div className="bg-white divide-y divide-gray-100">
        {/* W&D Link */}
        <div className="px-5 py-3">
          <a
            href={WHEEL_AND_DEAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-medium hover:bg-emerald-100 transition-colors"
          >
            🎡 Open Wheel & Deal
          </a>
        </div>

        {isVerified && verificationData ? (
          <div className="px-5 py-3 bg-green-50">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase">Product</p>
                <p className="text-gray-800 font-medium">{verificationData.product}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase">Challenge</p>
                <p className="text-gray-800 font-medium">{verificationData.scenario}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase">Score</p>
                <p className="text-gray-800 font-medium">{verificationData.score}/12</p>
              </div>
            </div>
            <p className="text-xs text-green-700 mt-2">
              Verified on {new Date(verificationData.completedAt).toLocaleDateString()}
            </p>
          </div>
        ) : isLegacy ? (
          <div className="px-5 py-3">
            <p className="text-xs text-gray-400 italic">
              Verification not required — you started before Week 1 was introduced
            </p>
          </div>
        ) : (
          <div className="px-5 py-3 space-y-3">
            {/* Product — text input */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Product
              </label>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Which product did you spin?"
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Challenge Type — dropdown */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Challenge Type
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="">Select challenge type...</option>
                {VALID_SCENARIOS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Score */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Score
              </label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="What was your score?"
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !product.trim() || !scenario || score === ""}
              className="w-full py-2.5 rounded-lg bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#2D6A4F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "🎡 Submit Result"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
