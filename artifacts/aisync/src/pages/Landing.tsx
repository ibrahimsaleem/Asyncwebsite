import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useCreateDemoRequest } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { 
  Sun, Moon, Phone, Calendar, ArrowRight, Play, Check, 
  Sparkles, TrendingUp, Zap, Clock, Shield, ChevronDown, 
  CheckCircle2, Volume2, Star, ArrowUpRight, MessageSquare, Info
} from "lucide-react";

interface TranscriptLine {
  speaker: "agent" | "caller";
  text: string;
}

interface CallPreset {
  industry: string;
  emoji: string;
  agentRole: string;
  dialogue: TranscriptLine[];
}

const PRESETS: CallPreset[] = [
  {
    industry: "Clinics",
    emoji: "🦷",
    agentRole: "Dental Receptionist",
    dialogue: [
      { speaker: "caller", text: "Hi, I need to book a dental checkup for next Tuesday afternoon." },
      { speaker: "agent", text: "Hello! I can definitely help with that. Let's see... we have openings at 2:00 PM and 4:30 PM next Tuesday. Which of those works better for you?" },
      { speaker: "caller", text: "4:30 PM is perfect for me." },
      { speaker: "agent", text: "Great! I have reserved next Tuesday, July 7th at 4:30 PM for your checkup. Can I confirm your full name and phone number?" },
      { speaker: "caller", text: "Yes, it's Sarah Jenkins, and my number is 555-0199." },
      { speaker: "agent", text: "Perfect, Sarah. You're all set! I've booked your appointment and sent a confirmation text. Is there anything else I can help you with?" },
      { speaker: "caller", text: "No, that's all. Thank you!" },
      { speaker: "agent", text: "You're welcome, Sarah! Have a great day and see you next Tuesday!" }
    ]
  },
  {
    industry: "Restaurants",
    emoji: "🍝",
    agentRole: "Hostess Agent",
    dialogue: [
      { speaker: "caller", text: "Hey, do you guys have a table for 4 tonight around 7:30 PM?" },
      { speaker: "agent", text: "Hi there! Let me check our table availability for 7:30 PM tonight... Yes, we have a table available in our main dining room. Would you prefer indoor or patio seating?" },
      { speaker: "caller", text: "Indoor works best, thanks." },
      { speaker: "agent", text: "Excellent choice. I've booked an indoor table for 4 at 7:30 PM. Under what name should I put the reservation?" },
      { speaker: "caller", text: "Under the name David." },
      { speaker: "agent", text: "All set, David! We look forward to hosting your party at 7:30 PM. A text confirmation has been sent to your number." },
      { speaker: "caller", text: "Awesome, thank you!" },
      { speaker: "agent", text: "My pleasure, David. See you tonight!" }
    ]
  },
  {
    industry: "Real Estate",
    emoji: "🏡",
    agentRole: "Leasing Assistant",
    dialogue: [
      { speaker: "caller", text: "Hi, I saw the listing at 742 Evergreen Terrace and wanted to schedule a viewing." },
      { speaker: "agent", text: "Hello! That's a beautiful 3-bedroom property. Our agent, Michael, is hosting private walkthroughs tomorrow between 10 AM and 1 PM. Would any time in that window suit you?" },
      { speaker: "caller", text: "Could we do 11:30 AM?" },
      { speaker: "agent", text: "Yes, 11:30 AM works perfectly. I will schedule that walkthrough with Michael. What is the best email to send the details and entry instructions to?" },
      { speaker: "caller", text: "It's tom@example.com." },
      { speaker: "agent", text: "Awesome. I've sent the viewing invitation to tom@example.com. Michael will meet you there tomorrow at 11:30 AM!" },
      { speaker: "caller", text: "Sounds great, thanks for booking this so fast." },
      { speaker: "agent", text: "You're welcome! Let us know if you need to reschedule. Have a wonderful day!" }
    ]
  },
  {
    industry: "IT Support",
    emoji: "💻",
    agentRole: "Helpdesk Assistant",
    dialogue: [
      { speaker: "caller", text: "Hi, I'm locked out of my corporate portal account and I have a huge deadline in an hour." },
      { speaker: "agent", text: "Oh, I understand how urgent that is! Let's get that sorted out right away. For verification, could you tell me your employee ID?" },
      { speaker: "caller", text: "Yes, it's EMP-8942." },
      { speaker: "agent", text: "Thank you. I've sent a secure password reset link to your registered mobile number ending in 4021. Could you check if you've received it?" },
      { speaker: "caller", text: "Yes, got it! Resetting now... It worked, I'm back in! Thank you so much!" },
      { speaker: "agent", text: "You're very welcome! I'm glad we could resolve this quickly. Is there anything else you need help with?" },
      { speaker: "caller", text: "No, that was it. Lifesaver!" },
      { speaker: "agent", text: "Anytime! Have a productive day and good luck with your deadline!" }
    ]
  }
];

