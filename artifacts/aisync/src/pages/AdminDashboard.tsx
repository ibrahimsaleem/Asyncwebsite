import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useGetAdminSummary, useListClients, useListProjects, useListEmployees,
  useListInvoices, useListFeatureRequests, useListDemoRequests,
  useCreateClient, useCreateProject, useCreateEmployee,
  useUpdateFeatureRequest, useDeleteEmployee,
  ProjectInputStatus,
  getGetAdminSummaryQueryKey, getListClientsQueryKey, getListProjectsQueryKey,
  getListEmployeesQueryKey, getListInvoicesQueryKey, getListFeatureRequestsQueryKey,
  getListDemoRequestsQueryKey, FeatureRequestUpdateStatus, FeatureRequestStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, FolderKanban, UserCog, Receipt,
  Lightbulb, BookOpen, LogOut, X, Phone, Mail, Building2,
  TrendingUp, CheckCircle2, Clock, AlertCircle, ChevronRight,
  Plus, Star, Calendar, Briefcase,
} from "lucide-react";

type Tab = "overview" | "clients" | "projects" | "employees" | "invoices" | "feature-requests" | "demo-leads";

const PROJECT_STATUS_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  build_phase: "Build Phase",
  demo_phase: "Demo Phase",
  testing: "Testing",
  completed: "Completed",
};

const INDUSTRY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Healthcare:           { bg: "bg-teal-500/15",   text: "text-teal-400",   dot: "bg-teal-400" },
  Restaurants:          { bg: "bg-orange-500/15",  text: "text-orange-400", dot: "bg-orange-400" },
  "Real Estate":        { bg: "bg-indigo-500/15",  text: "text-indigo-400", dot: "bg-indigo-400" },
  "IT Support":         { bg: "bg-blue-500/15",    text: "text-blue-400",   dot: "bg-blue-400" },
  "Fitness & Wellness": { bg: "bg-green-500/15",   text: "text-green-400",  dot: "bg-green-400" },
  "Service Trades":     { bg: "bg-amber-500/15",   text: "text-amber-400",  dot: "bg-amber-400" },
};
const industryStyle = (ind: string) => INDUSTRY_STYLES[ind] ?? { bg: "bg-secondary", text: "text-muted-foreground", dot: "bg-muted-foreground" };

const PROJECT_STATUS_STYLES: Record<string, string> = {
  onboarding: "bg-slate-500/15 text-slate-400",
  build_phase: "bg-blue-500/15 text-blue-400",
  demo_phase: "bg-purple-500/15 text-purple-400",
  testing: "bg-orange-500/15 text-orange-400",
  completed: "bg-emerald-500/15 text-emerald-400",
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-400",
  partial: "bg-amber-500/15 text-amber-400",
  unpaid: "bg-red-500/15 text-red-400",
  overdue: "bg-red-600/15 text-red-500",
};

