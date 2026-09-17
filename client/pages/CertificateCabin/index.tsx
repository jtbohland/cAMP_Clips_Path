import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData";
import { useViewer } from "@/components/ViewerContext";
import CertificateCard from "@/components/CertificateCard";
import { getCertificatesForPath, roleToPathKey } from "@/config/certificateConfig";

/** Role → human-readable path label for the certificate (external-friendly) */
function pathDisplayLabel(role: string): string {
  if (role === "SDR>Velocity Promo" || role === "Velocity Promo") return "Internal Promotion Path";
  if (role === "SDR") return "SDR Path";
  // All AE variants (Emerging, Majors, Velocity, Strategic, PSM, etc.) → "Account Executive Path"
  return "Account Executive Path";
}

export default function CertificateCabin() {
  const { viewer } = useViewer();
  const navigate = useNavigate();

  const { data, loading, isError } = useApiData(
    "GetCertificates",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  const certDefs = useMemo(() => {
    if (!data) return [];
    const pathKey = roleToPathKey(data.viewerRole);
    return getCertificatesForPath(pathKey, data.tierName);
  }, [data]);

  // Map earned status by key
  const earnedMap = useMemo(() => {
    if (!data) return new Map<string, { earned: boolean; earnedAt: string | null }>();
    return new Map(data.certificates.map((c) => [c.key, { earned: c.earned, earnedAt: c.earnedAt }]));
  }, [data]);

  const earnedCount = data?.certificates.filter((c) => c.earned).length ?? 0;
  const totalCount = certDefs.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-green-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 via-white to-green-50">
        <div className="text-center">
          <p className="text-gray-500">Unable to load certificates.</p>
          <button onClick={() => navigate("/")} className="mt-3 text-sm text-emerald-600 hover:underline">
            ← Back to Ascent
          </button>
        </div>
      </div>
    );
  }

  const pathLabel = pathDisplayLabel(data.viewerRole);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🏔️ Certificate Cabin</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your cAMP Ascent achievements — download or share on LinkedIn
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {earnedCount} of {totalCount} certificates earned
          </p>
        </div>

        {/* Certificate grid */}
        <div className="flex flex-col items-center gap-8">
          {certDefs.map((cert) => {
            const status = earnedMap.get(cert.key);
            const isAdmin = viewer?.isAdmin ?? false;
            return (
              <CertificateCard
                key={cert.key}
                cert={cert}
                earned={isAdmin || (status?.earned ?? false)}
                earnedAt={status?.earnedAt ?? (isAdmin ? new Date().toISOString() : null)}
                learnerName={data.viewerName}
                tierName={data.tierName}
                tierEmoji={data.tierEmoji}
                pathLabel={pathLabel}
              />
            );
          })}
        </div>

        {/* Back button */}
        <div className="text-center mt-10">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-xl bg-[#1B4332] text-white text-sm font-bold hover:bg-[#2D6A4F] transition-colors"
          >
            🧗 Back to Ascent
          </button>
        </div>
      </div>
    </div>
  );
}
