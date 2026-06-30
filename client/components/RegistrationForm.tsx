import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { useViewer } from "@/components/ViewerContext";
import { toast } from "sonner";
import WelcomeModal from "@/components/WelcomeModal";

const TIMEZONES = [
  { value: "NAMER", label: "NAMER (Americas)" },
  { value: "EMEA", label: "EMEA (Europe, Middle East & Africa)" },
  { value: "AAPJ", label: "AAPJ (Asia, Australia, Pacific & Japan)" },
] as const;

const ROLES = [
  "SDR",
  "Velocity AE",
  "Emerging AE",
  "Majors AE",
  "Strat AE",
  "PSM",
  "Renewals",
  "Admin",
] as const;

const MANAGERS = [
  { name: "Adam Yapkowitz", email: "adam.yapkowitz@amplitude.com" },
  { name: "Alice Steels", email: "alice.steels@amplitude.com" },
  { name: "Anush Arora", email: "anush.arora@amplitude.com" },
  { name: "Brian Wagner", email: "brian.wagner@amplitude.com" },
  { name: "Gamon Yaklich", email: "gamony@amplitude.com" },
  { name: "Halle Morris", email: "halle.morris@amplitude.com" },
  { name: "Jeremy Grinbaum", email: "jeremy.grinbaum@amplitude.com" },
  { name: "Jessica Arnold", email: "jessica.arnold@amplitude.com" },
  { name: "Joe Skupinsky", email: "joe.skupinsky@amplitude.com" },
  { name: "Kazuki Hirose", email: "kazuki.hirose@amplitude.com" },
  { name: "Kevin Shain", email: "kevin.shain@amplitude.com" },
  { name: "Kier Johnson", email: "kier.johnson@amplitude.com" },
  { name: "Lauren Hargarten", email: "lauren.hargarten@amplitude.com" },
  { name: "Lee Edwards", email: "lee.edwards@amplitude.com" },
  { name: "Madhuri Krishnan", email: "madhuri.krishnan@amplitude.com" },
  { name: "Maggie Peracchi", email: "maggie.peracchi@amplitude.com" },
  { name: "Mathieu Di Franco", email: "mathieu.difranco@amplitude.com" },
  { name: "Matt Bennett", email: "matthew.bennett@amplitude.com" },
  { name: "Nick Iyengar", email: "nick.iyengar@amplitude.com" },
  { name: "Nick Ryan", email: "nick.ryan@amplitude.com" },
  { name: "Nicolette Conti", email: "nicolette@amplitude.com" },
  { name: "Rhiannon Sheehan", email: "rhiannon.sheehan@amplitude.com" },
  { name: "Rob Bow", email: "robert@amplitude.com" },
  { name: "Shawn Hensley", email: "shawn.hensley@amplitude.com" },
  { name: "Tansu Yegen", email: "tansu.yegen@amplitude.com" },
] as const;

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/* ─── Welcome Memo Tiles (Left Column) ─── */

function WelcomeMemoTile1() {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: "#1B4332" }}>
        <span className="text-lg">🏕️</span>
        <h3 className="text-sm font-bold text-white">A Welcome From Your Enablement Manager</h3>
      </div>
      {/* Body */}
      <div className="px-5 py-4 bg-white text-sm text-gray-700 space-y-3 leading-relaxed">
        <p>
          Hello fellow Ampliteer 👋🏻! I'm <strong>JT Bohland</strong> (Chicago) — Sr. Global Enablement
          Program Manager for Sales at Amplitude. I support SDRs, AEs, and PSMs worldwide through
          onboarding and everboarding.
        </p>
        <p>
          <strong>cAMP Ascent: Sales</strong> is your role-specific onboarding path designed to ramp
          you as an SDR, AE, or PSM on how we sell, operate, and win at Amplitude.
        </p>
        <div>
          <p className="font-semibold text-gray-800 mb-1">Your journey:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li><strong style={{ color: "#6366F1" }}>Base cAMP + Pathfinder</strong> — learn Amplitude, products, core GTM</li>
            <li><strong style={{ color: "#6366F1" }}>cAMP Ascent</strong> — 4 weeks of SDR/AE/PSM skills, tools &amp; process (this guide)</li>
            <li><strong style={{ color: "#6366F1" }}>cAMP 101: Product Training</strong> — deepen product &amp; technical fluency</li>
            <li><strong style={{ color: "#6366F1" }}>cAMP 201 in San Francisco</strong> — in-person capstone</li>
          </ol>
        </div>
        <p>
          Ascent is <strong style={{ color: "#DC2626" }}>~32 hours over 4–5 weeks</strong> (~1h 15m/day). Block calendar time to
          stay on pace.
        </p>
        <p className="text-gray-500 italic">Questions? Slack me anytime.</p>
      </div>
    </div>
  );
}

