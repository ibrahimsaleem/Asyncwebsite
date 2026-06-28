import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useCreateDemoRequest } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { 
  Volume2, Play, CheckCircle2, ChevronDown, Check, Star, ArrowRight, Pause
} from "lucide-react";

interface TranscriptLine {
  speaker: "agent" | "caller";
  text: string;
}

interface CallPreset {
  industry: string;
  emoji: string;
  agentRole: string;
  statusText: string;
  dialogue: TranscriptLine[];
}

const PRESETS: CallPreset[] = [
  {
    industry: "Clinics",
    emoji: "🦷",
    agentRole: "Dental Receptionist",
    statusText: "Booked Tue 4:30 · confirmation texted",
    dialogue: [
      { speaker: "caller", text: "Hi, can I get a checkup next Tuesday afternoon?" },
      { speaker: "agent", text: "Of course — I have 2:00 or 4:30. Which suits you best?" },
      { speaker: "caller", text: "4:30 PM works great." },
      { speaker: "agent", text: "Perfect, I've booked you for next Tuesday at 4:30 PM. I'll text you a confirmation now." }
    ]
  },
  {
    industry: "Restaurants",
    emoji: "🍝",
    agentRole: "Hostess Agent",
    statusText: "Table for 4 booked · SMS sent",
    dialogue: [
      { speaker: "caller", text: "Hi, do you have a table for 4 tonight around 7:30 PM?" },
      { speaker: "agent", text: "Yes, we have an indoor table available at 7:30 PM. Shall I reserve it under your name?" },
      { speaker: "caller", text: "Yes, under David, please." },
      { speaker: "agent", text: "Great, David! Your table for 4 is reserved for 7:30 PM tonight. See you then!" }
    ]
  },
  {
    industry: "Real Estate",
    emoji: "🏡",
    agentRole: "Leasing Assistant",
    statusText: "Viewing scheduled · invite sent",
    dialogue: [
      { speaker: "caller", text: "Hi, I saw the listing at 742 Evergreen Terrace and want to view it." },
      { speaker: "agent", text: "Hi! We have private viewings tomorrow at 11:30 AM or 2:00 PM. Which works for you?" },
      { speaker: "caller", text: "Let's do 11:30 AM." },
      { speaker: "agent", text: "Awesome. I've scheduled you with Michael for 11:30 AM and emailed details to you." }
    ]
  },
  {
    industry: "IT Support",
    emoji: "💻",
    agentRole: "Helpdesk Assistant",
    statusText: "Password link texted · resolved",
    dialogue: [
      { speaker: "caller", text: "Hi, I'm locked out of my corporate portal account." },
      { speaker: "agent", text: "I can help with that. For verification, could you tell me your employee ID?" },
      { speaker: "caller", text: "It's EMP-8942." },
      { speaker: "agent", text: "Thanks. I've sent a secure password reset link to your registered mobile number." }
    ]
  }
];

// Animation constants
const fadeInUp = {
  initial: { opacity: 0, y: 35 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-120px" },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: {
      staggerChildren: 0.08
    }
  },
  viewport: { once: true, margin: "-100px" }
};

const staggerItem = {
  initial: { opacity: 0, y: 25 },
  whileInView: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } 
  }
};

