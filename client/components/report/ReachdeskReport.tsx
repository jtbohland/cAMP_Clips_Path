import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import { getLibraryPath } from "@/lib/libraryNav";
import PageHeader from "@/components/PageHeader";
import CampGearSection from "@/components/report/CampGearSection";

const REACHDESK_ZOOM_URL = "https://amplitude.zoom.us/clips/share/1HnN8co4TT-XfIREH0ZodQ?pageType=web";

const REACHDESK_RESOURCES = [
  {
    label: "📓Reachdesk: How to Use to Drive Pipeline",
    url: "https://docs.google.com/presentation/d/1pScrYlHft9xSNVfbytNvNpJaH0v-gM0W4tsWX_WKxKw/edit?slide=id.g34856135304_2_192#slide=id.g34856135304_2_192",
    type: "slides",
  },
];

export default function ReachdeskReport() {
  const navigate = useNavigate();
  const { viewer } = useViewer();
  const { run: logClick } = useApi("LogPitchClick");

  const handleResourceClick = useCallback((label: string) => {
    if (viewer?.id) logClick({ viewerId: viewer.id, pitchName: `cAMP Gear: ${label}` });
  }, [viewer?.id, logClick]);

  const handleRewatch = useCallback(() => {
    window.open(REACHDESK_ZOOM_URL, "_blank");
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ backgroundColor: "#ECFDF5" }}>
      <PageHeader
        emoji="📋"
        title="Ranger Report Review"
        showBackButton={false}
      />

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-5 pb-8">

        {/* Clip title */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-base font-medium text-indigo-500 text-center mb-1">
            Clip 4: 📇 Prospecting Process + Reachdesk
          </p>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📝</span>
            <h2 className="text-base font-bold text-gray-900">Summary</h2>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            The deck below introduces Reachdesk, the corporate gifting platform Amplitude uses to help SDRs and AEs drive pipeline, boost response rates, and build stronger relationships with prospects and customers. It explains where Reachdesk fits in the sales motion, shares early performance highlights, and outlines practical use cases to stand out in crowded inboxes and accelerate deals.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            You'll also find clear guardrails and budget guidelines, plus step-by-step setup instructions so you can quickly get access, connect to Salesforce, and start sending campaigns that are trackable and tied to real revenue impact.
          </p>
        </div>

        {/* Key Takeaways */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔑</span>
            <h2 className="text-base font-bold text-gray-900">Key Takeaways</h2>
          </div>
          <ul className="space-y-2.5 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span>Each AE and SDR has a <strong>$350 monthly Reachdesk budget</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span>Budgets reset at the start of each month (does not roll over)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <div>
                <span>Need additional budget?</span>
                <ul className="mt-1.5 ml-4 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-500 mt-0.5">◦</span>
                    <div>
                      <span>Post a request in <strong>#reachdesk-funds</strong> with:</span>
                      <ul className="mt-1 ml-4 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">–</span>
                          <span>Your role (AE or SDR)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">–</span>
                          <span>The use case and what you're trying to accomplish</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">–</span>
                          <span>Why the additional budget is needed now vs. next month</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">–</span>
                          <span>Your FLM tagged for approval</span>
                        </li>
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </div>

        {/* 🎒 cAMP Gear */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <CampGearSection resources={REACHDESK_RESOURCES} onResourceClick={handleResourceClick} />
        </div>

        {/* Rewatch + Back to Clips */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRewatch}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
            >
              🌱 Rewatch Clip
            </button>
            <button
              onClick={() => navigate(getLibraryPath())}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              🎞️ Back to cAMP Clips
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
