// Slowly drifting colored light + faint grid behind the portal pages.
export default function AmbientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="ambient-orb a w-[46vw] h-[46vw] -top-[12vw] -left-[8vw] bg-[hsl(224_82%_56%/0.22)]" />
      <div className="ambient-orb b w-[40vw] h-[40vw] top-[30vh] -right-[10vw] bg-[hsl(265_80%_60%/0.16)]" />
      <div className="ambient-orb c w-[34vw] h-[34vw] -bottom-[14vw] left-[25vw] bg-[hsl(190_85%_50%/0.12)]" />
      <div className="absolute inset-0 ambient-grid" />
    </div>
  );
}
