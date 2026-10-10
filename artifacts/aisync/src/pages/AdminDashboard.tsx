import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUrlTab } from "@/hooks/use-url-tab";
import AmbientBackground from "@/components/AmbientBackground";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { MilestoneChecklist, ProjectTimeline, QuestionsPanel } from "@/components/ProjectTracking";
import { AdminLoginControl, EditMemberControl, ProjectTeamPicker } from "@/components/AdminTeamTools";

import {
  useGetAdminSummary, useListClients, useListProjects, useListEmployees,
  useListInvoices, useListFeatureRequests, useListDemoRequests,
  useCreateClient, useCreateProject, useCreateEmployee,
  useUpdateFeatureRequest, useDeleteEmployee, useUpdateProject,
  ProjectInputStatus, ProjectUpdateStatus,
  getGetAdminSummaryQueryKey, getListClientsQueryKey, getListProjectsQueryKey,
  getListEmployeesQueryKey, getListInvoicesQueryKey, getListFeatureRequestsQueryKey,
  getListDemoRequestsQueryKey, FeatureRequestUpdateStatus, FeatureRequestStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, FolderKanban, UserCog, Receipt,
  Lightbulb, BookOpen, LogOut, X, Phone, Mail, Building2,
  TrendingUp, CheckCircle2, Clock, AlertCircle, ChevronRight,
  Plus, Calendar, Menu, RefreshCw,
} from "lucide-react";

const TABS = ["overview", "clients", "projects", "employees", "invoices", "feature-requests", "demo-leads"] as const;
type Tab = (typeof TABS)[number];

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

const PROJECT_STAGE_COLORS: Record<string, string> = {
  onboarding: "bg-slate-400",
  build_phase: "bg-blue-500",
  demo_phase: "bg-purple-500",
  testing: "bg-orange-500",
  completed: "bg-emerald-500",
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

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-500/15 text-red-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-secondary text-muted-foreground",
};