function WelcomeMemoTile2() {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: "#1B4332" }}>
        <span className="text-lg">🪢</span>
        <h3 className="text-sm font-bold text-white">Meet Your Belay Buddy</h3>
      </div>
      {/* Body */}
      <div className="px-5 py-4 bg-white text-sm text-gray-700 space-y-3 leading-relaxed">
        <p>
          Your <strong>Belay Buddy</strong> is your go-to mentor through onboarding — you'll meet
          with them regularly. Take advantage of their experience as an Ampliteer and as an SDR, AE, or
          PSM.
        </p>
        <p style={{ color: "#DC2626" }} className="font-semibold">
          If you haven't been assigned a Belay Buddy yet, ask your manager.
        </p>
      </div>
    </div>
  );
}

/* ─── Main Registration Form Component ─── */

export default function RegistrationForm() {
  const { setViewer } = useViewer();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("");
  const [role, setRole] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [belayBuddy, setBelayBuddy] = useState("");
  const [ascentDay1, setAscentDay1] = useState(getTodayString());
  const { run: registerViewer, loading } = useApi("RegisterViewer");
  const [showWelcome, setShowWelcome] = useState(false);
  const [registeredViewerId, setRegisteredViewerId] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (
        !name.trim() ||
        !email.trim() ||
        !timezone ||
        !role ||
        !managerName.trim() ||
        !managerEmail.trim() ||
        !belayBuddy.trim() ||
        !ascentDay1
      ) {
        toast.error("Please fill in all fields");
        return;
      }
      try {
        const result = await registerViewer({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role,
          timezone,
          managerName: managerName.trim(),
          managerEmail: managerEmail.trim().toLowerCase(),
          belayBuddy: belayBuddy.trim(),
          ascentDay1,
        });
        if (result?.viewer) {
          setViewer(result.viewer);
          if (result.isNew) {
            setRegisteredViewerId(result.viewer.id);
            setShowWelcome(true);
          } else {
            toast.success("Welcome back!");
          }
        }
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message: unknown }).message)
            : String(error);
        toast.error("Registration failed: " + message);
      }
    },
    [name, email, timezone, role, managerName, managerEmail, belayBuddy, ascentDay1, registerViewer, setViewer]
  );

  // After registration, show welcome modal
  if (showWelcome && registeredViewerId) {
    return (
      <WelcomeModal
        viewerId={registeredViewerId}
        onDismiss={() => setShowWelcome(false)}
      />
    );
  }

  const selectClasses =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_10px_center] bg-no-repeat";

  const inputClasses =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6">
      <div className="w-full max-w-5xl mx-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* ─── LEFT COLUMN: Welcome Memos ─── */}
        <div className="space-y-4">
          {/* Callout banner */}
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5">
            <span className="text-base">📌</span>
            <span className="text-sm font-bold text-amber-800">
              Please Read BEFORE Registering
            </span>
          </div>

          <WelcomeMemoTile1 />
          <WelcomeMemoTile2 />
        </div>

        {/* ─── RIGHT COLUMN: Registration Form ─── */}
        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          {/* Header */}
          <div className="mb-5 text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <span className="text-3xl">🏕️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Welcome to cAMP Ascent</h2>
            <p className="mt-1 text-xs text-gray-500">
              Enter your info to begin your training journey.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1">
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
                className={inputClasses}
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
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
                className={inputClasses}
              />
            </div>

            {/* Role */}
            <div className="space-y-1">
              <label htmlFor="reg-role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className={selectClasses}
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

            {/* Manager */}
            <div className="space-y-1">
              <label htmlFor="reg-manager" className="block text-sm font-medium text-gray-700">
                Manager
              </label>
              <select
                id="reg-manager"
                value={managerName}
                onChange={(e) => {
                  const selected = MANAGERS.find((m) => m.name === e.target.value);
                  setManagerName(selected?.name ?? "");
                  setManagerEmail(selected?.email ?? "");
                }}
                required
                className={selectClasses}
              >
                <option value="" disabled>
                  Select your manager
                </option>
                {MANAGERS.map((m) => (
                  <option key={m.email} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Belay Buddy */}
            <div className="space-y-1">
              <label htmlFor="reg-belay" className="block text-sm font-medium text-gray-700">
                Belay Buddy
              </label>
              <input
                id="reg-belay"
                type="text"
                placeholder="First and last name"
                value={belayBuddy}
                onChange={(e) => setBelayBuddy(e.target.value)}
                required
                className={inputClasses}
              />
              <p className="text-xs text-gray-500">
                If your manager has decided to be your mentor, type their name in.
              </p>
            </div>

            {/* Timezone */}
            <div className="space-y-1">
              <label htmlFor="reg-timezone" className="block text-sm font-medium text-gray-700">
                Timezone Region
              </label>
              <select
                id="reg-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
                className={selectClasses}
              >
                <option value="" disabled>
                  Select your timezone region
                </option>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Day 1 of Ascent */}
            <div className="space-y-1">
              <label htmlFor="reg-day1" className="block text-sm font-medium text-gray-700">
                Day 1 of Ascent
              </label>
              <input
                id="reg-day1"
                type="date"
                value={ascentDay1}
                readOnly
                tabIndex={-1}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-amber-600 font-medium">
                ⚠️ Defaults to today. Do not click "Start the Ascent" if you are not ready to begin!
              </p>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white transition-colors shadow-md mt-1"
            >
              {loading ? "Hitting the trail..." : "🥾 Start the Ascent"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
