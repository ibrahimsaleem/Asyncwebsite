import { useAuth } from "@/context/AuthContext";
import { Link } from "wouter";

export default function ClientDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/50 flex flex-col">
        <div className="p-6 border-b border-border/50 flex items-center gap-2">
          <div className="w-5 h-5 bg-primary rounded-sm" />
          <span className="font-bold tracking-tight">Aisync Client</span>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <a href="#" className="px-3 py-2 rounded-md bg-primary/10 text-primary font-medium text-sm">Overview</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Project</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Invoices</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Files</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Requests</a>
        </nav>
        <div className="p-4 border-t border-border/50 text-sm">
          <p className="text-muted-foreground truncate mb-2">{user?.email}</p>
          <button onClick={() => logout()} className="text-destructive font-medium hover:underline">Log out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground mt-1">Here's the latest on your AI agent integration.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-card border border-border p-6 rounded-xl">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Project Status</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">Build Phase</span>
              <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-medium">Active</span>
            </div>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Latest Invoice</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">$2,500</span>
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">Paid</span>
            </div>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Assigned Team</h3>
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-xs">JS</div>
              <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-xs text-primary">AK</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4 text-lg">Project Timeline</h3>
          <div className="relative pt-4">
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-border/50 -translate-y-1/2 z-0" />
            <div className="absolute left-0 top-1/2 w-1/3 h-0.5 bg-primary -translate-y-1/2 z-0" />
            
            <div className="relative z-10 flex justify-between">
              {['Onboarding', 'Build Phase', 'Demo Phase', 'Testing', 'Completed'].map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 ${i <= 1 ? 'bg-primary border-primary shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-card border-border/80'}`} />
                  <span className={`text-xs ${i <= 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}