export default function Landing() {
  const [formData, setFormData] = useState({
    name: "", businessName: "", email: "", phone: "", industry: "Clinics", message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const demoMutation = useCreateDemoRequest();

  // Theme Toggler state
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Call simulator state
  const [presetIndex, setPresetIndex] = useState(0);
  const [dialogueCount, setDialogueCount] = useState(1);
  const [isCalling, setIsCalling] = useState(true);
  const activePreset = PRESETS[presetIndex];

  // ROI Calculator state
  const [missedCalls, setMissedCalls] = useState(40);
  const [dealValue, setDealValue] = useState(150);
  const [conversionRate, setConversionRate] = useState(30);

  // Pricing state
  const [isAnnual, setIsAnnual] = useState(false);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle auto-advancing simulated call dialogue
  useEffect(() => {
    if (!isCalling) return;
    const timer = setInterval(() => {
      setDialogueCount(prev => {
        if (prev < activePreset.dialogue.length) {
          return prev + 1;
        } else {
          return 1; // loop back
        }
      });
    }, 3800);
    return () => clearInterval(timer);
  }, [presetIndex, isCalling, activePreset.dialogue.length]);

  // Reset dialogue counter when preset changes
  useEffect(() => {
    setDialogueCount(1);
  }, [presetIndex]);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await demoMutation.mutateAsync({ data: formData });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  // ROI computations
  const recoveredLeads = Math.round(missedCalls * (conversionRate / 100));
  const revenueRecovered = recoveredLeads * dealValue;
  const aisyncCost = 149; // Growth plan price
  const netSavings = Math.max(0, revenueRecovered - aisyncCost);
  const roiMultiplier = revenueRecovered > 0 ? (revenueRecovered / aisyncCost).toFixed(1) : "0";

  const currentTheme = mounted ? theme : "dark";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-foreground overflow-x-hidden transition-colors duration-300">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[800px] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-primary/10 rounded-full blur-[140px] dark:bg-primary/5" />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[60%] bg-violet-500/10 rounded-full blur-[140px] dark:bg-violet-500/5" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-border/40 bg-background/70 backdrop-blur-md z-50 transition-colors duration-305">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Pulsing logo */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-violet-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <Volume2 className="w-5 h-5 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
            </div>
            <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">Aisync</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#roi-calculator" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">ROI Calculator</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button (Day / Night Switcher) */}
            {mounted && (
              <button 
                onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
                className="relative flex items-center justify-between w-14 h-8 bg-muted/80 border border-border/80 rounded-full p-1 cursor-pointer transition-colors hover:border-primary/50"
                aria-label="Toggle Theme"
              >
                <motion.div 
                  className="absolute w-6 h-6 rounded-full bg-primary shadow-md flex items-center justify-center"
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    left: currentTheme === "dark" ? "calc(100% - 28px)" : "4px"
                  }}
                >
                  {currentTheme === "dark" ? (
                    <Moon className="w-3.5 h-3.5 text-primary-foreground" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-primary-foreground" />
                  )}
                </motion.div>
                <Sun className={`w-4 h-4 ml-1 transition-opacity ${currentTheme === "light" ? "opacity-0" : "opacity-60"}`} />
                <Moon className={`w-4 h-4 mr-1 transition-opacity ${currentTheme === "dark" ? "opacity-0" : "opacity-60"}`} />
              </button>
            )}

            <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
              Client Login
            </Link>
            
            <a href="#demo" className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm px-5 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-all">
              Book Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-6"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Next-Gen Voice AI Technology</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-foreground"
            >
              Never miss another <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-violet-600 dark:from-blue-400 dark:to-violet-400">
                customer call.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed"
            >
              Aisync is an ultra-realistic 24/7 AI voice agent designed for businesses. We handle bookings, resolve queries, and trigger instant system updates with absolute precision.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <a href="#demo" className="bg-primary text-primary-foreground font-semibold px-7 py-4 rounded-xl shadow-[0_10px_25px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_30px_rgba(37,99,235,0.4)] hover:scale-[1.02] transition-all flex items-center gap-2">
                Book a Live Demo <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#features" className="bg-muted hover:bg-muted/80 border border-border/80 font-semibold px-7 py-4 rounded-xl transition-all hover:scale-[1.02]">
                Explore Features
              </a>
            </motion.div>

            {/* Testimonial Snippet */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.6 }}
              className="mt-12 flex items-center gap-4 border-t border-border/40 pt-8 w-full max-w-lg"
            >
              <div className="flex -space-x-2">
                {[
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80"
                ].map((src, i) => (
                  <img key={i} src={src} alt="User Avatar" className="w-9 h-9 rounded-full border-2 border-background object-cover" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-sm font-semibold ml-1">4.9/5</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Trusted by 200+ clinics, shops, and firms nationwide.</p>
              </div>
            </motion.div>
          </div>

          {/* Right Live Call Mockup Device */}
          <div className="lg:col-span-5 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-gradient-to-tr from-primary/10 via-transparent to-violet-500/10 rounded-3xl blur-[80px] pointer-events-none" />
            
            {/* Industry Preset Selector Pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-4 bg-muted/50 p-1.5 rounded-2xl border border-border/40">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setPresetIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    presetIndex === idx 
                      ? "bg-card text-foreground shadow-sm border border-border/60" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{preset.emoji}</span>
                  <span>{preset.industry}</span>
                </button>
              ))}
            </div>

            {/* Smart Phone Shell */}
            <div className="relative bg-card border-4 border-border rounded-[2.5rem] shadow-2xl p-4 w-full overflow-hidden min-h-[460px] flex flex-col">
              
              {/* Camera Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-border w-24 h-4 rounded-b-xl z-20" />
              
              {/* Call Header */}
              <div className="flex items-center justify-between mt-4 pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-lg">{activePreset.emoji}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-foreground">{activePreset.agentRole}</h3>
                    <p className="text-emerald-500 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live AI Agent Handling
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border/30">
                    00:{dialogueCount * 4 < 10 ? `0${dialogueCount * 4}` : dialogueCount * 4}
                  </span>
                </div>
              </div>

              {/* Sound Wave Visualizer */}
              <div className="py-6 flex flex-col items-center justify-center bg-muted/30 rounded-2xl border border-border/30 my-4">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-primary animate-bounce" /> Live Audio Output
                </p>
                <div className="h-10 flex items-center gap-1">
                  {Array.from({ length: 21 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-gradient-to-t from-primary to-blue-400 rounded-full"
                      animate={{
                        height: isCalling ? [8, Math.sin(i + dialogueCount) * 22 + 18, 8] : 6
                      }}
                      transition={{
                        duration: 1 + (i % 3) * 0.2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{ height: 10 }}
                    />
                  ))}
                </div>
              </div>

              {/* Message Dialogue Feed */}
              <div className="flex-grow space-y-3 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
                <AnimatePresence mode="popLayout">
                  {activePreset.dialogue.slice(0, dialogueCount).map((line, index) => {
                    const isAgent = line.speaker === "agent";
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                      >
                        <div 
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm border ${
                            isAgent 
                              ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-none" 
                              : "bg-muted text-foreground border-border/50 rounded-tl-none"
                          }`}
                        >
                          <span className="font-semibold block mb-0.5 text-[9px] uppercase tracking-wider opacity-80">
                            {isAgent ? "Aisync Agent" : "Customer"}
                          </span>
                          {line.text}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Floating Booking Status Pill */}
              {dialogueCount >= 5 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Calendar updated & client confirmation SMS sent!</span>
                </motion.div>
              )}

              {/* Controls */}
              <div className="mt-4 pt-3 border-t border-border/40 flex justify-between items-center text-xs">
                <button 
                  onClick={() => setIsCalling(!isCalling)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium transition-colors"
                >
                  {isCalling ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                      Pause Simulation
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Resume Simulation
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setDialogueCount(1)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset Call
                </button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-8 border-y border-border/40 bg-muted/20 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">INTEGRATES WITH THE SERVICES YOU USE DAILY</p>
          <div className="flex flex-wrap items-center gap-8 md:gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-305">
            <span className="font-bold tracking-tight text-lg">📅 Google Calendar</span>
            <span className="font-bold tracking-tight text-lg">✉️ Outlook</span>
            <span className="font-bold tracking-tight text-lg">💡 HubSpot</span>
            <span className="font-bold tracking-tight text-lg">💬 Salesforce</span>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section id="roi-calculator" className="py-24 px-6 relative z-10 bg-muted/10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4"
            >
              Calculate Your Recovered Revenue
            </motion.h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              Missed calls are missed clients. See how much uncaptured revenue you can claim back automatically with Aisync.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Sliders */}
            <div className="lg:col-span-7 bg-card border border-border/50 rounded-3xl p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-8">
                
                {/* Missed Calls */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-foreground">Missed Calls (monthly)</span>
                    <span className="text-lg font-bold text-primary">{missedCalls} calls</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="200" 
                    value={missedCalls}
                    onChange={(e) => setMissedCalls(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-medium">
                    <span>5</span>
                    <span>100</span>
                    <span>200</span>
                  </div>
                </div>

                {/* Avg Ticket Value */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-foreground">Average Value Per Customer</span>
                    <span className="text-lg font-bold text-primary">${dealValue}</span>
                  </div>
                  <input 
                    type="range" 
                    min="20" 
                    max="1500" 
                    step="10"
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-medium">
                    <span>$20</span>
                    <span>$750</span>
                    <span>$1,500</span>
                  </div>
                </div>

                {/* Conversion Rate */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-foreground">Booking Conversion Rate</span>
                    <span className="text-lg font-bold text-primary">{conversionRate}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={conversionRate}
                    onChange={(e) => setConversionRate(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-medium">
                    <span>10%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border/40 flex items-start gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Formula based on conservative conversion benchmarks. Most businesses experience a higher conversion rate when callbacks are triggered within 2 minutes of the initial missed call.
                </p>
              </div>
            </div>

            {/* Right Output Cards */}
            <div className="lg:col-span-5 bg-gradient-to-b from-primary via-primary to-violet-600 rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
              
              {/* Ambient radial overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-white/70 block mb-1">Estimated Return</span>
                <h3 className="text-3xl font-extrabold tracking-tight mb-8">Monthly Projection</h3>
                
                <div className="space-y-6">
                  <div>
                    <span className="text-xs text-white/70 font-semibold block mb-0.5">Additional Bookings</span>
                    <p className="text-3xl font-extrabold font-mono">{recoveredLeads} <span className="text-sm font-normal text-white/80">/ month</span></p>
                  </div>

                  <div>
                    <span className="text-xs text-white/70 font-semibold block mb-0.5">Recovered Monthly Revenue</span>
                    <p className="text-4xl font-black font-mono text-emerald-300">${revenueRecovered.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <span className="text-xs text-white/70 font-semibold block mb-0.5">Estimated ROI Multiplier</span>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-extrabold font-mono text-emerald-300">{roiMultiplier}x</p>
                      <span className="text-xs text-white/85">vs service costs</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/20 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/80 font-semibold">Service Fee (Growth Plan):</span>
                  <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">${aisyncCost}/mo</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-white/10">
                  <span>Net Added Value:</span>
                  <span className="text-emerald-300 font-mono">${netSavings.toLocaleString()} / mo</span>
                </div>
                <a href="#demo" className="mt-4 w-full bg-white text-primary hover:bg-white/95 font-bold py-3.5 rounded-2xl text-center text-sm transition-all shadow-[0_4px_12px_rgba(255,255,255,0.15)]">
                  Recapture This Revenue Now
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Full Product Capability</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">Enterprise-grade Voice Automation</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Aisync comes packed with the standard tools required to scale your customer outreach and inbound handling effortlessly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Ultra-Realistic Text-to-Speech",
                desc: "Powered by deep neural speech models. Our agents use human-like pacing, breathing markers, and warm inflections.",
                icon: Volume2
              },
              {
                title: "Inbound & Outbound Calling",
                desc: "Answering incoming reservations, scheduling follow-ups, or running warm outbound campaigns smoothly.",
                icon: Phone
              },
              {
                title: "Live Calendar Syncing",
                desc: "Instantly reads real-time team schedules and books slots directly into Outlook or Google Calendar.",
                icon: Calendar
              },
              {
                title: "Instant Answers & Knowledge",
                desc: "Give your agent your store's hours, address, services, and FAQ sheet. It answers queries accurately in seconds.",
                icon: Zap
              },
              {
                title: "Conversational Analytics",
                desc: "Review call volume patterns, customer requests, text sentiments, and full audio transcripts from the portal.",
                icon: TrendingUp
              },
              {
                title: "Safe and Secure Platform",
                desc: "Fully encrypted records. Our system meets standard HIPAA compliance rules for secure medical appointment booking.",
                icon: Shield
              }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                className="bg-card border border-border/50 hover:border-primary/40 p-8 rounded-3xl transition-all duration-300 hover:shadow-lg group"
                whileHover={{ y: -5 }}
              >
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-muted/10 relative z-10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-20">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Simple Setup</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">Go Live in 15 Minutes</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              Skip the long training schedules. Deploying a voice agent with Aisync takes three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Visual connector lines */}
            <div className="hidden md:block absolute top-14 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-primary/30 via-violet-500/20 to-transparent z-0" />
            
            {[
              {
                step: "01",
                title: "Define Knowledge Base",
                desc: "Upload your store schedule, service prices, address details, and custom system guidelines to teach your agent."
              },
              {
                step: "02",
                title: "Select Agent Voice",
                desc: "Choose from 12+ premium gender neutral and natural vocal styles. Adjust tone, pace, and language options."
              },
              {
                step: "03",
                title: "Connect and Go Live",
                desc: "Forward your missed/busy line calls to your unique Aisync dialer number. Watch bookings fill your screen."
              }
            ].map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-background border-2 border-primary text-primary font-black text-xl flex items-center justify-center shadow-md mb-6 transition-all hover:scale-110">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Flexible Plans</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">Transparent Scale Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base mb-8">
              Choose the package that aligns with your call volume. Get 2 months free with annual billing.
            </p>

            {/* Monthly / Annual Toggle Switch */}
            <div className="inline-flex items-center justify-center p-1 bg-muted rounded-2xl border border-border/40">
              <button 
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${!isAnnual ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isAnnual ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span>Annually</span>
                <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-black">SAVE 20%</span>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
            
            {/* Starter Plan */}
            <div className="bg-card border border-border/50 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:border-border transition-colors">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Starter</span>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-4xl font-extrabold font-mono text-foreground">${isAnnual ? "39" : "49"}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground/80 block mb-6">
                  {isAnnual ? "Billed annually ($468/yr)" : "Billed month-to-month"}
                </span>
                
                <hr className="border-border/40 mb-6" />

                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>200 active call minutes / mo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>1 Custom AI voice agent</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Standard natural voice engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Web booking dashboard</span>
                  </li>
                </ul>
              </div>

              <a href="#demo" className="mt-8 w-full bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 rounded-2xl text-center text-sm transition-all border border-border/60">
                Get Started
              </a>
            </div>

            {/* Growth Plan (Popular) */}
            <div className="bg-card border-2 border-primary rounded-3xl p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                Most Popular
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-2">Growth</span>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-4xl font-extrabold font-mono text-foreground">${isAnnual ? "119" : "149"}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground/80 block mb-6">
                  {isAnnual ? "Billed annually ($1,428/yr)" : "Billed month-to-month"}
                </span>

                <hr className="border-border/40 mb-6" />

                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-foreground font-semibold">800 active call minutes / mo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Up to 3 active AI voice agents</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Premium voice model library</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>SMS / Email customer follow-ups</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Direct Google & Outlook calendar sync</span>
                  </li>
                </ul>
              </div>

              <a href="#demo" className="mt-8 w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-3.5 rounded-2xl text-center text-sm transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)]">
                Get Started Today
              </a>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-card border border-border/50 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:border-border transition-colors">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Enterprise</span>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-4xl font-extrabold text-foreground">Custom</span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground/80 block mb-6">
                  Tailored to your business scale
                </span>

                <hr className="border-border/40 mb-6" />

                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-foreground font-semibold">Unlimited minutes volume</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Custom voice cloning engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Dedicated account support manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>API & Webhook system integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Custom SLA & server infrastructure</span>
                  </li>
                </ul>
              </div>

              <a href="#demo" className="mt-8 w-full bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 rounded-2xl text-center text-sm transition-all border border-border/60">
                Contact Sales
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 bg-muted/10 relative z-10 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Got Questions?</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Everything you need to know about Aisync voice agents, setup, and billing.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Does the AI sound like a real human?",
                a: "Yes! Aisync uses state-of-the-art neural text-to-speech technology with ultra-low latency. Our voices include natural breathing patterns, human-like pacing, and realistic inflections so callers rarely realize they are speaking to an AI."
              },
              {
                q: "How does the calendar and booking integration work?",
                a: "Aisync connects directly with Google Calendar, Outlook, Calendly, and industry-specific scheduling software (like Jane, Mindbody, or Acuity). It reads your live availability and books appointments directly into your schedule, sending instant text confirmations."
              },
              {
                q: "Can I customize the agent's script and personality?",
                a: "Absolutely. Through our easy-to-use client portal, you can define your agent's knowledge base, greeting, booking rules, FAQs, and tone of voice. You can update this information at any time and it takes effect instantly."
              },
              {
                q: "What happens if the AI agent gets stuck or cannot answer?",
                a: "If a caller asks something outside the agent's knowledge base, the AI can gracefully offer to take a message, transfer the call to a human team member, or schedule a callback. You will receive an immediate summary of the conversation via email or SMS."
              },
              {
                q: "Is there a contract or can I cancel anytime?",
                a: "Our Starter and Growth plans are billed on a month-to-month basis, and you can cancel or change plans at any time without penalty. We also offer discounted annual billing if you choose to lock in savings."
              }
            ].map((faq, idx) => (
              <div key={idx} className="border border-border/40 bg-card rounded-2xl overflow-hidden transition-all">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors focus:outline-none cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openFaq === idx ? "rotate-180 text-primary" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-5 text-xs sm:text-sm text-muted-foreground border-t border-border/30 pt-3 leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Form Section */}
      <section id="demo" className="py-24 px-6 relative z-10">
        <div className="max-w-3xl mx-auto bg-card border border-border/60 rounded-[2rem] p-8 sm:p-12 shadow-2xl relative">
          
          <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">Request a Live Demo</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Give your business the 24/7 coverage it deserves. Tell us about your operations and we will customize a demo voice agent for you.
            </p>
          </div>

          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/5 border border-primary/20 p-8 sm:p-12 rounded-2xl text-center"
            >
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl shadow-lg shadow-primary/20">✓</div>
              <h3 className="text-2xl font-bold mb-3">Request Received!</h3>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Thank you for reaching out. A team member will email you shortly to schedule a live call and present your tailored voice agent.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">Full Name</label>
                  <input 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-muted/50 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm focus:outline-none transition-all animate-none bg-black/10 dark:bg-black/40"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">Business Name</label>
                  <input 
                    required 
                    value={formData.businessName} 
                    onChange={e => setFormData({...formData, businessName: e.target.value})} 
                    className="w-full bg-muted/50 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm focus:outline-none transition-all animate-none bg-black/10 dark:bg-black/40"
                    placeholder="Acme Dental Clinic"
                  />
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">Work Email</label>
                  <input 
                    required 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    className="w-full bg-muted/50 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm focus:outline-none transition-all animate-none bg-black/10 dark:bg-black/40"
                    placeholder="jane@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">Phone Number</label>
                  <input 
                    required 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="w-full bg-muted/50 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm focus:outline-none transition-all animate-none bg-black/10 dark:bg-black/40"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">Business Industry</label>
                <select 
                  value={formData.industry} 
                  onChange={e => setFormData({...formData, industry: e.target.value})} 
                  className="w-full bg-muted/50 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm focus:outline-none cursor-pointer transition-all bg-black/10 dark:bg-black/40"
                >
                  <option value="Clinics">Clinics & Healthcare</option>
                  <option value="Restaurants">Restaurants & Hospitality</option>
                  <option value="Real Estate">Real Estate & Property Management</option>
                  <option value="Service Trades">Service Trades (Plumbing, HVAC, Electrical)</option>
                  <option value="Other">Other Retail / Firms</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">Message (Optional)</label>
                <textarea 
                  rows={4} 
                  value={formData.message} 
                  onChange={e => setFormData({...formData, message: e.target.value})} 
                  className="w-full bg-muted/50 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm focus:outline-none transition-all resize-none bg-black/10 dark:bg-black/40" 
                  placeholder="Tell us about the types of calls you want to automate..."
                />
              </div>

              <button 
                disabled={demoMutation.isPending} 
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {demoMutation.isPending ? "Submitting Request..." : "Request Tailored Demo"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-16 bg-muted/10 relative z-10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
          
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
                <Volume2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">Aisync</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Deploy realistic natural language voice agents that answer 24/7, book calendars, send notifications, and handle support workflows with standard precision.
            </p>
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Aisync Systems, Inc. All rights reserved.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Product</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#roi-calculator" className="hover:text-primary transition-colors">ROI Calculator</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing Options</a></li>
              <li><a href="#demo" className="hover:text-primary transition-colors">Request Demo</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><span className="cursor-default">Privacy Policy</span></li>
              <li><span className="cursor-default">Terms of Service</span></li>
              <li><span className="cursor-default">Security Standards</span></li>
              <li><span className="cursor-default">HIPAA Compliance</span></li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Connect</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><span className="cursor-default">Support Center</span></li>
              <li><span className="cursor-default">LinkedIn</span></li>
              <li><span className="cursor-default">X (Twitter)</span></li>
              <li><span className="cursor-default">Email Contact</span></li>
            </ul>
          </div>

        </div>
      </footer>

    </div>
  );
}