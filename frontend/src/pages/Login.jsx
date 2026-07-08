import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/aa-logo.jpg";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 brand-gradient relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10 animate-pulse-dot" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          animationDuration: "4s",
        }} />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-aa-orange-300/20 blur-3xl" />
        <div className="relative text-white max-w-md animate-fade-in">
          <img src={logo} alt="Across Assist" className="w-16 h-16 rounded-2xl mb-8 object-cover shadow-pop" />
          <h1 className="font-display text-4xl font-bold leading-tight mb-4">Project Master</h1>
          <p className="text-white/85 text-lg leading-relaxed">
            One source of truth for every project, task, and bug across all Lines of Business.
          </p>
          <div className="mt-10 flex gap-6 text-sm text-white/70 font-medium tracking-wide">
            <span>TRUST</span><span>·</span><span>CARE</span><span>·</span><span>PROTECT</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-paper-50">
        <div className="w-full max-w-sm animate-page-in">
          <img src={logo} alt="Across Assist" className="w-12 h-12 rounded-xl mb-6 object-cover lg:hidden" />
          <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Sign in</h2>
          <p className="text-ink-500 text-sm mb-8">Enter your credentials to access Project Master.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 focus-ring focus:border-aa-blue-500 text-sm transition-colors"
                placeholder="you@acrossassist.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 focus-ring focus:border-aa-blue-500 text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
            <button
              type="submit" disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors focus-ring press-scale disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Sign in
            </button>
          </form>

          <div className="mt-8 text-xs text-ink-300 bg-paper-100 rounded-xl px-4 py-3 leading-relaxed">
            Demo accounts — Admin: admin@acrossassist.com / Admin@123 · BA (Travel): ba.travel@acrossassist.com / Ba@12345
          </div>
        </div>
      </div>
    </div>
  );
}