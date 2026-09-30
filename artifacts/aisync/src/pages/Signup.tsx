import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import AmbientBackground from "@/components/AmbientBackground";
import { useAuth } from "@/context/AuthContext";

const INDUSTRIES = [
  "Healthcare", "Dental", "Legal", "Real Estate", "Restaurants", "Hospitality",
  "Home Services", "Automotive", "Fitness & Wellness", "Beauty & Salon",
  "Education", "Insurance & Finance", "E-commerce & Retail", "IT Support", "Other",
];

const NEEDS = [
  "Answer inbound calls 24/7",
  "Answer after hours only",
  "Book appointments into my calendar",
  "Outbound calls: offers & promotions",
  "Outbound calls: reminders & confirmations",
  "Follow up on leads / quotes",
  "Book consultations on Google Meet",
  "Update my CRM",
];

const inputClass =
  "w-full bg-black/30 border border-white/10 rounded-lg hover:border-white/20 px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
const labelClass = "block text-sm font-medium mb-1.5 text-muted-foreground";

export default function Signup() {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [password, setPassword] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation(user.role === "admin" ? "/admin" : "/client");
  }, [user, setLocation]);

  const toggleNeed = (n: string) =>
    setNeeds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (needs.length === 0 && details.trim().length < 10) {
      setError("Tell us what you'd like your voice agent to do — pick at least one option or describe it.");
      return;
    }
    const requirements = [
      needs.length ? `Wants: ${needs.join("; ")}.` : "",
      details.trim() ? `Details: ${details.trim()}` : "",
    ].filter(Boolean).join("\n");

    setLoading(true);
    try {
      await register({ data: { name, email, password, businessName, industry, phone, requirements } });
    } catch (err: any) {
      if (err?.status === 409) setError("An account with this email already exists. Please log in instead.");
      else if (err?.status === 400) setError("Please check your details — password must be at least 8 characters.");
      else setError("Something went wrong. Please try again or message us on WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <AmbientBackground />
      <Link href="/" className="relative z-10 mb-6 flex items-center gap-1.5 text-foreground/90 hover:text-foreground transition-colors">
        <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[30px] leading-none tracking-tight">aicronics</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#B8502E] -translate-y-2" />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl glass p-6 sm:p-8 rounded-xl border border-border shadow-2xl relative z-10 my-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Get your AI voice agent</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Create your aicronics account and tell us what you need. Our team reviews every request and
            contacts you within 1 business day for a free consultation.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Jane Smith" required minLength={2} autoComplete="name" />
            </div>
            <div>
              <label className={labelClass}>Business name</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} placeholder="Smith Dental" required minLength={2} autoComplete="organization" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="name@company.com" required autoComplete="email" />
            </div>
            <div>
              <label className={labelClass}>Phone / WhatsApp</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+1 555 010 0000" required minLength={5} autoComplete="tel" />
            </div>
            <div>
              <label className={labelClass}>Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputClass} required>
                <option value="">Select…</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Create a password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
            </div>
          </div>

          <div>
            <label className={labelClass}>What should your voice agent do?</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {NEEDS.map((n) => (
                <label key={n} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${needs.includes(n) ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                  <input type="checkbox" checked={needs.includes(n)} onChange={() => toggleNeed(n)} className="accent-[hsl(var(--primary))]" />
                  {n}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Anything else? (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="e.g. We get ~40 calls a day, miss most after 6pm, use Google Calendar, and want it to speak English and Spanish."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold mt-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] btn-shine hover:shadow-[0_0_32px_rgba(37,99,235,0.5)] disabled:opacity-50"
          >
            {loading ? "Creating your account…" : "Create account & send my request"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          Already have an account? <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
