import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApi } from "@/hooks/useApi";
import { useViewer } from "@/components/ViewerContext";
import { toast } from "sonner";
import { FIRST_CLIP_ID } from "@/lib/constants";

const ROLES = [
  "SDR",
  "Velocity AE",
  "Emerging AE",
  "Majors AE",
  "Strategic AE",
  "PSM",
  "Renewals",
] as const;

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

export default function RegistrationForm() {
  const navigate = useNavigate();
  const { setViewer } = useViewer();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [ascentDay1, setAscentDay1] = useState(getTodayString());
  const { run: registerViewer, loading } = useApi("RegisterViewer");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !email.trim() || !role || !ascentDay1) {
        toast.error("Please fill in all fields");
        return;
      }
      try {
        const result = await registerViewer({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role,
          ascentDay1,
        });
        if (result?.viewer) {
          setViewer(result.viewer);
          toast.success(result.isNew ? "Welcome! You're all set." : "Welcome back!");
          navigate(`/watch/${FIRST_CLIP_ID}`, { replace: true });
        }
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message: unknown }).message)
            : String(error);
        toast.error("Registration failed: " + message);
      }
    },
    [name, email, role, ascentDay1, registerViewer, setViewer, navigate]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <span className="text-4xl">🏕️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to cAMP Ascent</h2>
          <p className="mt-2 text-sm text-gray-500">
            Enter your info to begin your training journey through the trails.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="jane@amplitude.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Role — native <select> */}
          <div className="space-y-1.5">
            <label htmlFor="reg-role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="reg-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_10px_center] bg-no-repeat"
            >
              <option value="" disabled>
                Select your role
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Day 1 of Ascent */}
          <div className="space-y-1.5">
            <label htmlFor="reg-day1" className="block text-sm font-medium text-gray-700">
              Day 1 of Ascent
            </label>
            <input
              id="reg-day1"
              type="date"
              value={ascentDay1}
              onChange={(e) => setAscentDay1(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-xs text-amber-600 font-medium">
              ⚠️ Defaults to today. Do not click "Start the Ascent" if you are not ready to begin!
            </p>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white transition-colors shadow-md"
          >
            {loading ? "Hitting the trail..." : "🥾 Start the Ascent"}
          </button>
        </form>
      </div>
    </div>
  );
}
