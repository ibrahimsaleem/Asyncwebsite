import { useAuth } from "@/context/AuthContext";
import { useGetAdminSummary } from "@workspace/api-client-react";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  
  // Example data fetch
  const { data: summary } = useGetAdminSummary({
    query: {
      queryKey: ["/api/admin/summary"]
    }
  });

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/50 flex flex-col">
        <div className="p-6 border-b border-border/50 flex items-center gap-2">
          <div className="w-5 h-5 bg-destructive rounded-sm" />
          <span className="font-bold tracking-tight">Aisync Admin</span>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          <a href="#" className="px-3 py-2 rounded-md bg-primary/10 text-primary font-medium text-sm">Overview</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Clients</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Projects</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Employees</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Invoices</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Files</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Feature Requests</a>
          <a href="#" className="px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 text-sm">Demo Leads</a>
        </nav>
        <div className="p-4 border-t border-border/50 text-sm">
          <p className="text-muted-foreground truncate mb-2">{user?.email}</p>
          <button onClick={() => logout()} className="text-destructive font-medium hover:underline">Log out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Admin Overview</h1>
          <p className="text-muted-foreground mt-1">Platform metrics and health.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Clients</h3>
            <span className="text-3xl font-bold">{summary?.totalClients || 0}</span>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Projects</h3>
            <span className="text-3xl font-bold">{summary?.activeProjects || 0}</span>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Pending Requests</h3>
            <span className="text-3xl font-bold text-amber-500">{summary?.pendingFeatureRequests || 0}</span>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</h3>
            <span className="text-3xl font-bold text-emerald-400">${summary?.totalPaid || 0}</span>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Outstanding Due</h3>
            <span className="text-3xl font-bold text-destructive">${summary?.totalDue || 0}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h3 className="font-semibold text-lg">System Status</h3>
          </div>
          <div className="p-6 text-sm text-muted-foreground text-center">
            Detailed views are accessible via the sidebar navigation.
          </div>
        </div>
      </main>
    </div>
  );
}