export default function Landing() {
  const [formData, setFormData] = useState({
    name: "", businessName: "", email: "", phone: "", industry: "Clinics & healthcare", message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const demoMutation = useCreateDemoRequest();

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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
    }, 4000);
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
  const roiMultiplier = revenueRecovered > 0 ? (revenueRecovered / aisyncCost).toFixed(1) : "0";

  // Pricing values based on toggle
  const starterPrice = isAnnual ? "39" : "49";
  const growthPrice = isAnnual ? "119" : "149";
  const starterNote = isAnnual ? "Billed annually ($468/yr)" : "Billed month-to-month";
  const growthNote = isAnnual ? "Billed annually ($1,428/yr)" : "Billed month-to-month";

  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div style={{ background: "#F6F1E9", color: "#211C16", fontFamily: "'Hanken Grotesk', sans-serif" }} className="min-h-screen overflow-x-hidden selection:bg-[#B8502E]/20">
      
      {/* ===== NAV ===== */}
      <nav className="sticky top-0 z-50 bg-[#F6F1E9]/85 backdrop-blur-md border-b border-[#E4D9C9] transition-all">
        <div className="max-w-[1180px] mx-auto px-6 md:px-14 h-[74px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[30px] font-normal tracking-tight leading-none">Aisync</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8502E] translate-y-[-2px] inline-block"></span>
          </div>
          
          <div className="hidden md:flex items-center gap-[30px] text-sm font-medium text-[#6B6155]">
            <a href="#how" className="hover:text-[#211C16] transition-colors duration-200">How it works</a>
            <a href="#uses" className="hover:text-[#211C16] transition-colors duration-200">Use cases</a>
            <a href="#roi" className="hover:text-[#211C16] transition-colors duration-200">ROI</a>
            <a href="#pricing" className="hover:text-[#211C16] transition-colors duration-200">Pricing</a>
            <Link href="/login" className="hover:text-[#211C16] transition-colors duration-200">Client login</Link>
            <a href="#demo" style={{ border: "1px solid #211C16" }} className="text-[#211C16] px-[18px] py-[9px] rounded-full font-semibold hover:bg-[#211C16] hover:text-[#F6F1E9] transition-all duration-300">Book a demo</a>
          </div>

          {/* Simple Mobile Nav Trigger */}
          <div className="md:hidden flex items-center gap-3">
            <Link href="/login" className="text-xs font-semibold text-[#6B6155] px-2 py-1">Login</Link>
            <a href="#demo" className="text-xs bg-[#211C16] text-[#F6F1E9] px-4 py-2 rounded-full font-semibold">Book Demo</a>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="max-w-[1180px] mx-auto px-6 md:px-14 pt-12 md:pt-16 pb-14">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-14 items-center">
          
          {/* Hero Content Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-[9px] text-xs tracking-[0.16em] uppercase text-[#B8502E] font-bold mb-[26px]">
              <span className="w-[22px] h-[1px] bg-[#B8502E]"></span> A voice that sounds human
            </div>
            
            <h1 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[52px] sm:text-[72px] lg:text-[82px] font-normal leading-[0.97] tracking-[-0.015em] mb-6">
              Never miss<br />another <span style={{ fontFamily: "'Instrument Serif', serif" }} className="italic text-[#B8502E]">call</span>.
            </h1>
            
            <p className="text-[17px] sm:text-[19px] leading-[1.55] text-[#564C40] mb-[36px] max-w-[440px]">
              A warm, human-sounding AI receptionist that answers every call, books the appointment, and follows up — at 2pm or 2am.
            </p>
            
            <div className="flex flex-wrap items-center gap-6">
              <a href="#demo" className="bg-[#211C16] text-[#F6F1E9] px-[30px] py-4 rounded-full font-semibold text-[15px] hover:bg-[#B8502E] transition-all duration-300 transform hover:scale-[1.02]">
                Hear it answer a call
              </a>
              <Link href="/login" className="inline-flex items-center gap-2 font-semibold text-[15px] border-b-[1.5px] border-[#211C16] pb-[3px] text-[#211C16] hover:text-[#B8502E] hover:border-[#B8502E] transition-all duration-200">
                Client login →
              </Link>
            </div>
            
            <div className="flex items-center gap-3.5 mt-12 pt-7 border-t border-[#E4D9C9]">
              <div className="flex -space-x-2.5">
                <img src={`${baseUrl}/images/avatar_1.png`} alt="Client 1" className="w-9 h-9 rounded-full border-2 border-[#F6F1E9] object-cover" />
                <img src={`${baseUrl}/images/avatar_2.png`} alt="Client 2" className="w-9 h-9 rounded-full border-2 border-[#F6F1E9] object-cover" />
                <img src={`${baseUrl}/images/avatar_3.png`} alt="Client 3" className="w-9 h-9 rounded-full border-2 border-[#F6F1E9] object-cover" />
              </div>
              <p className="text-[13.5px] text-[#6B6155] m-0 leading-[1.45]">
                Trusted by <b className="text-[#211C16]">200+</b> clinics, studios<br />&amp; service teams nationwide.
              </p>
            </div>
          </motion.div>

          {/* Transcript Device Right */}
          <motion.div 
            className="flex flex-col gap-4"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Industry Pills Selector */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-[#FFFDF9]/60 rounded-xl border border-[#E9DFCE] max-w-full">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setPresetIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02] ${
                    presetIndex === idx
                      ? "bg-[#211C16] text-[#F6F1E9] shadow-sm"
                      : "text-[#6B6155] hover:text-[#211C16]"
                  }`}
                >
                  <span>{preset.emoji}</span>
                  <span>{preset.industry}</span>
                </button>
              ))}
            </div>

            {/* Transcript Card Container */}
            <div style={{ background: "#FFFDF9", border: "1px solid #E9DFCE" }} className="rounded-2xl p-[28px] shadow-[0_28px_56px_-30px_rgba(33,28,22,0.4)] relative overflow-hidden transform-gpu">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE7D8]">
                <div className="flex items-center gap-[9px]">
                  <span className="w-2 h-2 rounded-full bg-[#4F9D69] animate-blip"></span>
                  <span className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#6B6155]">Live · {activePreset.agentRole}</span>
                </div>
                <span style={{ fontFamily: "'Newsreader', serif" }} className="text-[13px] text-[#9A8F7E]">
                  00:{dialogueCount * 4 < 10 ? `0${dialogueCount * 4}` : dialogueCount * 4}
                </span>
              </div>

              {/* Dialogue Container */}
              <div className="py-[22px] flex flex-col gap-5 min-h-[170px] justify-start">
                <AnimatePresence mode="popLayout">
                  {activePreset.dialogue.slice(0, dialogueCount).map((line, index) => {
                    const isAgent = line.speaker === "agent";
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                        <div className="text-[11px] tracking-[0.12em] uppercase font-bold mb-1.5" style={{ color: isAgent ? "#6B6155" : "#B8502E" }}>
                          {isAgent ? "Aisync" : "Caller"}
                        </div>
                        <p style={{ fontFamily: "'Newsreader', serif" }} className="text-[17.5px] sm:text-[18px] leading-[1.45] m-0 text-[#2C261E]">
                          {line.text}
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Animated Wave visualizer */}
              <div className="flex items-end gap-[3px] h-8 my-5 transform-gpu">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      backgroundColor: i % 3 === 0 ? "#E6C9B4" : i % 3 === 1 ? "#DDA988" : "#B8502E",
                      borderRadius: "2px",
                      transformOrigin: "bottom"
                    }}
                    className="h-full animate-wv"
                  />
                ))}
              </div>

              {/* Success Badge */}
              <div className="min-h-[46px]">
                {dialogueCount >= activePreset.dialogue.length && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="flex items-center gap-2.5 bg-[#F0F6F1] border border-[#D6E7DA] rounded-xl px-[15px] py-[13px]"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#4F9D69] text-white flex items-center justify-center text-[12px] font-bold">✓</span>
                    <span className="text-[13.5px] font-bold text-[#2C4A36]">{activePreset.statusText}</span>
                  </motion.div>
                )}
              </div>

              {/* Simulator Action Row */}
              <div className="flex justify-between items-center mt-6 pt-3 border-t border-[#EFE7D8] text-xs">
                <button
                  onClick={() => setIsCalling(!isCalling)}
                  className="text-[#6B6155] hover:text-[#211C16] flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                >
                  {isCalling ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
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
                  className="text-[#6B6155] hover:text-[#211C16] font-semibold transition-colors cursor-pointer"
                >
                  Reset Call
                </button>
              </div>

            </div>
          </motion.div>

        </div>

        {/* trust strip */}
        <motion.div 
          className="flex flex-col md:flex-row items-center justify-between mt-14 py-6 border-y border-[#E4D9C9] gap-4"
          {...fadeInUp}
        >
          <span className="text-[12px] tracking-[0.12em] uppercase text-[#9A8F7E] font-bold text-center md:text-left">Works with the tools you already use</span>
          <div style={{ fontFamily: "'Newsreader', serif" }} className="flex flex-wrap justify-center items-center gap-8 text-[18px] text-[#6B6155] font-normal">
            <span>Google Calendar</span>
            <span>Outlook</span>
            <span>HubSpot</span>
            <span>Calendly</span>
            <span>Salesforce</span>
          </div>
        </motion.div>
      </section>

      {/* ===== PROBLEM ===== */}
      <motion.section 
        className="max-w-[1180px] mx-auto px-6 md:px-14 py-16 md:py-20"
        {...fadeInUp}
      >
        <div className="max-w-[680px] mb-14">
          <span className="text-xs tracking-[0.16em] uppercase text-[#B8502E] font-bold">The cost of a ringing phone</span>
          <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[38px] sm:text-[50px] leading-[1.05] tracking-[-0.01em] mt-[18px] mb-0">
            Every unanswered call is a customer who already called someone else.
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-0 border-t border-[#E4D9C9]">
          <div className="py-9 pr-6 md:border-r border-[#E4D9C9] border-b md:border-b-0">
            <div style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[54px] sm:text-[64px] leading-none text-[#B8502E]">1 in 3</div>
            <p className="text-[15px] text-[#564C40] mt-4 mb-0 leading-[1.5] max-w-[270px]">
              calls to small businesses go unanswered during busy hours.
            </p>
          </div>
          <div className="py-9 md:px-9 md:border-r border-[#E4D9C9] border-b md:border-b-0">
            <div style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[54px] sm:text-[64px] leading-none text-[#B8502E]">85%</div>
            <p className="text-[15px] text-[#564C40] mt-4 mb-0 leading-[1.5] max-w-[270px]">
              of people who reach voicemail hang up and never call back.
            </p>
          </div>
          <div className="py-9 md:pl-9">
            <div style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[54px] sm:text-[64px] leading-none text-[#B8502E]">62%</div>
            <p className="text-[15px] text-[#564C40] mt-4 mb-0 leading-[1.5] max-w-[270px]">
              of callers won't wait on hold — they'd rather try a competitor.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ===== FEATURES ===== */}
      <section style={{ background: "#F1EADD" }} className="border-y border-[#E4D9C9]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-14 py-16 md:py-20">
          <motion.div className="max-w-[620px] mb-12" {...fadeInUp}>
            <span className="text-xs tracking-[0.16em] uppercase text-[#B8502E] font-bold">One agent, every call</span>
            <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[38px] sm:text-[50px] leading-[1.05] mt-[18px] mb-4">
              Like your best front-desk employee — who never takes a day off.
            </h2>
            <p className="text-[17px] text-[#564C40] leading-[1.55] m-0">
              Aisync speaks naturally, understands what the caller actually wants, and takes the action a good employee would.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
          >
            {[
              { num: "01", title: "Human-like voice", desc: "Natural pacing, warm inflection, real listening. Callers rarely realize it's AI." },
              { num: "02", title: "Inbound & outbound", desc: "Answers reservations and questions, and makes warm follow-up calls on your behalf." },
              { num: "03", title: "Books appointments", desc: "Reads your live availability and writes the booking straight into your calendar." },
              { num: "04", title: "Instant answers", desc: "Hours, pricing, address, services — your FAQ, answered accurately in seconds." },
              { num: "05", title: "Summaries & notes", desc: "Every call comes back as a tidy summary with the caller's intent and next steps." },
              { num: "06", title: "Calendar & CRM sync", desc: "Bookings, contacts, and follow-ups flow into the systems you already run on." }
            ].map((feat, idx) => (
              <motion.div 
                key={idx} 
                style={{ background: "#FFFDF9", border: "1px solid #E9DFCE" }} 
                className="rounded-xl p-[30px] shadow-sm transform-gpu"
                variants={staggerItem}
                whileHover={{ y: -6, scale: 1.01, boxShadow: "0 18px 36px -12px rgba(33,28,22,0.12)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div style={{ fontFamily: "'Newsreader', serif" }} className="italic text-[15px] text-[#B8502E] mb-[18px]">{feat.num}</div>
                <h3 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[26px] mb-2.5">{feat.title}</h3>
                <p className="text-[14.5px] text-[#6B6155] leading-[1.55] m-0">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="max-w-[1180px] mx-auto px-6 md:px-14 py-16 md:py-20">
        <motion.div className="max-w-[620px] mb-14" {...fadeInUp}>
          <span className="text-xs tracking-[0.16em] uppercase text-[#B8502E] font-bold">Live in an afternoon</span>
          <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[38px] sm:text-[50px] leading-[1.05] mt-[18px] mb-0">
            Four steps from ringing phone to handled call.
          </h2>
        </motion.div>

        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
        >
          {[
            { step: "1", title: "Connect your line", desc: "Forward your missed or busy calls to your Aisync number, and link your tools." },
            { step: "2", title: "Configure the agent", desc: "Set your scripts, FAQs, booking rules, and brand voice in the portal." },
            { step: "3", title: "It speaks naturally", desc: "The AI greets callers, understands intent, and handles the conversation warmly." },
            { step: "4", title: "Everything syncs", desc: "Bookings, notes, and summaries land in your calendar and inbox automatically." }
          ].map((item, idx) => (
            <motion.div key={idx} className="border-t-2 border-[#211C16] pt-[22px]" variants={staggerItem}>
              <div style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[40px] leading-none mb-3.5">{item.step}</div>
              <h3 className="text-[18px] font-bold mb-2">{item.title}</h3>
              <p className="text-[14px] text-[#6B6155] leading-[1.55] m-0">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ===== USE CASES ===== */}
      <section id="uses" style={{ background: "#211C16", color: "#F6F1E9" }}>
        <div className="max-w-[1180px] mx-auto px-6 md:px-14 py-16 md:py-20">
          <motion.div className="max-w-[620px] mb-12" {...fadeInUp}>
            <span className="text-xs tracking-[0.16em] uppercase text-[#E0A98A] font-bold">Built for businesses that run on the phone</span>
            <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[38px] sm:text-[50px] leading-[1.05] mt-[18px] mb-0 text-[#F6F1E9]">
              Wherever a missed call costs you money.
            </h2>
          </motion.div>

          <motion.div 
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#3A322A] border border-[#3A322A] rounded-2xl overflow-hidden"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
          >
            {[
              { title: "Clinics", img: "usecase_clinics.png", desc: "Book checkups, handle reschedules, and answer insurance questions without tying up the front desk." },
              { title: "Restaurants", img: "usecase_restaurants.png", desc: "Take reservations during the dinner rush, confirm party sizes, and never drop a booking." },
              { title: "Real estate", img: "usecase_realestate.png", desc: "Schedule viewings, qualify leads, and email listing details the moment someone calls." },
              { title: "Service trades", img: "usecase_trades.png", desc: "Capture job requests on the road, book site visits, and follow up on every quote." }
            ].map((use, idx) => (
              <motion.div 
                key={idx} 
                className="bg-[#211C16] p-[34px_28px] flex flex-col items-start transform-gpu cursor-pointer"
                variants={staggerItem}
                whileHover={{ scale: 1.02, backgroundColor: "#27221b" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <img 
                  src={`${baseUrl}/images/${use.img}`} 
                  alt={use.title} 
                  loading="lazy"
                  className="w-14 h-14 object-contain mb-5 rounded-lg border border-[#3A322A] p-2 bg-[#FFFDF9]/5 mix-blend-lighten"
                />
                <div style={{ fontFamily: "'Newsreader', serif" }} className="italic text-[22px] text-[#E0A98A] mb-3">{use.title}</div>
                <p className="text-[14px] text-[#C6BBAC] leading-[1.6] m-0">{use.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== ROI CALCULATOR ===== */}
      <motion.section 
        id="roi" 
        className="max-w-[1180px] mx-auto px-6 md:px-14 py-16 md:py-20"
        {...fadeInUp}
      >
        <div className="max-w-[620px] mb-12">
          <span className="text-xs tracking-[0.16em] uppercase text-[#B8502E] font-bold">Do the math</span>
          <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[38px] sm:text-[50px] leading-[1.05] mt-[18px] mb-4">
            See the revenue you're letting ring out.
          </h2>
          <p className="text-[17px] text-[#564C40] leading-[1.55] m-0">
            Missed calls are missed clients. Estimate what Aisync recaptures for you each month.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
          {/* Sliders Left */}
          <div style={{ background: "#FFFDF9", border: "1px solid #E9DFCE" }} className="rounded-2xl p-[36px] flex flex-col justify-center shadow-sm">
            
            {/* Missed Calls Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-baseline mb-3.5">
                <span className="text-sm font-semibold">Missed calls each month</span>
                <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[28px] text-[#B8502E] leading-none">{missedCalls}</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                value={missedCalls}
                onChange={(e) => setMissedCalls(Number(e.target.value))}
                style={{ accentColor: "#B8502E" }}
                className="w-full h-1 bg-[#E4D9C9] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Avg ticket value Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-baseline mb-3.5">
                <span className="text-sm font-semibold">Average value per customer</span>
                <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[28px] text-[#B8502E] leading-none">${dealValue}</span>
              </div>
              <input
                type="range"
                min="20"
                max="1500"
                step="10"
                value={dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
                style={{ accentColor: "#B8502E" }}
                className="w-full h-1 bg-[#E4D9C9] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Conversion rate Slider */}
            <div>
              <div className="flex justify-between items-baseline mb-3.5">
                <span className="text-sm font-semibold">Booking conversion rate</span>
                <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[28px] text-[#B8502E] leading-none">{conversionRate}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={conversionRate}
                onChange={(e) => setConversionRate(Number(e.target.value))}
                style={{ accentColor: "#B8502E" }}
                className="w-full h-1 bg-[#E4D9C9] rounded-lg appearance-none cursor-pointer"
              />
            </div>

          </div>

          {/* Projection Card Right */}
          <div className="bg-[#211C16] text-[#F6F1E9] rounded-2xl p-[36px] flex flex-col justify-between shadow-xl">
            <div>
              <span className="text-[12px] tracking-[0.14em] uppercase text-[#E0A98A] font-bold">Monthly projection</span>
              
              <div className="mt-7">
                <div className="text-[13px] text-[#C6BBAC] mb-1">Recovered revenue</div>
                <div style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[56px] sm:text-[64px] leading-none text-[#F6F1E9]">
                  ${revenueRecovered.toLocaleString()}
                </div>
              </div>

              <div className="flex gap-10 mt-7 pt-6 border-t border-[#3A322A]">
                <div>
                  <div style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[30px] sm:text-[34px] text-[#E0A98A] leading-none">{recoveredLeads}</div>
                  <div className="text-[12.5px] text-[#C6BBAC] mt-1 font-sans">extra bookings</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[30px] sm:text-[34px] text-[#E0A98A] leading-none">{roiMultiplier}×</div>
                  <div className="text-[12.5px] text-[#C6BBAC] mt-1 font-sans font-normal">return vs. cost</div>
                </div>
              </div>
            </div>

            <a href="#demo" className="mt-8 block text-center bg-[#B8502E] text-[#F6F1E9] py-3.5 rounded-full font-semibold text-[15px] hover:bg-[#8f391e] transition-all duration-300 transform hover:scale-[1.01]">
              Recapture this revenue
            </a>
          </div>
        </div>
      </motion.section>

      {/* ===== PRICING ===== */}
      <section id="pricing" style={{ background: "#F1EADD" }} className="border-y border-[#E4D9C9]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-14 py-16 md:py-20">
          
          <motion.div className="text-center mb-11" {...fadeInUp}>
            <span className="text-xs tracking-[0.16em] uppercase text-[#B8502E] font-bold">Simple plans</span>
            <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[38px] sm:text-[50px] leading-[1.05] mt-[18px] mb-6">
              Pricing that scales with your phone.
            </h2>
            
            {/* Toggle Billing */}
            <div className="inline-flex items-center gap-1 bg-[#E4D9C9] p-1 rounded-full">
              <button
                onClick={() => setIsAnnual(false)}
                style={{
                  padding: "9px 18px",
                  border: "none",
                  borderRadius: "999px",
                  background: !isAnnual ? "#211C16" : "transparent",
                  color: !isAnnual ? "#F6F1E9" : "#6B6155",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Hanken Grotesk', sans-serif"
                }}
                className="transition-all duration-200"
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                style={{
                  padding: "9px 18px",
                  border: "none",
                  borderRadius: "999px",
                  background: isAnnual ? "#211C16" : "transparent",
                  color: isAnnual ? "#F6F1E9" : "#6B6155",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Hanken Grotesk', sans-serif"
                }}
                className="transition-all duration-200"
              >
                Annual · save 20%
              </button>
            </div>
          </motion.div>

          <motion.div 
            className="grid lg:grid-cols-3 gap-5 items-stretch"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
          >
            {/* Starter Plan */}
            <motion.div 
              style={{ background: "#FFFDF9", border: "1px solid #E9DFCE" }} 
              className="rounded-2xl p-[34px] flex flex-col justify-between shadow-sm transform-gpu"
              variants={staggerItem}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div>
                <span className="text-[12px] tracking-[0.12em] uppercase text-[#6B6155] font-bold">Starter</span>
                <div className="flex items-baseline gap-1.5 mt-[18px] mb-1">
                  <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[56px] leading-none">${starterPrice}</span>
                  <span className="text-[14px] text-[#6B6155]">/ mo</span>
                </div>
                <span className="text-[12px] text-[#9A8F7E] block mb-6">{starterNote}</span>
                <div className="h-px bg-[#EFE7D8] mb-[22px]"></div>
                
                <ul className="list-none p-0 m-[0_0_28px] flex flex-col gap-3 text-[14px] text-[#564C40]">
                  <li className="flex gap-2.5"><span className="text-[#B8502E]">—</span> 200 call minutes / month</li>
                  <li className="flex gap-2.5"><span className="text-[#B8502E]">—</span> 1 custom AI voice agent</li>
                  <li className="flex gap-2.5"><span className="text-[#B8502E]">—</span> Standard voice engine</li>
                  <li className="flex gap-2.5"><span className="text-[#B8502E]">—</span> Web booking dashboard</li>
                </ul>
              </div>

              <a href="#demo" style={{ border: "1px solid #211C16" }} className="mt-auto block text-center text-[#211C16] py-3 rounded-full font-semibold text-[14px] hover:bg-[#211C16] hover:text-[#F6F1E9] transition-all duration-300">
                Get started
              </a>
            </motion.div>

            {/* Growth Plan (Popular) */}
            <motion.div 
              className="bg-[#211C16] text-[#F6F1E9] rounded-2xl p-[34px] flex flex-col justify-between relative shadow-lg transform-gpu"
              variants={staggerItem}
              whileHover={{ y: -7 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <span style={{ fontFamily: "'Newsreader', serif" }} className="absolute top-6 right-6 italic text-[14px] text-[#E0A98A]">Most popular</span>
              <div>
                <span className="text-[12px] tracking-[0.12em] uppercase text-[#E0A98A] font-bold">Growth</span>
                <div className="flex items-baseline gap-1.5 mt-[18px] mb-1">
                  <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[56px] leading-none text-[#F6F1E9]">${growthPrice}</span>
                  <span className="text-[14px] text-[#C6BBAC]">/ mo</span>
                </div>
                <span className="text-[12px] text-[#9A8F7E] block mb-6">{growthNote}</span>
                <div className="h-px bg-[#3A322A] mb-[22px]"></div>
                
                <ul className="list-none p-0 m-[0_0_28px] flex flex-col gap-3 text-[14px] text-[#D8CFC2]">
                  <li className="flex gap-2.5"><span className="text-[#E0A98A]">—</span> 800 call minutes / month</li>
                  <li className="flex gap-2.5"><span className="text-[#E0A98A]">—</span> Up to 3 AI voice agents</li>
                  <li className="flex gap-2.5"><span className="text-[#E0A98A]">—</span> Premium voice library</li>
                  <li className="flex gap-2.5"><span className="text-[#E0A98A]">—</span> SMS &amp; email follow-ups</li>
                  <li className="flex gap-2.5"><span className="text-[#E0A98A]">—</span> Google &amp; Outlook sync</li>
                </ul>
              </div>

              <a href="#demo" className="mt-auto block text-center bg-[#B8502E] text-[#F6F1E9] py-3.5 rounded-full font-semibold text-[14px] hover:bg-[#8f391e] transition-all duration-300">
                Get started today
              </a>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div 
              style={{ background: "#FFFDF9", border: "1px solid #E9DFCE" }} 
              className="rounded-2xl p-[34px] flex flex-col justify-between shadow-sm transform-gpu"
              variants={staggerItem}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div>
                <span className="text-[12px] tracking-[0.12em] uppercase text-[#6B6155] font-bold">Enterprise</span>
                <div className="flex items-baseline mt-[18px] mb-1">
                  <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[56px] leading-none">Custom</span>
                </div>
                <span className="text-[12px] text-[#9A8F7E] block mb-6">Tailored to your scale</span>
                <div className="h-px bg-[#EFE7D8] mb-[22px]"></div>
                
                <ul className="list-none p-0 m-[0_0_28px] flex flex-col gap-3 text-[14px] text-[#564C40]">
                  <li className="flex gap-2.5"><span className="text-[#B8502E]">—</span> Unlimited call volume</li>
                  <li className="flex gap-2.5"><span className="text-[#B8502E]">—</span> Custom voice cloning</li>
                  <li className="flex gap-2.5"><span className="text-[#B8502E]">—</span> Dedicated account manager</li>
                  <li className="flex gap-2.5"><span className="text-[#B8502E]">—</span> API &amp; webhook integration</li>
                  <li className="flex gap-2.5"><span className="text-[#B8502E]">—</span> Custom SLA &amp; infrastructure</li>
                </ul>
              </div>

              <a href="#demo" style={{ border: "1px solid #211C16" }} className="mt-auto block text-center text-[#211C16] py-3 rounded-full font-semibold text-[14px] hover:bg-[#211C16] hover:text-[#F6F1E9] transition-all duration-300">
                Contact sales
              </a>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="max-w-[760px] mx-auto px-6 md:px-14 py-16 md:py-20">
        <motion.div className="text-center mb-12" {...fadeInUp}>
          <span className="text-xs tracking-[0.16em] uppercase text-[#B8502E] font-bold">Good questions</span>
          <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[38px] sm:text-[50px] leading-[1.05] mt-[18px] mb-0">
            Frequently asked.
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
        >
          {[
            {
              q: "Does the AI really sound like a person?",
              a: "Yes. Aisync uses neural text-to-speech with natural pacing, breathing, and warm inflection, plus ultra-low latency so there's no awkward delay. Most callers don't realize they're talking to AI."
            },
            {
              q: "How does the booking integration work?",
              a: "Aisync connects to Google Calendar, Outlook, Calendly, and industry tools like Jane, Mindbody, and Acuity. It reads live availability, books directly into your schedule, and sends an instant text confirmation."
            },
            {
              q: "Can I customize the script and personality?",
              a: "Completely. In the client portal you define the greeting, knowledge base, booking rules, FAQs, and tone of voice — and updates take effect instantly."
            },
            {
              q: "What if the agent can't answer something?",
              a: "It gracefully takes a message, transfers to a human, or schedules a callback — and sends you an immediate summary of the conversation by email or SMS."
            },
            {
              q: "Is there a contract, or can I cancel anytime?",
              a: "Starter and Growth are month-to-month — cancel or change plans anytime, no penalty. Annual billing is available if you'd like to lock in savings."
            }
          ].map((faq, idx) => (
            <motion.div key={idx} className="border-t border-[#E4D9C9] last:border-b last:border-[#E4D9C9]" variants={staggerItem}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full bg-none border-none py-6 flex justify-between items-center cursor-pointer text-left focus:outline-none"
              >
                <span className="text-[17px] sm:text-[18px] font-bold text-[#211C16]">{faq.q}</span>
                <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[26px] text-[#B8502E] leading-none">
                  {openFaq === idx ? "–" : "+"}
                </span>
              </button>
              
              <AnimatePresence initial={false}>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p style={{ fontFamily: "'Newsreader', serif" }} className="text-[17px] leading-[1.6] text-[#564C40] m-0 pb-[26px]">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ===== DEMO REQUEST FORM ===== */}
      <section id="demo" className="bg-[#211C16] text-[#F6F1E9]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-14 py-20 md:py-24">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-start">
            
            {/* Demo Side Info */}
            <motion.div {...fadeInUp}>
              <span className="text-[12px] tracking-[0.16em] uppercase text-[#E0A98A] font-bold">Book your demo</span>
              <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[38px] sm:text-[52px] leading-[1.04] mt-[18px] mb-[22px] text-[#F6F1E9]">
                Hear your own agent answer a call.
              </h2>
              <p className="text-[17px] text-[#C6BBAC] leading-[1.6] mb-8 max-w-[380px]">
                Tell us a little about your business and we'll set up a live demo tuned to your industry — usually within a day.
              </p>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-[15px] text-[#D8CFC2]">
                  <span className="text-[#E0A98A] font-bold">—</span> A real call you can listen to
                </div>
                <div className="flex items-center gap-3 text-[15px] text-[#D8CFC2]">
                  <span className="text-[#E0A98A] font-bold">—</span> Set up for your use case
                </div>
                <div className="flex items-center gap-3 text-[15px] text-[#D8CFC2]">
                  <span className="text-[#E0A98A] font-bold">—</span> No commitment, no card
                </div>
              </div>
            </motion.div>

            {/* Demo Form Container */}
            <motion.div 
              style={{ background: "#FFFDF9" }} 
              className="rounded-2xl p-[36px] text-[#211C16] shadow-2xl"
              {...fadeInUp}
            >
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-10 px-5"
                >
                  <span className="w-14 h-14 rounded-full bg-[#F0F6F1] border border-[#D6E7DA] text-[#4F9D69] flex items-center justify-center text-[26px]">✓</span>
                  <h3 style={{ fontFamily: "'Instrument Serif', serif" }} className="font-normal text-[32px] text-[#211C16] mt-[22px] mb-2.5">
                    You're on the list.
                  </h3>
                  <p className="text-[15px] text-[#6B6155] leading-[1.55] m-0 max-w-[320px]">
                    Thanks — we'll be in touch shortly to schedule your live demo.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleDemoSubmit} className="flex flex-col gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-[#6B6155] mb-[7px]">Your name</label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Jane Doe"
                        style={{ border: "1px solid #E4D9C9", background: "#F6F1E9" }}
                        className="w-full p-[12px_14px] rounded-xl text-sm focus:border-[#B8502E] focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-[#6B6155] mb-[7px]">Business name</label>
                      <input
                        required
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="Bright Smile Dental"
                        style={{ border: "1px solid #E4D9C9", background: "#F6F1E9" }}
                        className="w-full p-[12px_14px] rounded-xl text-sm focus:border-[#B8502E] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-[#6B6155] mb-[7px]">Email</label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="jane@brightsmile.com"
                        style={{ border: "1px solid #E4D9C9", background: "#F6F1E9" }}
                        className="w-full p-[12px_14px] rounded-xl text-sm focus:border-[#B8502E] focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-[#6B6155] mb-[7px]">Phone</label>
                      <input
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 019-9000"
                        style={{ border: "1px solid #E4D9C9", background: "#F6F1E9" }}
                        className="w-full p-[12px_14px] rounded-xl text-sm focus:border-[#B8502E] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[#6B6155] mb-[7px]">Industry</label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      style={{ border: "1px solid #E4D9C9", background: "#F6F1E9" }}
                      className="w-full p-[12px_14px] rounded-xl text-sm focus:border-[#B8502E] focus:outline-none transition-all"
                    >
                      <option>Clinics &amp; healthcare</option>
                      <option>Restaurants</option>
                      <option>Real estate</option>
                      <option>Service trades</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[#6B6155] mb-[7px]">Anything we should know?</label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="We miss a lot of calls during lunch..."
                      style={{ border: "1px solid #E4D9C9", background: "#F6F1E9", resize: "vertical" }}
                      className="w-full p-[12px_14px] rounded-xl text-sm focus:border-[#B8502E] focus:outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-[#211C16] text-[#F6F1E9] py-3.5 rounded-full font-semibold text-[15px] cursor-pointer hover:bg-[#B8502E] transition-all duration-300 mt-2"
                  >
                    Request my demo
                  </button>
                </form>
              )}
            </motion.div>

          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="max-w-[1180px] mx-auto px-6 md:px-14 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-[24px]">Aisync</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#B8502E] translate-y-[-2px] inline-block"></span>
        </div>
        <p className="text-[13px] text-[#9A8F7E] m-0 text-center sm:text-left">© 2026 Aisync — never miss another call.</p>
        <div className="flex gap-6 text-[13px] text-[#6B6155]">
          <span className="cursor-pointer hover:text-[#211C16] transition-colors">Privacy</span>
          <span className="cursor-pointer hover:text-[#211C16] transition-colors">Terms</span>
          <span className="cursor-pointer hover:text-[#211C16] transition-colors">Contact</span>
        </div>
      </footer>

    </div>
  );
}