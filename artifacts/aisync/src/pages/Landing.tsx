import { motion } from "framer-motion";
import { Link } from "wouter";
import { useCreateDemoRequest } from "@workspace/api-client-react";
import { useState } from "react";

export default function Landing() {
  const [formData, setFormData] = useState({
    name: "", businessName: "", email: "", phone: "", industry: "Clinics", message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const demoMutation = useCreateDemoRequest();

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await demoMutation.mutateAsync({ data: formData });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="fixed top-0 w-full border-b border-border/50 bg-background/80 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-sm shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
            <span className="font-bold text-xl tracking-tight">Aisync</span>
          </div>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Client Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter leading-tight mb-6">
              Never miss <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">another call.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Aisync is a 24/7 AI voice agent for businesses. It answers calls, books appointments, and follows up automatically with human-like precision.
            </p>
            <div className="flex gap-4">
              <a href="#demo" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all">
                Book a Demo
              </a>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border p-6 rounded-2xl shadow-2xl relative"
          >
            <div className="absolute -top-3 -right-3 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-primary border-2 border-background"></span>
            </div>
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-xl">📞</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Incoming Call</h3>
                <p className="text-primary text-sm font-medium">Aisync Agent handling...</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-secondary/50 p-3 rounded-lg text-sm text-muted-foreground">
                "Hi, I'd like to book an appointment for tomorrow at 2 PM."
              </div>
              <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg text-sm text-foreground ml-8">
                "I can certainly help with that. Let me check the schedule... Yes, 2 PM works. I've booked that for you."
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                Appointment Booked ✓
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Enterprise-grade voice AI.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need to automate your front desk without sounding like a robot.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              "Human-like voice", "Inbound & Outbound", "Appointment Booking", 
              "Instant Answers", "Call Summaries", "Always-On 24/7", 
              "Calendar Integration", "CRM Updates", "Text/Email Follow-ups"
            ].map((feature, i) => (
              <div key={i} className="bg-card border border-border p-6 rounded-xl">
                <div className="w-10 h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center mb-4 font-bold">
                  {i + 1}
                </div>
                <h3 className="font-semibold mb-2">{feature}</h3>
                <p className="text-sm text-muted-foreground">Seamlessly handle customer interactions with precision and natural conversational flow.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Form */}
      <section id="demo" className="py-24 px-6 relative">
        <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Ready to automate?</h2>
            <p className="text-muted-foreground">Request a demo to see Aisync in action for your business.</p>
          </div>

          {submitted ? (
            <div className="bg-primary/20 border border-primary/30 p-8 rounded-xl text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground text-2xl">✓</div>
              <h3 className="text-xl font-bold mb-2">Request Received</h3>
              <p className="text-muted-foreground">Our team will be in touch shortly to schedule your demo.</p>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Full Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/50 border border-border rounded-lg px-4 py-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Business Name</label>
                  <input required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="w-full bg-black/50 border border-border rounded-lg px-4 py-2.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-black/50 border border-border rounded-lg px-4 py-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Phone</label>
                  <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/50 border border-border rounded-lg px-4 py-2.5" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Industry</label>
                <select value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full bg-black/50 border border-border rounded-lg px-4 py-2.5">
                  <option>Clinics</option>
                  <option>Restaurants</option>
                  <option>Real Estate</option>
                  <option>Service Trades</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Message (Optional)</label>
                <textarea rows={3} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-black/50 border border-border rounded-lg px-4 py-2.5" />
              </div>
              <button disabled={demoMutation.isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] mt-4">
                {demoMutation.isPending ? "Submitting..." : "Request Demo"}
              </button>
            </form>
          )}
        </div>
      </section>

    </div>
  );
}