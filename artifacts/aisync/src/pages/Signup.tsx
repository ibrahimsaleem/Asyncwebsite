import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { authInput, authLabel, authButton, authError } from "@/components/AuthShell";

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
    <AuthShell
      wide
      eyebrow="Get started"
      title={<>Get your AI <span className="italic text-[#B8502E]">voice agent.</span></>}
      subtitle="Create your account and tell us what you need. Our team reviews every request and contacts you within 1 business day for a free consultation."
      footer={<>Already have an account? <Link href="/login" className="text-[#B8502E] font-semibold hover:underline">Log in</Link></>}
    >
      {error && <div className={authError}>{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={authLabel}>Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={authInput} placeholder="Jane Smith" required minLength={2} autoComplete="name" />
          </div>
          <div>
            <label className={authLabel}>Business name</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={authInput} placeholder="Smith Dental" required minLength={2} autoComplete="organization" />
          </div>
          <div>
            <label className={authLabel}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} placeholder="name@company.com" required autoComplete="email" />
          </div>
          <div>
            <label className={authLabel}>Phone / WhatsApp</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={authInput} placeholder="+1 555 010 0000" required minLength={5} autoComplete="tel" />
          </div>
          <div>
            <label className={authLabel}>Industry</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={authInput} required>
              <option value="">Select…</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className={authLabel}>Create a password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
          </div>
        </div>

        <div>
          <label className={authLabel}>What should your voice agent do?</label>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {NEEDS.map((n) => (
              <label
                key={n}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-[14px] cursor-pointer transition-all duration-200 ${
                  needs.includes(n)
                    ? "border-[#B8502E] bg-[#B8502E]/[0.07] text-[#211C16] shadow-[0_0_0_3px_rgba(184,80,46,0.08)]"
                    : "border-[#E4D9C9] bg-[#FFFDF9] text-[#564C40] hover:border-[#C9BBA6]"
                }`}
              >
                <span className="relative shrink-0 w-[18px] h-[18px]">
                  <input type="checkbox" checked={needs.includes(n)} onChange={() => toggleNeed(n)} className="peer appearance-none absolute inset-0 rounded-[6px] border-2 border-[#C9BBA6] bg-[#FFFDF9] checked:bg-[#B8502E] checked:border-[#B8502E] transition-colors cursor-pointer" />
                  <svg viewBox="0 0 16 16" className="absolute inset-0 m-auto w-3 h-3 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
                </span>
                {n}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={authLabel}>Anything else? <span className="font-normal text-[#9A8F7E]">(optional)</span></label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            className={`${authInput} resize-none`}
            placeholder="e.g. We get ~40 calls a day, miss most after 6pm, use Google Calendar, and want it to speak English and Spanish."
          />
        </div>

        <button type="submit" disabled={loading} className={`${authButton} mt-2`}>
          {loading ? "Creating your account…" : "Create account & send my request"}
        </button>
      </form>
    </AuthShell>
  );
}
