import { useState } from "react";
import {
  Eye,
  EyeOff,
  Zap,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../state-manager/hooks/authHook";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Pipeline analytics",
    desc: "Track every stage from raw upload to forecast output.",
  },
  {
    icon: TrendingUp,
    title: "Demand forecasting",
    desc: "ARIMA, SARIMA and machine-learning models in one workflow.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    desc: "Admin, analyst, and viewer tiers keep data secure.",
  },
];

function PasswordInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Password"
        disabled={disabled}
        autoComplete="current-password"
        className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400 transition"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function SigninPage() {
  const { error, login } = useAuth();
  const [email, setEmail] = useState("admin@energy.local");
  const [password, setPassword] = useState("Admin12345");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const ok = await login(email, password);
    // On success the route guard redirects away and this unmounts; only
    // re-enable the form when the attempt failed.
    if (!ok) setSubmitting(false);
  };

  const errorMessage = error;

  return (
    <div className="h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col bg-slate-900 relative overflow-hidden">
        {/* Decorative bars */}
        <div
          className="absolute inset-0 flex items-end justify-center gap-2 px-16 pb-0 opacity-[0.07] pointer-events-none select-none"
          aria-hidden="true"
        >
          {[55, 72, 48, 88, 63, 95, 41, 78, 66, 84, 52, 70, 90, 58, 75].map(
            (h, i) => (
              <div
                key={i}
                className="flex-1 bg-white rounded-t-sm"
                style={{ height: `${h}%` }}
              />
            ),
          )}
        </div>
        {/* Soft glow spot */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative flex flex-col h-full px-12 py-10">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 grid place-items-center shrink-0">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">
                BEFDSS
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                Building Energy Forecasting
              </p>
            </div>
          </div>

          {/* Headline */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Smart forecasting
              <br />
              <span className="text-blue-400">for smarter buildings.</span>
            </h1>
            <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-sm">
              End-to-end energy demand pipeline — from raw meter data to
              actionable forecasts.
            </p>

            {/* Feature list */}
            <ul className="mt-10 space-y-5">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3.5">
                  <div className="mt-0.5 h-8 w-8 rounded-lg bg-blue-600/20 grid place-items-center shrink-0">
                    <Icon className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} BEFDSS — Decision Support System
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-10">
        {/* Mobile brand mark */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-blue-600 grid place-items-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm">BEFDSS</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Sign in to your account to continue.
            </p>
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
                autoComplete="email"
                required
                className="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400 transition"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Password
                </label>
              </div>
              <PasswordInput
                value={password}
                onChange={setPassword}
                disabled={submitting}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full mt-1 flex items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-3 text-sm font-semibold transition-all duration-150 shadow-sm shadow-blue-200"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-7 text-xs text-slate-400 text-center leading-relaxed">
            Accounts are managed by your administrator.
            <br />
            Contact your admin if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}
