import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "wouter";
import AuthShell, { authInput, authLabel, authButton, authError } from "@/components/AuthShell";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();

  // Navigate once the auth context knows the user, so protected routes
  // don't see a stale "logged out" state and bounce back here.
  useEffect(() => {
    if (user) setLocation(user.role === "admin" ? "/admin" : "/client");
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ data: { email, password } });
    } catch (err: any) {
      console.error(err);
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Client portal"
      title={<>Welcome <span className="italic text-[#B8502E]">back.</span></>}
      subtitle="Log in to follow your voice agent's progress, updates and invoices."
      footer={<>New to aicronics? <Link href="/signup" className="text-[#B8502E] font-semibold hover:underline">Create an account</Link> and tell us what you need.</>}
    >
      {error && <div className={authError}>{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={authLabel}>Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} placeholder="name@company.com" required autoComplete="email" />
        </div>
        <div>
          <label className={authLabel}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} placeholder="••••••••" required autoComplete="current-password" />
        </div>
        <button type="submit" disabled={loading} className={`${authButton} mt-2`}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
