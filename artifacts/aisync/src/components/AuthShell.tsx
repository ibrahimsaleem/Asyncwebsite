import type { ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";

const serif = { fontFamily: "'Instrument Serif', serif" };

// Shared page frame for login and signup, matching the marketing site's
// warm cream / terracotta look with a soft frosted card.
export default function AuthShell({
  title,
  subtitle,
  eyebrow,
  wide = false,
  children,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      style={{ background: "#F6F1E9", color: "#211C16", fontFamily: "'Hanken Grotesk', sans-serif" }}
      className="min-h-screen relative overflow-hidden flex flex-col items-center px-5 py-8 sm:py-12"
    >
      {/* soft drifting warm light */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0">
        <div className="ambient-orb a w-[52vw] h-[52vw] -top-[14vw] -left-[10vw] bg-[#B8502E]/[0.13]" />
        <div className="ambient-orb b w-[44vw] h-[44vw] top-[35vh] -right-[12vw] bg-[#E0A98A]/[0.30]" />
        <div className="ambient-orb c w-[36vw] h-[36vw] -bottom-[14vw] left-[20vw] bg-[#E9DFCE]" />
      </div>

      <Link href="/" className="relative z-10 flex items-center gap-2 mb-7 sm:mb-9 group">
        <span style={serif} className="text-[34px] leading-none tracking-tight">aicronics</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#B8502E] -translate-y-2 group-hover:scale-150 transition-transform" />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-10 w-full ${wide ? "max-w-[640px]" : "max-w-[440px]"} glass-warm rounded-[28px] p-7 sm:p-10`}
      >
        <div className="text-center mb-8">
          {eyebrow && (
            <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase text-[#B8502E] font-bold mb-4">
              <span className="w-5 h-px bg-[#B8502E]" /> {eyebrow} <span className="w-5 h-px bg-[#B8502E]" />
            </div>
          )}
          <h1 style={serif} className="text-[38px] sm:text-[44px] leading-[1.03] tracking-[-0.01em] font-normal">{title}</h1>
          {subtitle && <p className="text-[15px] text-[#564C40] leading-[1.55] mt-3">{subtitle}</p>}
        </div>

        {children}

        {footer && <div className="mt-8 pt-6 border-t border-[#E4D9C9] text-[14.5px] text-[#6B6155] text-center">{footer}</div>}
      </motion.div>

      <p className="relative z-10 mt-8 text-[12.5px] text-[#9A8F7E]">© 2026 aicronics — never miss another call.</p>
    </div>
  );
}

export const authInput =
  "w-full bg-[#FFFDF9] border border-[#E4D9C9] rounded-xl px-4 py-3 text-[15px] text-[#211C16] placeholder:text-[#A79B8A] hover:border-[#C9BBA6] focus:outline-none focus:border-[#B8502E] focus:ring-4 focus:ring-[#B8502E]/10 transition-all";
export const authLabel = "block text-[13px] font-semibold mb-1.5 text-[#564C40]";
export const authButton =
  "btn-shine w-full bg-[#211C16] text-[#F6F1E9] py-3.5 rounded-full font-semibold text-[15px] hover:bg-[#B8502E] transition-colors duration-300 disabled:opacity-60 shadow-[0_12px_30px_-12px_rgba(33,28,22,0.5)]";
export const authError = "mb-5 p-3.5 bg-[#B8502E]/10 border border-[#B8502E]/25 text-[#8f391e] rounded-xl text-[14px]";