const NEUTRAL_PILL = "bg-secondary text-muted-foreground";
const PILL = "inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap";
const INPUT = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50";
const PRIMARY_BTN = "inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const SECONDARY_BTN = "inline-flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors";
const SECTION_LABEL = "text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3";

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function titleCase(s: string) {
  return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function frLabel(s: string) {
  return titleCase(s);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function money(value: number | string) {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  const v = Number.isFinite(n) ? n : 0;
  // Whole dollars stay short ($1,500); anything with cents shows both digits ($2,800.50)
  const cents = Number.isInteger(v) ? 0 : 2;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: cents, maximumFractionDigits: cents })}`;
}

function shortDate(value: string) {
  // Plain "YYYY-MM-DD" dates are calendar days; parsing them as UTC shows the previous day in US time zones
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = ymd ? new Date(+ymd[1], +ymd[2] - 1, +ymd[3]) : new Date(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Prefer the API's own message ("Email already in use") over the HTTP status prefix
function errorText(err: unknown) {
  const data = (err as { data?: unknown } | null)?.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const msg = d.error ?? d.message ?? d.detail;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";
}

function notifyError(title: string, err: unknown) {
  toast({ variant: "destructive", title, description: errorText(err) });
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/70 block mt-1">{hint}</span>}
    </label>
  );
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ListState({ loading, error, onRetry, empty, icon: Icon, emptyTitle, emptyHint, compact }: {
  loading: boolean; error: boolean; onRetry: () => void; empty: boolean;
  icon: React.ElementType; emptyTitle: string; emptyHint?: string; compact?: boolean;
}) {
  const pad = compact ? "px-5 py-8" : "p-12 sm:p-16";
  const wrap = compact ? `${pad} text-center` : `glass rounded-2xl ${pad} text-center`;
  if (loading) {
    return (
      <div className={wrap}>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className={wrap}>
        <AlertCircle className="w-8 h-8 text-red-400/80 mx-auto mb-3" />
        <p className="text-sm font-medium text-red-400">Couldn't load this data.</p>
        <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    );
  }
  if (!empty) return null;
  return (
    <div className={wrap}>
      <Icon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{emptyTitle}</p>
      {emptyHint && <p className="text-xs text-muted-foreground/70 mt-1">{emptyHint}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useUrlTab<Tab>("/admin", TABS, "overview");
  const [navOpen, setNavOpen] = useState(false);
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
  const [newEmpPhone, setNewEmpPhone] = useState("");
  const [addingEmp, setAddingEmp] = useState(false);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [removingEmpId, setRemovingEmpId] = useState<number | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<number | null>(null);

  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useGetAdminSummary({ query: { queryKey: getGetAdminSummaryQueryKey() } });
  const clientsQ = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const projectsQ = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const employeesQ = useListEmployees({ query: { queryKey: getListEmployeesQueryKey() } });
  const invoicesQ = useListInvoices({ query: { queryKey: getListInvoicesQueryKey() } });
  const featureRequestsQ = useListFeatureRequests({ query: { queryKey: getListFeatureRequestsQueryKey() } });
  const demoRequestsQ = useListDemoRequests({ query: { queryKey: getListDemoRequestsQueryKey() } });
  const clients = clientsQ.data;
  const projects = projectsQ.data;
  const employees = employeesQ.data;
  const invoices = invoicesQ.data;
  const featureRequests = featureRequestsQ.data;
  const demoRequests = demoRequestsQ.data;

  const createClient = useCreateClient();
  const createProject = useCreateProject();
  const createEmployee = useCreateEmployee();
  const updateFeatureRequest = useUpdateFeatureRequest();
  const deleteEmployee = useDeleteEmployee();
  const updateProject = useUpdateProject();

  // Inline "post an update to the client" editor on the Projects tab
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [trackingProjectId, setTrackingProjectId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>("onboarding");
  const [editUpdate, setEditUpdate] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  // Selected client panel data
  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const clientProjects = projects?.filter((p) => p.clientId === selectedClientId) ?? [];
  const clientInvoices = invoices?.filter((i) => i.clientId === selectedClientId) ?? [];
  const clientRequests = featureRequests?.filter((fr) => fr.clientId === selectedClientId) ?? [];

  // Close the client panel with Escape
  useEffect(() => {
    if (selectedClientId === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedClientId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClientId]);

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setAddingClient(true);
    try {
      await createClient.mutateAsync({ data: { name: newClientName, email: newClientEmail, businessName: newClientBusiness, industry: newClientIndustry, phone: newClientPhone, password: newClientPassword || undefined } });
      setNewClientName(""); setNewClientEmail(""); setNewClientBusiness(""); setNewClientIndustry(""); setNewClientPhone(""); setNewClientPassword("");
      setShowClientForm(false);
      qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
      toast({ title: "Client created", description: `${newClientBusiness} can now sign in to the client portal.` });
    } catch (err) {
      notifyError("Couldn't create client", err);
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
      toast({ title: "Project created", description: newProjName });
    } catch (err) {
      notifyError("Couldn't create project", err);
    } finally { setAddingProject(false); }
  }

  function startEditProject(p: { id: number; status: string; latestUpdate?: string | null; expectedCompletionDate?: string | null }) {
    setEditingProjectId(p.id);
    setEditStatus(p.status);
    setEditUpdate("");
    setEditEnd(p.expectedCompletionDate ?? "");
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    if (editingProjectId === null) return;
    setSavingProject(true);
    try {
      await updateProject.mutateAsync({
        id: editingProjectId,
        data: {
          status: editStatus as ProjectUpdateStatus,
          // Leaving the box empty keeps the current message
          ...(editUpdate.trim() ? { latestUpdate: editUpdate.trim() } : {}),
          expectedCompletionDate: editEnd || null,
        },
      });
      setEditingProjectId(null);
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
      toast({ title: "Update posted", description: "The client will see it on their dashboard." });
    } catch (err) {
      notifyError("Couldn't save the update", err);
    } finally { setSavingProject(false); }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setAddingEmp(true);
    try {
      await createEmployee.mutateAsync({ data: { name: newEmpName, role: newEmpRole, email: newEmpEmail, phone: newEmpPhone.trim() || null } });
      setNewEmpName(""); setNewEmpRole(""); setNewEmpEmail(""); setNewEmpPhone(""); setShowEmpForm(false);
      qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
      toast({ title: "Team member added", description: newEmpName });
    } catch (err) {
      notifyError("Couldn't add team member", err);
    } finally { setAddingEmp(false); }
  }

  async function handleUpdateRequest(id: number, status: FeatureRequestUpdateStatus) {
    setUpdatingRequestId(id);
    try {
      await updateFeatureRequest.mutateAsync({ id, data: { status } });
      qc.invalidateQueries({ queryKey: getListFeatureRequestsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
    } catch (err) {
      notifyError("Couldn't update the request", err);
    } finally { setUpdatingRequestId(null); }
  }

  async function handleDeleteEmployee(id: number, name: string) {
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    setRemovingEmpId(id);
    try {
      await deleteEmployee.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
    } catch (err) {
      notifyError("Couldn't remove team member", err);
    } finally { setRemovingEmpId(null); }
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
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-destructive/80 mx-auto mb-3" />
          <p className="text-destructive font-semibold mb-1">Couldn't load the admin panel</p>
          <p className="text-sm text-muted-foreground">Check your connection and try again. If it keeps happening, sign out and back in.</p>
          <div className="flex justify-center gap-2 mt-5">
            <button onClick={() => refetchSummary()} className={PRIMARY_BTN}>
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
            <button onClick={() => logout()} className={SECONDARY_BTN}>Sign out</button>
          </div>
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
  const pendingRequests = (featureRequests ?? []).filter((r) => r.status === "new" || r.status === "in_review");

  return (
    <div className="min-h-screen md:flex bg-background text-foreground relative">
      <AmbientBackground />

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 glass-sidebar border-b border-white/[0.06]">
        <button onClick={() => setNavOpen(true)} aria-label="Open menu" className="p-2 -ml-2 rounded-lg text-foreground/90 active:bg-secondary/60">
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0">
          <TrendingUp className="w-3 h-3 text-white" />
        </div>
        <p className="font-bold text-sm tracking-tight">aicronics</p>
        <span className="ml-auto text-xs text-muted-foreground truncate">{navItems.find((n) => n.id === tab)?.label}</span>
      </header>
      {navOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" onClick={() => setNavOpen(false)} />}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] md:sticky md:top-0 md:h-screen md:z-10 md:w-60 md:max-w-none md:translate-x-0 shrink-0 border-r border-white/[0.06] glass-sidebar flex flex-col overflow-y-auto transition-transform duration-300 ease-out ${navOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-border/50 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm tracking-tight leading-none">aicronics</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Admin Portal</p>
          </div>
          <button onClick={() => setNavOpen(false)} aria-label="Close menu" className="md:hidden p-1.5 -mr-1.5 rounded-lg text-muted-foreground hover:bg-secondary/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto" aria-label="Admin sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badge =
              item.id === "demo-leads" ? { count: demoRequests?.length ?? 0, cls: "bg-primary text-primary-foreground", label: "demo leads" } :
              item.id === "feature-requests" ? { count: summary?.pendingFeatureRequests ?? 0, cls: "bg-amber-500 text-white", label: "pending requests" } :
              null;
            return (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); setNavOpen(false); }}
                aria-current={tab === item.id ? "page" : undefined}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 ${
                  tab === item.id
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
                {badge && badge.count > 0 && (
                  <span className={`ml-auto min-w-[20px] text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`} aria-label={`${badge.count} ${badge.label}`}>
                    {badge.count}
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
          <button onClick={() => logout()} className="w-full flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-x-hidden relative z-10">
        <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="mb-2">
                <h1 className="text-2xl font-bold">Good day, {user?.name?.split(" ")[0]} 👋</h1>
                <p className="text-muted-foreground text-sm mt-1">Here's what's happening across your client base today.</p>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { label: "Total Clients",       value: summary?.totalClients ?? 0,           icon: Users,         color: "text-foreground",   accent: "bg-blue-500/10",       go: "clients" as Tab },
                  { label: "Active Projects",     value: summary?.activeProjects ?? 0,         icon: FolderKanban,  color: "text-primary",      accent: "bg-primary/10",        go: "projects" as Tab },
                  { label: "Completed Projects",  value: summary?.completedProjects ?? 0,      icon: CheckCircle2,  color: "text-emerald-400",  accent: "bg-emerald-500/10",    go: "projects" as Tab },
                  { label: "Revenue Collected",   value: money(summary?.totalPaid ?? 0),       icon: TrendingUp,    color: "text-emerald-400",  accent: "bg-emerald-500/10",    go: "invoices" as Tab },
                  { label: "Outstanding Balance", value: money(summary?.totalDue ?? 0),        icon: AlertCircle,   color: "text-red-400",      accent: "bg-destructive/10",    go: "invoices" as Tab },
                  { label: "Pending Requests",    value: summary?.pendingFeatureRequests ?? 0, icon: Lightbulb,     color: "text-amber-400",    accent: "bg-amber-500/10",      go: "feature-requests" as Tab },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.label} onClick={() => setTab(m.go)} className="text-left glass glass-hover rounded-2xl p-4 sm:p-5 hover:border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                      <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                        <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium leading-snug">{m.label}</p>
                        <div className={`w-8 h-8 rounded-lg ${m.accent} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${m.color}`} />
                        </div>
                      </div>
                      <p className={`text-2xl sm:text-3xl font-bold tabular-nums truncate ${m.color}`}>{m.value}</p>
                    </button>
                  );
                })}
              </div>

              {/* Project pipeline */}
              {totalProjects > 0 && (
                <div className="glass glass-hover rounded-2xl p-5 sm:p-6">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-muted-foreground" />
                    Project Pipeline
                    <span className="ml-auto text-xs font-normal text-muted-foreground">{plural(totalProjects, "project")}</span>
                  </h3>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4 bg-secondary/40">
                    {Object.entries(PROJECT_STATUS_LABELS).map(([status, label]) => {
                      const count = stageCount[status] ?? 0;
                      const pct = (count / totalProjects) * 100;
                      if (!pct) return null;
                      return <div key={status} className={`${PROJECT_STAGE_COLORS[status]} rounded-full transition-all`} style={{ width: `${pct}%` }} title={`${label}: ${count}`} />;
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {Object.entries(PROJECT_STATUS_LABELS).map(([status, label]) => (
                      <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`w-2 h-2 rounded-full ${PROJECT_STAGE_COLORS[status]}`} />
                        {label} <span className="font-semibold text-foreground tabular-nums">{stageCount[status] ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent demo leads */}
                <div className="glass glass-hover rounded-2xl overflow-hidden">
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
                            {d.industry && <span className={`${PILL} ${is.bg} ${is.text} hidden sm:inline-flex`}>{d.industry}</span>}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{shortDate(d.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <ListState compact loading={demoRequestsQ.isLoading} error={demoRequestsQ.isError} onRetry={() => demoRequestsQ.refetch()}
                    empty={(demoRequests ?? []).length === 0} icon={BookOpen} emptyTitle="No demo leads yet." />
                </div>

                {/* Pending feature requests */}
                <div className="glass glass-hover rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-muted-foreground" />
                      Pending Requests
                    </h3>
                    <button onClick={() => setTab("feature-requests")} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-border/30">
                    {pendingRequests.slice(0, 4).map((r) => (
                      <div key={r.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.clientBusinessName}</p>
                        </div>
                        <span className={`${PILL} ${FR_STATUS_STYLES[r.status] ?? NEUTRAL_PILL}`}>{frLabel(r.status)}</span>
                      </div>
                    ))}
                  </div>
                  <ListState compact loading={featureRequestsQ.isLoading} error={featureRequestsQ.isError} onRetry={() => featureRequestsQ.refetch()}
                    empty={pendingRequests.length === 0} icon={CheckCircle2} emptyTitle="All caught up — nothing waiting for review." />
                </div>
              </div>
            </div>
          )}

          {/* ── CLIENTS ──────────────────────────────────────────────────── */}
          {tab === "clients" && (
            <div>
              <PageHeader
                title="Clients"
                subtitle={clientsQ.isLoading ? "Loading…" : clientsQ.isError ? undefined : plural((clients ?? []).length, "client account")}
                action={
                  <button onClick={() => setShowClientForm((v) => !v)} className={showClientForm ? SECONDARY_BTN : PRIMARY_BTN}>
                    {showClientForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Client</>}
                  </button>
                }
              />

              {showClientForm && (
                <form onSubmit={handleAddClient} className="glass rounded-2xl p-5 sm:p-6 mb-6">
                  <h3 className="font-semibold text-sm">New client account</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-5">Creates a client portal login for this business.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Contact name *">
                      <input required value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Jane Smith" autoComplete="off" className={INPUT} />
                    </Field>
                    <Field label="Email (used to sign in) *">
                      <input required value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="jane@business.com" type="email" autoComplete="off" className={INPUT} />
                    </Field>
                    <Field label="Business name *">
                      <input required value={newClientBusiness} onChange={(e) => setNewClientBusiness(e.target.value)} placeholder="Smith Dental" className={INPUT} />
                    </Field>
                    <Field label="Industry">
                      <input value={newClientIndustry} onChange={(e) => setNewClientIndustry(e.target.value)} placeholder="Healthcare" list="admin-industries" className={INPUT} />
                      <datalist id="admin-industries">
                        {Object.keys(INDUSTRY_STYLES).map((ind) => <option key={ind} value={ind} />)}
                      </datalist>
                    </Field>
                    <Field label="Phone">
                      <input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="+1 555 123 4567" type="tel" className={INPUT} />
                    </Field>
                    <Field label="Portal password" hint="Optional. Leave empty if the client will set their own.">
                      <input value={newClientPassword} onChange={(e) => setNewClientPassword(e.target.value)} type="password" autoComplete="new-password" className={INPUT} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-5">
                    <button type="submit" disabled={addingClient} className={PRIMARY_BTN}>
                      {addingClient ? "Creating…" : "Create client"}
                    </button>
                    <button type="button" onClick={() => setShowClientForm(false)} className={SECONDARY_BTN}>Cancel</button>
                  </div>
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
                      role="button"
                      tabIndex={0}
                      aria-label={`Open details for ${c.businessName}`}
                      className="glass glass-hover rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      onClick={() => setSelectedClientId(c.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedClientId(c.id); } }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-xl ${is.bg} flex items-center justify-center text-sm font-bold ${is.text} shrink-0`}>
                            {initials(c.userName ?? c.businessName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{c.userName ?? c.businessName}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.businessName}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                      </div>

                      {(c.industry || clientProject) && (
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {c.industry && <span className={`${PILL} ${is.bg} ${is.text}`}>{c.industry}</span>}
                          {clientProject && (
                            <span className={`${PILL} ${PROJECT_STATUS_STYLES[clientProject.status] ?? NEUTRAL_PILL}`}>
                              {PROJECT_STATUS_LABELS[clientProject.status] ?? titleCase(clientProject.status)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs text-muted-foreground mt-auto">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{c.phone || "No phone on file"}</span>
                        </div>
                      </div>

                      {outstanding > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Outstanding</span>
                          <span className="text-red-400 font-semibold tabular-nums">{money(outstanding)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <ListState loading={clientsQ.isLoading} error={clientsQ.isError} onRetry={() => clientsQ.refetch()}
                empty={(clients ?? []).length === 0} icon={Users} emptyTitle="No clients yet." emptyHint="Use “Add Client” to create the first account." />
            </div>
          )}

          {/* ── PROJECTS ─────────────────────────────────────────────────── */}
          {tab === "projects" && (
            <div>
              <PageHeader
                title="Projects"
                subtitle={projectsQ.isLoading ? "Loading…" : projectsQ.isError ? undefined : plural(totalProjects, "project")}
                action={
                  <button onClick={() => setShowProjectForm((v) => !v)} className={showProjectForm ? SECONDARY_BTN : PRIMARY_BTN}>
                    {showProjectForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New Project</>}
                  </button>
                }
              />

              {showProjectForm && (
                <form onSubmit={handleAddProject} className="glass rounded-2xl p-5 sm:p-6 mb-6">
                  <h3 className="font-semibold text-sm">New project</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-5">The client will see this project and its stage on their dashboard.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Client *" className="sm:col-span-2">
                      <select required value={newProjClientId} onChange={(e) => setNewProjClientId(e.target.value)} className={INPUT}>
                        <option value="">{(clients ?? []).length ? "Select a client…" : "No clients yet — add one first"}</option>
                        {clients?.map((c) => <option key={c.id} value={c.id}>{c.businessName} ({c.userEmail})</option>)}
                      </select>
                    </Field>
                    <Field label="Project name *">
                      <input required value={newProjName} onChange={(e) => setNewProjName(e.target.value)} placeholder="Front-desk call agent" className={INPUT} />
                    </Field>
                    <Field label="Stage">
                      <select value={newProjStatus} onChange={(e) => setNewProjStatus(e.target.value)} className={INPUT}>
                        {Object.entries(PROJECT_STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                      </select>
                    </Field>
                    <Field label="Description *" className="sm:col-span-2">
                      <textarea required value={newProjDesc} onChange={(e) => setNewProjDesc(e.target.value)} placeholder="What we're building for this client" rows={3} className={`${INPUT} resize-none`} />
                    </Field>
                    <Field label="Start date">
                      <input type="date" value={newProjStart} onChange={(e) => setNewProjStart(e.target.value)} className={INPUT} />
                    </Field>
                    <Field label="Expected completion">
                      <input type="date" value={newProjEnd} min={newProjStart || undefined} onChange={(e) => setNewProjEnd(e.target.value)} className={INPUT} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-5">
                    <button type="submit" disabled={addingProject || !newProjClientId} className={PRIMARY_BTN}>
                      {addingProject ? "Creating…" : "Create project"}
                    </button>
                    <button type="button" onClick={() => setShowProjectForm(false)} className={SECONDARY_BTN}>Cancel</button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {(projects ?? []).map((p) => {
                  const statusStyle = PROJECT_STATUS_STYLES[p.status] ?? NEUTRAL_PILL;
                  const isEditing = editingProjectId === p.id;
                  return (
                    <div key={p.id} className={`glass glass-hover rounded-2xl p-5 ${isEditing ? "ring-1 ring-primary/40" : ""}`}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-semibold break-words">{p.projectName}</p>
                            <span className={`${PILL} ${statusStyle}`}>{PROJECT_STATUS_LABELS[p.status] ?? titleCase(p.status)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                        </div>
                        <div className="shrink-0 flex flex-wrap justify-end gap-2">
                          <button onClick={() => setTrackingProjectId(trackingProjectId === p.id ? null : p.id)} className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-secondary transition-colors">
                            {trackingProjectId === p.id ? "Hide team, checklist & questions" : "Team, checklist & questions"}
                          </button>
                          {!isEditing && (
                            <button onClick={() => startEditProject(p)} className="px-3 py-1.5 bg-primary/15 text-primary rounded-lg text-xs font-semibold hover:bg-primary/25 transition-colors">
                              Post update
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditing && (
                        <form onSubmit={handleSaveProject} className="mb-4 p-4 bg-background/60 border border-border rounded-xl">
                          <p className="text-xs text-muted-foreground mb-3">The client sees the stage and this message on their dashboard as “Latest update from your team”.</p>
                          {p.latestUpdate && (
                            <p className="text-xs mb-4 p-2.5 rounded-lg bg-secondary/60"><span className="font-semibold text-foreground">Current message: </span>{p.latestUpdate}</p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Stage">
                              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={INPUT}>
                                {Object.entries(PROJECT_STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                              </select>
                            </Field>
                            <Field label="Expected completion">
                              <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className={INPUT} />
                            </Field>
                            <Field label="New message for the client" hint="Leave empty to keep the current message." className="sm:col-span-2">
                              <textarea value={editUpdate} onChange={(e) => setEditUpdate(e.target.value)} rows={3} placeholder="e.g. Consultation done — we're now building your agent's script and booking rules." className={`${INPUT} resize-none`} />
                            </Field>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-4">
                            <button type="submit" disabled={savingProject} className={PRIMARY_BTN}>
                              {savingProject ? "Saving…" : "Save update"}
                            </button>
                            <button type="button" onClick={() => setEditingProjectId(null)} className={SECONDARY_BTN}>Cancel</button>
                          </div>
                        </form>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        {p.clientBusinessName && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" /> {p.clientBusinessName}
                          </span>
                        )}
                        {p.startDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Started {shortDate(p.startDate)}
                          </span>
                        )}
                        {p.expectedCompletionDate && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Due {shortDate(p.expectedCompletionDate)}
                          </span>
                        )}
                        {p.employees && p.employees.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="flex -space-x-1">
                              {p.employees.slice(0, 3).map((e) => (
                                <span key={e.id} className="w-5 h-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[9px] font-bold text-primary" title={e.name}>
                                  {initials(e.name)}
                                </span>
                              ))}
                            </span>
                            {plural(p.employees.length, "member")}
                          </span>
                        )}
                      </div>
                      {p.latestUpdate && !isEditing && (
                        <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Latest update: </span>{p.latestUpdate}
                        </div>
                      )}
                      {trackingProjectId === p.id && (
                        <div className="mt-4 pt-4 border-t border-border/30 space-y-4">
                          <div className="grid lg:grid-cols-2 gap-4 items-start">
                            <MilestoneChecklist projectId={p.id} isAdmin />
                            <ProjectTimeline projectId={p.id} />
                          </div>
                          <ProjectTeamPicker projectId={p.id} assigned={(p.employees ?? []).map((e) => e.id)} members={employees ?? []} />
                          <QuestionsPanel projectId={p.id} isAdmin />
                        </div>
                      )}
                    </div>
                  );
                })}
                <ListState loading={projectsQ.isLoading} error={projectsQ.isError} onRetry={() => projectsQ.refetch()}
                  empty={totalProjects === 0} icon={FolderKanban} emptyTitle="No projects yet." emptyHint="Use “New Project” to start one for a client." />
              </div>
            </div>
          )}

          {/* ── EMPLOYEES ────────────────────────────────────────────────── */}
          {tab === "employees" && (
            <div>
              <PageHeader
                title="Team"
                subtitle={employeesQ.isLoading ? "Loading…" : employeesQ.isError ? undefined : plural((employees ?? []).length, "team member")}
                action={
                  <button onClick={() => setShowEmpForm((v) => !v)} className={showEmpForm ? SECONDARY_BTN : PRIMARY_BTN}>
                    {showEmpForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Member</>}
                  </button>
                }
              />

              {showEmpForm && (
                <form onSubmit={handleAddEmployee} className="glass rounded-2xl p-5 sm:p-6 mb-6">
                  <h3 className="font-semibold text-sm mb-5">New team member</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full name *">
                      <input required value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} placeholder="Alex Johnson" className={INPUT} />
                    </Field>
                    <Field label="Role *">
                      <input required value={newEmpRole} onChange={(e) => setNewEmpRole(e.target.value)} placeholder="Voice Agent Engineer" className={INPUT} />
                    </Field>
                    <Field label="Email *">
                      <input required value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} placeholder="alex@aicronics.com" type="email" className={INPUT} />
                    </Field>
                    <Field label="Phone" hint="Clients see this on projects this person is assigned to.">
                      <input value={newEmpPhone} onChange={(e) => setNewEmpPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" inputMode="tel" className={INPUT} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-5">
                    <button type="submit" disabled={addingEmp} className={PRIMARY_BTN}>
                      {addingEmp ? "Adding…" : "Add team member"}
                    </button>
                    <button type="button" onClick={() => setShowEmpForm(false)} className={SECONDARY_BTN}>Cancel</button>
                  </div>
                </form>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(employees ?? []).map((emp) => {
                  const projectCount = (projects ?? []).filter((p) => p.employees?.some((e) => e.id === emp.id)).length;
                  const removing = removingEmpId === emp.id;
                  return (
                    <div key={emp.id} className={`glass glass-hover rounded-2xl p-5 flex items-start gap-4 transition-opacity ${removing ? "opacity-50" : ""}`}>
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {initials(emp.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{emp.name}</p>
                        <p className="text-xs text-primary/80 font-medium truncate">{emp.role}</p>
                        <a href={`mailto:${emp.email}`} className="block text-xs text-muted-foreground hover:text-primary mt-1 truncate">{emp.email}</a>
                        {emp.phone ? (
                          <a href={`tel:${emp.phone.replace(/[^\d+]/g, "")}`} className="block text-xs text-muted-foreground hover:text-primary truncate">{emp.phone}</a>
                        ) : (
                          <p className="text-xs text-amber-400/80">No phone yet. Use Edit to add one.</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {projectCount > 0 ? `Assigned to ${plural(projectCount, "project")}` : "Not assigned to a project"}
                        </p>
                        <EditMemberControl member={emp} />
                        <AdminLoginControl member={emp} />
                      </div>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                        disabled={removing}
                        className="text-xs text-muted-foreground hover:text-destructive disabled:cursor-not-allowed transition-colors shrink-0"
                      >
                        {removing ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <ListState loading={employeesQ.isLoading} error={employeesQ.isError} onRetry={() => employeesQ.refetch()}
                empty={(employees ?? []).length === 0} icon={UserCog} emptyTitle="No team members yet." emptyHint="Use “Add Member” to add your first teammate." />
            </div>
          )}

          {/* ── INVOICES ─────────────────────────────────────────────────── */}
          {tab === "invoices" && (
            <div>
              <PageHeader title="Invoices" subtitle="All billing records across clients" />

              {/* Summary bar */}
              {(invoices ?? []).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Total Billed", value: (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.totalAmount)), 0), color: "text-foreground" },
                    { label: "Collected", value: (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.paidAmount)), 0), color: "text-emerald-400" },
                    { label: "Outstanding", value: (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.dueAmount)), 0), color: "text-red-400" },
                  ].map((s) => (
                    <div key={s.label} className="glass glass-hover rounded-2xl p-5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">{s.label}</p>
                      <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{money(s.value)}</p>
                    </div>
                  ))}
                </div>
              )}

              {(invoices ?? []).length > 0 ? (
                <div className="glass glass-hover rounded-2xl overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/20">
                        {["Invoice", "Client", "Total", "Collected", "Balance", "Status", "Due date"].map((h, i) => (
                          <th key={h} className={`px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider ${i >= 2 && i <= 4 ? "text-right" : "text-left"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {(invoices ?? []).map((inv) => {
                        const due = parseFloat(String(inv.dueAmount));
                        return (
                          <tr key={inv.id} className="hover:bg-secondary/10 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">#{inv.id}</td>
                            <td className="px-5 py-3.5 font-medium">{inv.clientBusinessName ?? `Client #${inv.clientId}`}</td>
                            <td className="px-5 py-3.5 font-semibold text-right tabular-nums">{money(inv.totalAmount)}</td>
                            <td className="px-5 py-3.5 text-emerald-400 font-medium text-right tabular-nums">{money(inv.paidAmount)}</td>
                            <td className={`px-5 py-3.5 font-medium text-right tabular-nums ${due > 0 ? "text-red-400" : "text-muted-foreground"}`}>{money(due)}</td>
                            <td className="px-5 py-3.5">
                              <span className={`${PILL} ${INVOICE_STATUS_STYLES[inv.status] ?? NEUTRAL_PILL}`}>{titleCase(inv.status)}</span>
                            </td>
                            <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">{inv.dueDate ? shortDate(inv.dueDate) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <ListState loading={invoicesQ.isLoading} error={invoicesQ.isError} onRetry={() => invoicesQ.refetch()}
                  empty icon={Receipt} emptyTitle="No invoices yet." />
              )}
            </div>
          )}

          {/* ── FEATURE REQUESTS ─────────────────────────────────────────── */}
          {tab === "feature-requests" && (
            <div>
              <PageHeader
                title="Feature Requests"
                subtitle={featureRequestsQ.isLoading ? "Loading…" : featureRequestsQ.isError ? undefined : `${pendingRequests.length} waiting for review · ${plural((featureRequests ?? []).length, "request")} total`}
              />
              <div className="space-y-3">
                {(featureRequests ?? []).map((req) => {
                  const actionable = req.status === FeatureRequestStatus.new || req.status === FeatureRequestStatus.in_review;
                  const busy = updatingRequestId === req.id;
                  return (
                    <div key={req.id} className="glass glass-hover rounded-2xl p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-sm">{req.title}</p>
                            <span className={`${PILL} ${PRIORITY_STYLES[req.priority] ?? NEUTRAL_PILL}`}>{titleCase(req.priority)} priority</span>
                            <span className={`${PILL} ${FR_STATUS_STYLES[req.status] ?? NEUTRAL_PILL}`}>{frLabel(req.status)}</span>
                          </div>
                          {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
                          {req.clientBusinessName && <p className="text-xs text-muted-foreground/70 mt-1.5 flex items-center gap-1"><Building2 className="w-3 h-3" /> {req.clientBusinessName}</p>}
                        </div>
                        {actionable && (
                          <div className="flex gap-2 shrink-0">
                            <button disabled={busy} onClick={() => handleUpdateRequest(req.id, FeatureRequestUpdateStatus.approved)} className="px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Approve</button>
                            <button disabled={busy} onClick={() => handleUpdateRequest(req.id, FeatureRequestUpdateStatus.rejected)} className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <ListState loading={featureRequestsQ.isLoading} error={featureRequestsQ.isError} onRetry={() => featureRequestsQ.refetch()}
                  empty={(featureRequests ?? []).length === 0} icon={Lightbulb} emptyTitle="No feature requests yet." emptyHint="Requests clients submit from their portal will appear here." />
              </div>
            </div>
          )}

          {/* ── DEMO LEADS ───────────────────────────────────────────────── */}
          {tab === "demo-leads" && (
            <div>
              <PageHeader
                title="Demo Leads"
                subtitle={demoRequestsQ.isLoading ? "Loading…" : demoRequestsQ.isError ? undefined : `${(demoRequests ?? []).length} ${(demoRequests ?? []).length === 1 ? "business has" : "businesses have"} requested a demo`}
              />
              <div className="space-y-4">
                {(demoRequests ?? []).map((d) => {
                  const is = industryStyle(d.industry);
                  return (
                    <div key={d.id} className="glass glass-hover rounded-2xl p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl ${is.bg} flex items-center justify-center text-xs font-bold ${is.text} shrink-0`}>
                            {initials(d.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{d.name}</p>
                              {d.industry && <span className={`${PILL} ${is.bg} ${is.text}`}>{d.industry}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{d.businessName}</p>
                            {d.message && <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">“{d.message}”</p>}
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pl-14 sm:pl-0">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">{shortDate(d.createdAt)}</p>
                          <div className="flex gap-2">
                            <a href={`mailto:${d.email}`} title={d.email} className="flex items-center gap-1 px-2.5 py-1 bg-secondary rounded-md text-xs hover:bg-secondary/80 transition-colors">
                              <Mail className="w-3 h-3" /> Email
                            </a>
                            {d.phone && (
                              <a href={`tel:${d.phone}`} title={d.phone} className="flex items-center gap-1 px-2.5 py-1 bg-primary/15 text-primary rounded-md text-xs hover:bg-primary/25 transition-colors">
                                <Phone className="w-3 h-3" /> Call
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <ListState loading={demoRequestsQ.isLoading} error={demoRequestsQ.isError} onRetry={() => demoRequestsQ.refetch()}
                  empty={(demoRequests ?? []).length === 0} icon={BookOpen} emptyTitle="No demo requests yet." emptyHint="Requests from the website's demo form will appear here." />
              </div>
            </div>
          )}

        </div>
      </motion.div>
      </main>

      {/* ── Client Detail Panel ──────────────────────────────────────────── */}
      {selectedClientId !== null && selectedClient && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={() => setSelectedClientId(null)} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedClient.businessName} details`}
            initial={{ x: 480, opacity: 0.6 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 w-full sm:w-[480px] glass-sidebar bg-[hsl(222_47%_6%/0.82)] border-l border-white/[0.08] shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${industryStyle(selectedClient.industry).bg} ${industryStyle(selectedClient.industry).text}`}>
                  {initials(selectedClient.userName ?? selectedClient.businessName)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{selectedClient.userName ?? selectedClient.businessName}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedClient.businessName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClientId(null)} aria-label="Close client details" className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Contact info */}
              <section>
                <h3 className={SECTION_LABEL}>Contact Details</h3>
                <div className="bg-secondary/30 rounded-xl p-4 space-y-2.5">
                  {selectedClient.industry && (
                    <span className={`${PILL} ${industryStyle(selectedClient.industry).bg} ${industryStyle(selectedClient.industry).text}`}>{selectedClient.industry}</span>
                  )}
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${selectedClient.email}`} className="text-primary hover:underline truncate">{selectedClient.email}</a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    {selectedClient.phone
                      ? <a href={`tel:${selectedClient.phone}`} className="hover:text-primary">{selectedClient.phone}</a>
                      : <span className="text-muted-foreground">No phone on file</span>}
                  </div>
                  {selectedClient.notes && (
                    <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground/70 mb-1">Notes</p>
                      {selectedClient.notes}
                    </div>
                  )}
                </div>
              </section>

              {/* Portal login */}
              <section>
                <h3 className={SECTION_LABEL}>Portal Access</h3>
                <div className="bg-secondary/30 rounded-xl p-4 text-xs">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground shrink-0">Login email</span><span className="font-mono truncate">{selectedClient.userEmail}</span></div>
                </div>
              </section>

              {/* Projects */}
              <section>
                <h3 className={SECTION_LABEL}>Projects ({clientProjects.length})</h3>
                {clientProjects.length > 0 ? (
                  <div className="space-y-3">
                    {clientProjects.map((p) => (
                      <div key={p.id} className="bg-secondary/30 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-semibold text-sm min-w-0 break-words">{p.projectName}</p>
                          <span className={`${PILL} ${PROJECT_STATUS_STYLES[p.status] ?? NEUTRAL_PILL}`}>{PROJECT_STATUS_LABELS[p.status] ?? titleCase(p.status)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{p.description}</p>
                        {p.latestUpdate && <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">“{p.latestUpdate}”</p>}
                        {(p.startDate || p.expectedCompletionDate) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                            {p.startDate && <span>Started {shortDate(p.startDate)}</span>}
                            {p.expectedCompletionDate && <span>Due {shortDate(p.expectedCompletionDate)}</span>}
                          </div>
                        )}
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
                ) : <p className="text-xs text-muted-foreground">No projects for this client yet.</p>}
              </section>

              {/* Invoices */}
              <section>
                <h3 className={SECTION_LABEL}>Invoices ({clientInvoices.length})</h3>
                {clientInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {clientInvoices.map((inv) => {
                      const total = parseFloat(String(inv.totalAmount));
                      const paid = parseFloat(String(inv.paidAmount));
                      const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                      return (
                        <div key={inv.id} className="bg-secondary/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-muted-foreground">#{inv.id}</span>
                            <span className={`${PILL} ${INVOICE_STATUS_STYLES[inv.status] ?? NEUTRAL_PILL}`}>{titleCase(inv.status)}</span>
                          </div>
                          <div className="flex flex-wrap justify-between gap-x-3 text-sm font-semibold mb-2 tabular-nums">
                            <span>Total {money(total)}</span>
                            <span className="text-emerald-400">Paid {money(paid)}</span>
                          </div>
                          <div className="h-1.5 bg-border rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          {inv.dueDate && <p className="text-xs text-muted-foreground mt-2">Due {shortDate(inv.dueDate)}</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No invoices for this client yet.</p>}
              </section>

              {/* Feature Requests */}
              <section>
                <h3 className={SECTION_LABEL}>Feature Requests ({clientRequests.length})</h3>
                {clientRequests.length > 0 ? (
                  <div className="space-y-2">
                    {clientRequests.map((req) => (
                      <div key={req.id} className="bg-secondary/30 rounded-xl p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{req.title}</p>
                          {req.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{req.description}</p>}
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
                          <span className={`${PILL} ${PRIORITY_STYLES[req.priority] ?? NEUTRAL_PILL}`}>{titleCase(req.priority)}</span>
                          <span className={`${PILL} ${FR_STATUS_STYLES[req.status] ?? NEUTRAL_PILL}`}>{frLabel(req.status)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No requests from this client yet.</p>}
              </section>
            </div>

            <div className="px-6 py-4 border-t border-border/50 shrink-0">
              <a href={`mailto:${selectedClient.email}`} className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                <Mail className="w-4 h-4" /> Email {selectedClient.userName?.split(" ")[0] ?? selectedClient.businessName}
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </div>
  );
}
