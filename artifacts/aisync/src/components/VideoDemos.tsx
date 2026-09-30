import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Play, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DEMO_CATEGORIES, DEMO_VIDEOS, type DemoVideo } from "@/data/demos";

const serif = { fontFamily: "'Instrument Serif', serif" };
const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
const WHATSAPP_URL = "https://wa.me/17138537974";
const INITIAL_COUNT = 8;

const fadeInUp = {
  initial: { opacity: 0, y: 35 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-120px" },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

export function MainDemoVideo() {
  return (
    <motion.section id="watch" className="max-w-[1180px] mx-auto px-6 md:px-14 pt-4 pb-16 md:pb-20" {...fadeInUp}>
      <div className="max-w-[680px] mb-10">
        <span className="text-xs tracking-[0.16em] uppercase text-[#B8502E] font-bold">See it in action</span>
        <h2 style={serif} className="font-normal text-[38px] sm:text-[50px] leading-[1.05] tracking-[-0.01em] mt-[18px] mb-4">
          Real calls, answered <span className="italic text-[#B8502E]">start to finish.</span>
        </h2>
        <p className="text-[17px] text-[#564C40] leading-[1.55] m-0">
          An after-hours call to a law firm, a Google Meet booked with a real attorney, then outbound offers,
          address checks and reminders — all handled by the voice agent.
        </p>
      </div>

      {/* Landscape cut on desktop, vertical cut on phones */}
      <div className="hidden md:block rounded-[28px] overflow-hidden border border-[#E4D9C9] shadow-[0_40px_100px_rgba(33,28,22,0.14)] bg-[#211C16]">
        <video
          className="w-full aspect-video block"
          src={`${baseUrl}/videos/main-demo.mp4`}
          poster={`${baseUrl}/videos/main-demo.jpg`}
          controls
          playsInline
          preload="none"
        />
      </div>
      <div className="md:hidden mx-auto max-w-[400px] rounded-[28px] overflow-hidden border border-[#E4D9C9] shadow-[0_30px_80px_rgba(33,28,22,0.14)] bg-[#211C16]">
        <video
          className="w-full aspect-[9/16] block"
          src={`${baseUrl}/videos/main-demo-vertical.mp4`}
          poster={`${baseUrl}/videos/main-demo-vertical.jpg`}
          controls
          playsInline
          preload="none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-8">
        <a href="#demos" className="btn-shine bg-[#211C16] text-[#F6F1E9] px-[26px] py-3.5 rounded-full font-semibold text-[15px] hover:bg-[#B8502E] transition-all duration-300 inline-flex items-center gap-2">
          Watch a demo for your industry <ArrowRight className="w-4 h-4" />
        </a>
        <Link href="/signup" className="text-[15px] font-semibold border-b border-[#211C16] pb-0.5 hover:text-[#B8502E] hover:border-[#B8502E] transition-colors">
          Sign up &amp; request your agent
        </Link>
      </div>
    </motion.section>
  );
}

function DemoCard({ demo, onOpen }: { demo: DemoVideo; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left rounded-2xl overflow-hidden bg-[#FFFDF9] border border-[#E4D9C9] hover:border-[#B8502E] hover:shadow-[0_20px_50px_rgba(33,28,22,0.12)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8502E]"
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-[#211C16]">
        <img
          src={`${baseUrl}/videos/demos/${demo.file}.jpg`}
          alt={`${demo.business} demo call`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#17130F]/85 via-transparent to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-14 h-14 rounded-full bg-[#B8502E] text-[#FFFDF9] flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
            <Play className="w-6 h-6 fill-current translate-x-[2px]" />
          </span>
        </span>
        <div className="absolute left-3 right-3 bottom-3 text-[#F6F1E9]">
          <div style={serif} className="text-[21px] leading-[1.1]">{demo.title}</div>
        </div>
      </div>
      <div className="p-3.5">
        <div className="text-[13px] font-bold text-[#211C16] truncate">{demo.business}</div>
        <div className="text-[12px] text-[#6B6155] mt-0.5 truncate">{demo.result}</div>
      </div>
    </button>
  );
}

export function DemoLibrary() {
  const [category, setCategory] = useState<string>("All");
  const [direction, setDirection] = useState<"all" | "inbound" | "outbound">("all");
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState<DemoVideo | null>(null);

  const filtered = useMemo(
    () =>
      DEMO_VIDEOS.filter(
        (d) => (category === "All" || d.category === category) && (direction === "all" || d.direction === direction),
      ),
    [category, direction],
  );
  const filtersActive = category !== "All" || direction !== "all";
  const visible = showAll || filtersActive ? filtered : filtered.slice(0, INITIAL_COUNT);

  const chip = (on: boolean) =>
    `shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold border transition-all duration-200 ${
      on ? "bg-[#211C16] text-[#F6F1E9] border-[#211C16]" : "bg-[#FFFDF9] text-[#564C40] border-[#E4D9C9] hover:border-[#211C16]"
    }`;

  return (
    <section id="demos" className="max-w-[1180px] mx-auto px-6 md:px-14 py-16 md:py-20">
      <motion.div className="max-w-[680px] mb-10" {...fadeInUp}>
        <span className="text-xs tracking-[0.16em] uppercase text-[#B8502E] font-bold">Demo library</span>
        <h2 style={serif} className="font-normal text-[38px] sm:text-[50px] leading-[1.05] tracking-[-0.01em] mt-[18px] mb-4">
          Hear it on a call <span className="italic text-[#B8502E]">like yours.</span>
        </h2>
        <p className="text-[17px] text-[#564C40] leading-[1.55] m-0">
          {DEMO_VIDEOS.length} short demos across industries — after-hours answering, bookings, offers, address checks and reminders.
          Pick your industry and press play.
        </p>
      </motion.div>

      <div className="flex gap-2.5 overflow-x-auto md:flex-wrap md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0 pb-1 [scrollbar-width:none] mb-2">
        {["All", ...DEMO_CATEGORIES].map((c) => (
          <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-2.5 overflow-x-auto md:flex-wrap md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0 pb-1 [scrollbar-width:none] mb-8">
        {([
          ["all", "All calls"],
          ["inbound", "↙ Inbound — we answer"],
          ["outbound", "↗ Outbound — we call out"],
        ] as const).map(([v, label]) => (
          <button key={v} type="button" className={chip(direction === v)} onClick={() => setDirection(v)}>
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-[#6B6155]">No demos match these filters yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {visible.map((d) => (
            <DemoCard key={d.file} demo={d} onOpen={() => setActive(d)} />
          ))}
        </div>
      )}

      {!showAll && !filtersActive && filtered.length > INITIAL_COUNT && (
        <div className="text-center mt-10">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="bg-[#FFFDF9] border border-[#211C16] text-[#211C16] px-7 py-3.5 rounded-full font-semibold text-[15px] hover:bg-[#211C16] hover:text-[#F6F1E9] transition-all duration-300"
          >
            Show all {DEMO_VIDEOS.length} demos
          </button>
        </div>
      )}

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-[420px] w-[calc(100vw-32px)] p-0 overflow-hidden bg-[#211C16] text-[#F6F1E9] border-[#3A322A] rounded-[24px] gap-0">
          {active && (
            <>
              <video
                key={active.file}
                className="w-full aspect-[9/16] max-h-[72vh] bg-black block"
                src={`${baseUrl}/videos/demos/${active.file}.mp4`}
                poster={`${baseUrl}/videos/demos/${active.file}.jpg`}
                controls
                autoPlay
                playsInline
              />
              <div className="p-5">
                <DialogTitle style={serif} className="font-normal text-[26px] leading-[1.1]">
                  {active.business}
                </DialogTitle>
                <DialogDescription className="text-[13px] text-[#C6BBAC] mt-1.5">
                  {active.tag} · {active.result}
                </DialogDescription>
                <div className="flex flex-wrap gap-2.5 mt-4">
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] text-[#FFFDF9] px-4 py-2.5 rounded-full font-semibold text-[13px] hover:bg-[#20ba5a] transition-colors"
                  >
                    WhatsApp us
                  </a>
                  <Link
                    href="/signup"
                    className="bg-[#B8502E] text-[#FFFDF9] px-4 py-2.5 rounded-full font-semibold text-[13px] hover:bg-[#8f391e] transition-colors"
                  >
                    Get this agent for my business
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