const FR_STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400",
  in_review: "bg-amber-500/15 text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-emerald-600/15 text-emerald-500",
  rejected: "bg-red-500/15 text-red-400",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function frLabel(s: string) {
  return s === "in_review" ? "In Review" : s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const qc = useQueryClient();

  const [showClientForm, setShowClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientBusiness, setNewClientBusiness] = useState("");
  const [newClientIndustry, setNewClientIndustry] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [addingClient, setAddingClient] = useState(false);

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProjClientId, setNewProjClientId] = useState("");
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjStatus, setNewProjStatus] = useState<string>(ProjectInputStatus.onboarding);
  const [newProjStart, setNewProjStart] = useState("");
  const [newProjEnd, setNewProjEnd] = useState("");
  const [addingProject, setAddingProject] = useState(false);

  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [addingEmp, setAddingEmp] = useState(false);
  const [showEmpForm, setShowEmpForm] = useState(false);

  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useGetAdminSummary({ query: { queryKey: getGetAdminSummaryQueryKey() } });
  const { data: clients } = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const { data: projects } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const { data: employees } = useListEmployees({ query: { queryKey: getListEmployeesQueryKey() } });
  const { data: invoices } = useListInvoices({ query: { queryKey: getListInvoicesQueryKey() } });
  const { data: featureRequests } = useListFeatureRequests({ query: { queryKey: getListFeatureRequestsQueryKey() } });
  const { data: demoRequests } = useListDemoRequests({ query: { queryKey: getListDemoRequestsQueryKey() } });

  const createClient = useCreateClient();
  const createProject = useCreateProject();
  const createEmployee = useCreateEmployee();
  const updateFeatureRequest = useUpdateFeatureRequest();
  const deleteEmployee = useDeleteEmployee();

  // Selected client panel data
  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const clientProjects = projects?.filter((p) => p.clientId === selectedClientId) ?? [];
  const clientInvoices = invoices?.filter((i) => i.clientId === selectedClientId) ?? [];
  const clientRequests = featureRequests?.filter((fr) => fr.clientId === selectedClientId) ?? [];

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setAddingClient(true);
    try {
      await createClient.mutateAsync({ data: { name: newClientName, email: newClientEmail, businessName: newClientBusiness, industry: newClientIndustry, phone: newClientPhone, password: newClientPassword || undefined } });
      setNewClientName(""); setNewClientEmail(""); setNewClientBusiness(""); setNewClientIndustry(""); setNewClientPhone(""); setNewClientPassword("");
      setShowClientForm(false);
      qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
    } finally { setAddingClient(false); }
  }

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjClientId) return;
    setAddingProject(true);
    try {
      await createProject.mutateAsync({ data: { clientId: parseInt(newProjClientId, 10), projectName: newProjName, description: newProjDesc, status: newProjStatus as any, startDate: newProjStart || undefined, expectedCompletionDate: newProjEnd || undefined } });
      setNewProjClientId(""); setNewProjName(""); setNewProjDesc(""); setNewProjStatus(ProjectInputStatus.onboarding); setNewProjStart(""); setNewProjEnd("");
      setShowProjectForm(false);
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
    } finally { setAddingProject(false); }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setAddingEmp(true);
    try {
      await createEmployee.mutateAsync({ data: { name: newEmpName, role: newEmpRole, email: newEmpEmail } });
      setNewEmpName(""); setNewEmpRole(""); setNewEmpEmail(""); setShowEmpForm(false);
      qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
    } finally { setAddingEmp(false); }
  }

  async function handleUpdateRequest(id: number, status: FeatureRequestUpdateStatus) {
    await updateFeatureRequest.mutateAsync({ id, data: { status } });
    qc.invalidateQueries({ queryKey: getListFeatureRequestsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
  }

  async function handleDeleteEmployee(id: number) {
    await deleteEmployee.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
  }

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",          label: "Overview",         icon: LayoutDashboard },
    { id: "clients",           label: "Clients",          icon: Users },
    { id: "projects",          label: "Projects",         icon: FolderKanban },
    { id: "employees",         label: "Team",             icon: UserCog },
    { id: "invoices",          label: "Invoices",         icon: Receipt },
    { id: "feature-requests",  label: "Requests",         icon: Lightbulb },
    { id: "demo-leads",        label: "Demo Leads",       icon: BookOpen },
  ];

  if (summaryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-1">Failed to load panel</p>
          <p className="text-sm text-muted-foreground">Please refresh the page.</p>
        </div>
      </div>
    );
  }

  // Project stage distribution for pipeline bar
  const stageCount = (projects ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalProjects = (projects ?? []).length;

  return (
    <div className="min-h-screen flex bg-background text-foreground">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 border-r border-border/50 bg-card/40 flex flex-col">
        <div className="p-5 border-b border-border/50 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight leading-none">Aisync</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 ${
                  tab === item.id
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
                {item.id === "demo-leads" && (demoRequests?.length ?? 0) > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {demoRequests!.length}
                  </span>
                )}
                {item.id === "feature-requests" && (summary?.pendingFeatureRequests ?? 0) > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {summary!.pendingFeatureRequests}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {initials(user?.name ?? "A")}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => logout()} className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {tab === "overview" && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold">Good day, {user?.name?.split(" ")[0]} 👋</h1>
                <p className="text-muted-foreground text-sm mt-1">Here's what's happening across your client base today.</p>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Total Clients",       value: summary?.totalClients ?? 0,           icon: Users,         color: "text-foreground",   accent: "bg-blue-500/10" },
                  { label: "Active Projects",      value: summary?.activeProjects ?? 0,         icon: FolderKanban,  color: "text-primary",      accent: "bg-primary/10" },
                  { label: "Completed Projects",   value: summary?.completedProjects ?? 0,      icon: CheckCircle2,  color: "text-emerald-400",  accent: "bg-emerald-500/10" },
                  { label: "Revenue Collected",    value: `$${(summary?.totalPaid ?? 0).toLocaleString()}`,    icon: TrendingUp,    color: "text-emerald-400",  accent: "bg-emerald-500/10" },
                  { label: "Outstanding Balance",  value: `$${(summary?.totalDue ?? 0).toLocaleString()}`,    icon: AlertCircle,   color: "text-destructive",  accent: "bg-destructive/10" },
                  { label: "Pending Requests",     value: summary?.pendingFeatureRequests ?? 0, icon: Lightbulb,     color: "text-amber-400",    accent: "bg-amber-500/10" },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="bg-card border border-border/60 rounded-2xl p-5 hover:border-border transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{m.label}</p>
                        <div className={`w-8 h-8 rounded-lg ${m.accent} flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${m.color}`} />
                        </div>
                      </div>
                      <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Project pipeline */}
              {totalProjects > 0 && (
                <div className="bg-card border border-border/60 rounded-2xl p-6 mb-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-muted-foreground" />
                    Project Pipeline
                  </h3>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
                    {Object.entries(PROJECT_STATUS_LABELS).map(([status, label]) => {
                      const count = stageCount[status] ?? 0;
                      const pct = (count / totalProjects) * 100;
                      if (!pct) return null;
                      const colors: Record<string, string> = { onboarding: "bg-slate-400", build_phase: "bg-blue-500", demo_phase: "bg-purple-500", testing: "bg-orange-500", completed: "bg-emerald-500" };
                      return <div key={status} className={`${colors[status]} rounded-full transition-all`} style={{ width: `${pct}%` }} title={`${label}: ${count}`} />;
                    })}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(PROJECT_STATUS_LABELS).map(([status, label]) => {
                      const count = stageCount[status] ?? 0;
                      const dotColors: Record<string, string> = { onboarding: "bg-slate-400", build_phase: "bg-blue-500", demo_phase: "bg-purple-500", testing: "bg-orange-500", completed: "bg-emerald-500" };
                      return (
                        <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
                          {label} <span className="font-semibold text-foreground">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent demo leads */}
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      Recent Demo Leads
                    </h3>
                    <button onClick={() => setTab("demo-leads")} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-border/30">
                    {(demoRequests ?? []).slice(0, 4).map((d) => {
                      const is = industryStyle(d.industry);
                      return (
                        <div key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{d.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{d.businessName}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${is.bg} ${is.text}`}>{d.industry}</span>
                            <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                    {(demoRequests ?? []).length === 0 && <p className="px-5 py-8 text-sm text-muted-foreground text-center">No demo leads yet.</p>}
                  </div>
                </div>

                {/* Pending feature requests */}
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-muted-foreground" />
                      Pending Requests
                    </h3>
                    <button onClick={() => setTab("feature-requests")} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-border/30">
                    {(featureRequests ?? []).filter((r) => r.status === "new" || r.status === "in_review").slice(0, 4).map((r) => (
                      <div key={r.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.clientBusinessName}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${FR_STATUS_STYLES[r.status]}`}>{frLabel(r.status)}</span>
                      </div>
                    ))}
                    {(featureRequests ?? []).filter((r) => r.status === "new" || r.status === "in_review").length === 0 && (
                      <p className="px-5 py-8 text-sm text-muted-foreground text-center">All caught up!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CLIENTS ──────────────────────────────────────────────────── */}
          {tab === "clients" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Clients</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">{(clients ?? []).length} active accounts</p>
                </div>
                <button onClick={() => setShowClientForm((v) => !v)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />
                  {showClientForm ? "Cancel" : "Add Client"}
                </button>
              </div>

              {showClientForm && (
                <form onSubmit={handleAddClient} className="bg-card border border-border/60 rounded-2xl p-6 mb-6">
                  <h3 className="font-semibold mb-4 text-sm">New Client Account</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input required value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Full name" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input required value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="Email address" type="email" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input required value={newClientBusiness} onChange={(e) => setNewClientBusiness(e.target.value)} placeholder="Business name" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input value={newClientIndustry} onChange={(e) => setNewClientIndustry(e.target.value)} placeholder="Industry" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="Phone number" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input value={newClientPassword} onChange={(e) => setNewClientPassword(e.target.value)} placeholder="Portal password (optional)" type="password" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <button type="submit" disabled={addingClient} className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {addingClient ? "Creating…" : "Create Client"}
                  </button>
                </form>
              )}

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(clients ?? []).map((c) => {
                  const is = industryStyle(c.industry);
                  const clientProject = projects?.find((p) => p.clientId === c.id);
                  const clientInv = invoices?.filter((i) => i.clientId === c.id) ?? [];
                  const outstanding = clientInv.reduce((sum, i) => sum + parseFloat(String(i.dueAmount)), 0);
                  return (
                    <div
                      key={c.id}
                      className="bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => setSelectedClientId(c.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl ${is.bg} flex items-center justify-center text-sm font-bold ${is.text} shrink-0`}>
                            {initials(c.userName ?? c.businessName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{c.userName}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.businessName}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${is.bg} ${is.text}`}>{c.industry}</span>
                        {clientProject && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PROJECT_STATUS_STYLES[clientProject.status]}`}>
                            {PROJECT_STATUS_LABELS[clientProject.status]}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{c.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      </div>

                      {outstanding > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Outstanding</span>
                          <span className="text-destructive font-semibold">${outstanding.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {(clients ?? []).length === 0 && <div className="bg-card border border-border rounded-2xl p-16 text-center text-muted-foreground">No clients yet. Add your first one above.</div>}
            </div>
          )}

          {/* ── PROJECTS ─────────────────────────────────────────────────── */}
          {tab === "projects" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Projects</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">{(projects ?? []).length} total projects</p>
                </div>
                <button onClick={() => setShowProjectForm((v) => !v)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />
                  {showProjectForm ? "Cancel" : "New Project"}
                </button>
              </div>

              {showProjectForm && (
                <form onSubmit={handleAddProject} className="bg-card border border-border/60 rounded-2xl p-6 mb-6">
                  <h3 className="font-semibold mb-4 text-sm">New Project</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <select required value={newProjClientId} onChange={(e) => setNewProjClientId(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="">Select client…</option>
                        {clients?.map((c) => <option key={c.id} value={c.id}>{c.businessName} ({c.userEmail})</option>)}
                      </select>
                    </div>
                    <input required value={newProjName} onChange={(e) => setNewProjName(e.target.value)} placeholder="Project name" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <select value={newProjStatus} onChange={(e) => setNewProjStatus(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                      {Object.entries(PROJECT_STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                    <div className="col-span-2">
                      <textarea required value={newProjDesc} onChange={(e) => setNewProjDesc(e.target.value)} placeholder="Project description" rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Start date</label>
                      <input type="date" value={newProjStart} onChange={(e) => setNewProjStart(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Expected completion</label>
                      <input type="date" value={newProjEnd} onChange={(e) => setNewProjEnd(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                  <button type="submit" disabled={addingProject || !newProjClientId} className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {addingProject ? "Creating…" : "Create Project"}
                  </button>
                </form>
              )}

              <div className="space-y-4">
                {(projects ?? []).map((p) => {
                  const statusStyle = PROJECT_STATUS_STYLES[p.status] ?? "bg-secondary text-muted-foreground";
                  const client = clients?.find((c) => c.id === p.clientId);
                  const is = client ? industryStyle(client.industry) : { bg: "bg-secondary", text: "text-muted-foreground", dot: "bg-muted" };
                  return (
                    <div key={p.id} className="bg-card border border-border/60 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate">{p.projectName}</p>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle}`}>{PROJECT_STATUS_LABELS[p.status]}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {p.clientBusinessName && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" /> {p.clientBusinessName}
                          </span>
                        )}
                        {p.startDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Started {new Date(p.startDate).toLocaleDateString()}
                          </span>
                        )}
                        {p.expectedCompletionDate && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Due {new Date(p.expectedCompletionDate).toLocaleDateString()}
                          </span>
                        )}
                        {p.employees && p.employees.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <div className="flex -space-x-1">
                              {p.employees.slice(0, 3).map((e) => (
                                <div key={e.id} className="w-5 h-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[9px] font-bold text-primary" title={e.name}>
                                  {initials(e.name)}
                                </div>
                              ))}
                            </div>
                            {p.employees.length} member{p.employees.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {p.latestUpdate && (
                        <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Update: </span>{p.latestUpdate}
                        </div>
                      )}
                    </div>
                  );
                })}
                {(projects ?? []).length === 0 && <div className="bg-card border border-border rounded-2xl p-16 text-center text-muted-foreground">No projects yet.</div>}
              </div>
            </div>
          )}

          {/* ── EMPLOYEES ────────────────────────────────────────────────── */}
          {tab === "employees" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Team</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">{(employees ?? []).length} team members</p>
                </div>
                <button onClick={() => setShowEmpForm((v) => !v)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />
                  {showEmpForm ? "Cancel" : "Add Member"}
                </button>
              </div>

              {showEmpForm && (
                <form onSubmit={handleAddEmployee} className="bg-card border border-border/60 rounded-2xl p-6 mb-6 grid grid-cols-3 gap-3 items-end">
                  <input required value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} placeholder="Full name" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input required value={newEmpRole} onChange={(e) => setNewEmpRole(e.target.value)} placeholder="Role title" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input required value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} placeholder="Email" type="email" className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <button type="submit" disabled={addingEmp} className="col-span-3 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {addingEmp ? "Adding…" : "Add Team Member"}
                  </button>
                </form>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(employees ?? []).map((emp) => {
                  const projectCount = (projects ?? []).filter((p) => p.employees?.some((e) => e.id === emp.id)).length;
                  return (
                    <div key={emp.id} className="bg-card border border-border/60 rounded-2xl p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {initials(emp.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{emp.name}</p>
                        <p className="text-xs text-primary/80 font-medium">{emp.role}</p>
                        <p className="text-xs text-muted-foreground mt-1">{emp.email}</p>
                        {projectCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">{projectCount} active project{projectCount !== 1 ? "s" : ""}</p>
                        )}
                      </div>
                      <button onClick={() => handleDeleteEmployee(emp.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
              {(employees ?? []).length === 0 && <div className="bg-card border border-border rounded-2xl p-16 text-center text-muted-foreground">No team members yet.</div>}
            </div>
          )}

          {/* ── INVOICES ─────────────────────────────────────────────────── */}
          {tab === "invoices" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Invoices</h1>
                <p className="text-sm text-muted-foreground mt-0.5">All billing records across clients</p>
              </div>

              {/* Summary bar */}
              {(invoices ?? []).length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Total Billed", value: (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.totalAmount)), 0), color: "text-foreground" },
                    { label: "Collected", value: (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.paidAmount)), 0), color: "text-emerald-400" },
                    { label: "Outstanding", value: (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.dueAmount)), 0), color: "text-destructive" },
                  ].map((s) => (
                    <div key={s.label} className="bg-card border border-border/60 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>${s.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/20">
                      <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Invoice</th>
                      <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Client</th>
                      <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Total</th>
                      <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Collected</th>
                      <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Balance</th>
                      <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {(invoices ?? []).map((inv) => (
                      <tr key={inv.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-xs text-muted-foreground">{inv.id}</td>
                        <td className="px-5 py-3.5 font-medium">{inv.clientBusinessName ?? inv.clientId}</td>
                        <td className="px-5 py-3.5 font-semibold">${parseFloat(String(inv.totalAmount)).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-emerald-400 font-medium">${parseFloat(String(inv.paidAmount)).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-destructive font-medium">${parseFloat(String(inv.dueAmount)).toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${INVOICE_STATUS_STYLES[inv.status] ?? "bg-secondary text-muted-foreground"}`}>{inv.status}</span>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(invoices ?? []).length === 0 && <p className="py-16 text-center text-muted-foreground">No invoices yet.</p>}
              </div>
            </div>
          )}

          {/* ── FEATURE REQUESTS ─────────────────────────────────────────── */}
          {tab === "feature-requests" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Feature Requests</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Review and action client change requests</p>
              </div>
              <div className="space-y-3">
                {(featureRequests ?? []).map((req) => (
                  <div key={req.id} className="bg-card border border-border/60 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-sm">{req.title}</p>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${req.priority === "high" ? "bg-red-500/15 text-red-400" : req.priority === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-secondary text-muted-foreground"}`}>{req.priority}</span>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${FR_STATUS_STYLES[req.status]}`}>{frLabel(req.status)}</span>
                        </div>
                        {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
                        {req.clientBusinessName && <p className="text-xs text-muted-foreground/70 mt-1.5 flex items-center gap-1"><Building2 className="w-3 h-3" /> {req.clientBusinessName}</p>}
                      </div>
                      {(req.status === FeatureRequestStatus.new || req.status === FeatureRequestStatus.in_review) && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleUpdateRequest(req.id, FeatureRequestUpdateStatus.approved)} className="px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/25 transition-colors">Approve</button>
                          <button onClick={() => handleUpdateRequest(req.id, FeatureRequestUpdateStatus.rejected)} className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/25 transition-colors">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(featureRequests ?? []).length === 0 && <div className="bg-card border border-border rounded-2xl p-16 text-center text-muted-foreground">No feature requests yet.</div>}
              </div>
            </div>
          )}

          {/* ── DEMO LEADS ───────────────────────────────────────────────── */}
          {tab === "demo-leads" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Demo Leads</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{(demoRequests ?? []).length} businesses have requested a demo</p>
              </div>
              <div className="space-y-4">
                {(demoRequests ?? []).map((d) => {
                  const is = industryStyle(d.industry);
                  return (
                    <div key={d.id} className="bg-card border border-border/60 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl ${is.bg} flex items-center justify-center text-xs font-bold ${is.text} shrink-0`}>
                            {initials(d.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{d.name}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${is.bg} ${is.text}`}>{d.industry}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{d.businessName}</p>
                            {d.message && <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">"{d.message}"</p>}
                          </div>
                        </div>
                        <div className="shrink-0 text-right space-y-2">
                          <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</p>
                          <div className="flex gap-2 justify-end">
                            <a href={`mailto:${d.email}`} className="flex items-center gap-1 px-2.5 py-1 bg-secondary rounded-md text-xs hover:bg-secondary/80 transition-colors">
                              <Mail className="w-3 h-3" /> Email
                            </a>
                            <a href={`tel:${d.phone}`} className="flex items-center gap-1 px-2.5 py-1 bg-primary/15 text-primary rounded-md text-xs hover:bg-primary/25 transition-colors">
                              <Phone className="w-3 h-3" /> Call
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(demoRequests ?? []).length === 0 && <div className="bg-card border border-border rounded-2xl p-16 text-center text-muted-foreground">No demo requests yet.</div>}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Client Detail Panel ──────────────────────────────────────────── */}
      {selectedClientId && selectedClient && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedClientId(null)} />
          <aside className="fixed inset-y-0 right-0 w-[480px] bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${industryStyle(selectedClient.industry).bg} ${industryStyle(selectedClient.industry).text}`}>
                  {initials(selectedClient.userName ?? selectedClient.businessName)}
                </div>
                <div>
                  <p className="font-bold text-sm">{selectedClient.userName}</p>
                  <p className="text-xs text-muted-foreground">{selectedClient.businessName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClientId(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Contact info */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact Details</h3>
                <div className="bg-secondary/30 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${industryStyle(selectedClient.industry).bg} ${industryStyle(selectedClient.industry).text}`}>{selectedClient.industry}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${selectedClient.email}`} className="text-primary hover:underline">{selectedClient.email}</a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${selectedClient.phone}`} className="hover:text-primary">{selectedClient.phone}</a>
                  </div>
                  {selectedClient.notes && (
                    <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground/70 mb-1">Notes</p>
                      {selectedClient.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Portal login */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Portal Access</h3>
                <div className="bg-secondary/30 rounded-xl p-4 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Login email</span><span className="font-mono">{selectedClient.userEmail}</span></div>
                </div>
              </div>

              {/* Projects */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Projects ({clientProjects.length})</h3>
                {clientProjects.length > 0 ? (
                  <div className="space-y-3">
                    {clientProjects.map((p) => (
                      <div key={p.id} className="bg-secondary/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{p.projectName}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PROJECT_STATUS_STYLES[p.status]}`}>{PROJECT_STATUS_LABELS[p.status]}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{p.description}</p>
                        {p.latestUpdate && <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">"{p.latestUpdate}"</p>}
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          {p.startDate && <span>Start: {new Date(p.startDate).toLocaleDateString()}</span>}
                          {p.expectedCompletionDate && <span>Due: {new Date(p.expectedCompletionDate).toLocaleDateString()}</span>}
                        </div>
                        {p.employees && p.employees.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex -space-x-1">
                              {p.employees.map((e) => (
                                <div key={e.id} title={e.name} className="w-5 h-5 rounded-full bg-primary/20 border border-card flex items-center justify-center text-[9px] font-bold text-primary">
                                  {initials(e.name)}
                                </div>
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">{p.employees.length} assigned</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No projects yet.</p>}
              </div>

              {/* Invoices */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Invoices ({clientInvoices.length})</h3>
                {clientInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {clientInvoices.map((inv) => {
                      const total = parseFloat(String(inv.totalAmount));
                      const paid = parseFloat(String(inv.paidAmount));
                      const pct = total > 0 ? (paid / total) * 100 : 0;
                      return (
                        <div key={inv.id} className="bg-secondary/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-muted-foreground">#{inv.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${INVOICE_STATUS_STYLES[inv.status]}`}>{inv.status}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold mb-2">
                            <span>Total: ${total.toLocaleString()}</span>
                            <span className="text-emerald-400">Paid: ${paid.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          {inv.dueDate && <p className="text-xs text-muted-foreground mt-2">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No invoices yet.</p>}
              </div>

              {/* Feature Requests */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Feature Requests ({clientRequests.length})</h3>
                {clientRequests.length > 0 ? (
                  <div className="space-y-2">
                    {clientRequests.map((req) => (
                      <div key={req.id} className="bg-secondary/30 rounded-xl p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{req.title}</p>
                          {req.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{req.description}</p>}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${req.priority === "high" ? "bg-red-500/15 text-red-400" : req.priority === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-secondary text-muted-foreground"}`}>{req.priority}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${FR_STATUS_STYLES[req.status]}`}>{frLabel(req.status)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No requests yet.</p>}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/50 shrink-0">
              <a href={`mailto:${selectedClient.email}`} className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                <Mail className="w-4 h-4" /> Email {selectedClient.userName?.split(" ")[0]}
              </a>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
