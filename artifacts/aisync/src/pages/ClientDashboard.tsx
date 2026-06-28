import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useGetMyClient,
  useListProjects,
  useListInvoices,
  useListFiles,
  useListFeatureRequests,
  useCreateFeatureRequest,
  useDeleteFile,
  getGetMyClientQueryKey,
  getListProjectsQueryKey,
  getListInvoicesQueryKey,
  getListFilesQueryKey,
  getListFeatureRequestsQueryKey,
  FeatureRequestInputPriority,
  FeatureRequestStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, FolderKanban, Receipt, FileText, Lightbulb,
  LogOut, TrendingUp, CheckCircle2, Clock, AlertCircle, Users,
  Calendar, Upload, Trash2, ExternalLink, Send, MessageSquare,
  Building2, Phone, Mail,
} from "lucide-react";

type Tab = "overview" | "project" | "invoices" | "files" | "requests";

const STAGES: { label: string; key: string }[] = [
  { label: "Onboarding",  key: "onboarding" },
  { label: "Build Phase", key: "build_phase" },
  { label: "Demo Phase",  key: "demo_phase" },
  { label: "Testing",     key: "testing" },
  { label: "Completed",   key: "completed" },
];

function stageIndex(status: string) {
  return STAGES.findIndex((s) => s.key === status) ?? 0;
}

const INVOICE_STATUS: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-400",
  partial: "bg-amber-500/15 text-amber-400",
  unpaid: "bg-red-500/15 text-red-400",
  overdue: "bg-red-600/15 text-red-500",
};

const FR_STATUS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400",
  in_review: "bg-amber-500/15 text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-emerald-600/15 text-emerald-500",
  rejected: "bg-red-500/15 text-red-400",
};

function frLabel(s: string) {
  return s === "in_review" ? "In Review" : s.charAt(0).toUpperCase() + s.slice(1);
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "🖼️";
  if (["pdf"].includes(ext)) return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["zip", "rar", "7z"].includes(ext)) return "📦";
  if (["mp4", "mov", "avi"].includes(ext)) return "🎬";
  return "📎";
}

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDesc, setRequestDesc] = useState("");
  const [requestPriority, setRequestPriority] = useState<"low" | "medium" | "high">("medium");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: client, isLoading: clientLoading, isError: clientError } = useGetMyClient({ query: { queryKey: getGetMyClientQueryKey() } });
  const { data: projects, isLoading: projectsLoading } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const { data: invoices, isLoading: invoicesLoading } = useListInvoices({ query: { queryKey: getListInvoicesQueryKey() } });
  const { data: files, isLoading: filesLoading } = useListFiles({ query: { queryKey: getListFilesQueryKey() } });
  const { data: featureRequests } = useListFeatureRequests({ query: { queryKey: getListFeatureRequestsQueryKey() } });

  const createRequest = useCreateFeatureRequest();
  const deleteFile = useDeleteFile();

  const project = projects?.[0];
  const si = stageIndex(project?.status ?? "onboarding");

  const totalDue = (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.dueAmount)), 0);
  const openRequests = (featureRequests ?? []).filter((r) => r.status === "new" || r.status === "in_review").length;

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!requestTitle.trim()) return;
    setSubmitting(true);
    try {
      await createRequest.mutateAsync({ data: { title: requestTitle, description: requestDesc, priority: requestPriority as FeatureRequestInputPriority } });
      setRequestTitle(""); setRequestDesc(""); setRequestPriority("medium");
      qc.invalidateQueries({ queryKey: getListFeatureRequestsQueryKey() });
    } finally { setSubmitting(false); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await fetch("/api/files", { method: "POST", body: formData, credentials: "include" });
      qc.invalidateQueries({ queryKey: getListFilesQueryKey() });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteFile(id: number) {
    await deleteFile.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListFilesQueryKey() });
  }

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",  label: "Overview",  icon: LayoutDashboard },
    { id: "project",   label: "Project",   icon: FolderKanban },
    { id: "invoices",  label: "Invoices",  icon: Receipt },
    { id: "files",     label: "Files",     icon: FileText },
    { id: "requests",  label: "Requests",  icon: Lightbulb },
  ];

  if (clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (clientError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-1">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">Please refresh the page or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 border-r border-border/50 bg-card/40 flex flex-col">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight leading-none">Aisync</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Client Portal</p>
            </div>
          </div>
          {client && (
            <div className="bg-secondary/40 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold truncate">{client.businessName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{client.industry}</p>
            </div>
          )}
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
                {item.id === "requests" && openRequests > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{openRequests}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {initials(user?.name ?? "C")}
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
        <div className="p-8 max-w-5xl mx-auto">

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {tab === "overview" && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]}</h1>
                <p className="text-muted-foreground text-sm mt-1">Here's the latest on your AI agent integration.</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: "Project Stage",
                    value: (projectsLoading ? "…" : STAGES[si]?.label ?? "—"),
                    icon: FolderKanban,
                    color: "text-primary",
                    accent: "bg-primary/10",
                  },
                  {
                    label: "Balance Due",
                    value: invoicesLoading ? "…" : (totalDue > 0 ? `$${totalDue.toLocaleString()}` : "Paid up"),
                    icon: totalDue > 0 ? AlertCircle : CheckCircle2,
                    color: totalDue > 0 ? "text-destructive" : "text-emerald-400",
                    accent: totalDue > 0 ? "bg-destructive/10" : "bg-emerald-500/10",
                  },
                  {
                    label: "Team Members",
                    value: projectsLoading ? "…" : (project?.employees?.length ?? 0),
                    icon: Users,
                    color: "text-violet-400",
                    accent: "bg-violet-500/10",
                  },
                  {
                    label: "Open Requests",
                    value: openRequests,
                    icon: MessageSquare,
                    color: openRequests > 0 ? "text-amber-400" : "text-muted-foreground",
                    accent: openRequests > 0 ? "bg-amber-500/10" : "bg-secondary",
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="bg-card border border-border/60 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
                        <div className={`w-8 h-8 rounded-lg ${m.accent} flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${m.color}`} />
                        </div>
                      </div>
                      <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Progress timeline */}
              {project && (
                <div className="bg-card border border-border/60 rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold">Project Progress</h3>
                    <span className="text-xs text-muted-foreground">{project.projectName}</span>
                  </div>
                  <div className="relative py-2">
                    <div className="absolute left-0 top-1/2 w-full h-0.5 bg-border/50 -translate-y-1/2 z-0" />
                    <div
                      className="absolute left-0 top-1/2 h-0.5 bg-gradient-to-r from-primary to-violet-500 -translate-y-1/2 z-0 transition-all duration-500"
                      style={{ width: `${si > 0 ? (si / (STAGES.length - 1)) * 100 : 0}%` }}
                    />
                    <div className="relative z-10 flex justify-between">
                      {STAGES.map((stage, i) => (
                        <div key={i} className="flex flex-col items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                            i < si ? "bg-primary border-primary" :
                            i === si ? "bg-primary border-primary shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-110" :
                            "bg-card border-border/80"
                          }`} />
                          <span className={`text-xs text-center max-w-[60px] leading-tight ${i <= si ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {stage.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Latest update card */}
              {project?.latestUpdate && (
                <div className="bg-card border border-border/60 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Latest Update from Your Team</p>
                  </div>
                  <p className="text-sm leading-relaxed">{project.latestUpdate}</p>
                  <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                    {project.startDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Started {new Date(project.startDate).toLocaleDateString()}</span>}
                    {project.expectedCompletionDate && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Expected {new Date(project.expectedCompletionDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              )}

              {!project && !projectsLoading && (
                <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
                  <FolderKanban className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Your project hasn't been set up yet.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Your team will have it ready shortly.</p>
                </div>
              )}
            </div>
          )}

          {/* ── PROJECT ──────────────────────────────────────────────────── */}
          {tab === "project" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Your Project</h1>
                <p className="text-sm text-muted-foreground mt-0.5">AI agent build details and progress.</p>
              </div>

              {project ? (
                <div className="space-y-5">
                  {/* Project card */}
                  <div className="bg-card border border-border/60 rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-xl font-bold">{project.projectName}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                      </div>
                      <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                        { onboarding: "bg-slate-500/15 text-slate-400", build_phase: "bg-blue-500/15 text-blue-400", demo_phase: "bg-purple-500/15 text-purple-400", testing: "bg-orange-500/15 text-orange-400", completed: "bg-emerald-500/15 text-emerald-400" }[project.status] ?? "bg-secondary text-muted-foreground"
                      }`}>{STAGES[si]?.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-border/40">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Start Date</p>
                        <p className="font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" />{project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Expected Completion</p>
                        <p className="font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" />{project.expectedCompletionDate ? new Date(project.expectedCompletionDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
                      </div>
                    </div>
                    {project.latestUpdate && (
                      <div className="mt-4 pt-4 border-t border-border/40">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Latest Update</p>
                        <p className="text-sm text-foreground/90">{project.latestUpdate}</p>
                      </div>
                    )}
                  </div>

                  {/* Stage milestone timeline */}
                  <div className="bg-card border border-border/60 rounded-2xl p-6">
                    <h3 className="font-semibold mb-6">Build Milestones</h3>
                    <div className="space-y-0">
                      {STAGES.map((stage, i) => {
                        const done = i < si;
                        const active = i === si;
                        const upcoming = i > si;
                        return (
                          <div key={i} className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                done ? "bg-primary border-primary" :
                                active ? "bg-primary/20 border-primary" :
                                "bg-card border-border/60"
                              }`}>
                                {done ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                ) : active ? (
                                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-border" />
                                )}
                              </div>
                              {i < STAGES.length - 1 && (
                                <div className={`w-0.5 h-10 ${done ? "bg-primary" : "bg-border/40"} transition-colors`} />
                              )}
                            </div>
                            <div className={`pb-8 ${i === STAGES.length - 1 ? "pb-0" : ""}`}>
                              <p className={`text-sm font-semibold mt-0.5 ${done || active ? "text-foreground" : "text-muted-foreground"}`}>
                                {stage.label}
                                {active && <span className="ml-2 text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">Current</span>}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {stage.key === "onboarding" && "Initial setup, knowledge base collection, system access"}
                                {stage.key === "build_phase" && "AI agent configuration, script writing, integration work"}
                                {stage.key === "demo_phase" && "Live demo agent available for client review and testing"}
                                {stage.key === "testing" && "Final QA, edge cases, client UAT sign-off"}
                                {stage.key === "completed" && "Agent live and handling real calls 24/7"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Team */}
                  {project.employees && project.employees.length > 0 && (
                    <div className="bg-card border border-border/60 rounded-2xl p-6">
                      <h3 className="font-semibold mb-4">Your Dedicated Team</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {project.employees.map((emp) => (
                          <div key={emp.id} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                              {initials(emp.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{emp.name}</p>
                              <p className="text-xs text-primary/80">{emp.role}</p>
                              {emp.email && (
                                <a href={`mailto:${emp.email}`} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-0.5">
                                  <Mail className="w-3 h-3" /> {emp.email}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card border border-border/60 rounded-2xl p-16 text-center">
                  <FolderKanban className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">No project assigned yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ── INVOICES ─────────────────────────────────────────────────── */}
          {tab === "invoices" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Invoices</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Your billing history and payment status.</p>
              </div>

              {/* Summary totals */}
              {(invoices ?? []).length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Total Billed", value: (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.totalAmount)), 0), color: "text-foreground" },
                    { label: "Paid",         value: (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.paidAmount)), 0),  color: "text-emerald-400" },
                    { label: "Outstanding",  value: (invoices ?? []).reduce((s, i) => s + parseFloat(String(i.dueAmount)), 0),   color: totalDue > 0 ? "text-destructive" : "text-emerald-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-card border border-border/60 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>${s.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((inv) => {
                    const total = parseFloat(String(inv.totalAmount));
                    const paid = parseFloat(String(inv.paidAmount));
                    const due = parseFloat(String(inv.dueAmount));
                    const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                    return (
                      <div key={inv.id} className="bg-card border border-border/60 rounded-2xl p-6">
                        <div className="flex items-start justify-between gap-4 mb-5">
                          <div>
                            <p className="font-bold text-sm">Invoice #{inv.id}</p>
                            {inv.notes && <p className="text-xs text-muted-foreground mt-0.5">{inv.notes}</p>}
                          </div>
                          <div className="text-right">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${INVOICE_STATUS[inv.status] ?? "bg-secondary text-muted-foreground"}`}>{inv.status}</span>
                            {inv.dueDate && <p className="text-xs text-muted-foreground mt-1">Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-5 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Total</p>
                            <p className="text-xl font-bold">${total.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Paid</p>
                            <p className="text-xl font-bold text-emerald-400">${paid.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                            <p className={`text-xl font-bold ${due > 0 ? "text-destructive" : "text-emerald-400"}`}>${due.toLocaleString()}</p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                            <span>Payment progress</span>
                            <span className="font-semibold text-foreground">{pct}%</span>
                          </div>
                          <div className="h-2 bg-border/40 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-card border border-border/60 rounded-2xl p-16 text-center">
                  <Receipt className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">No invoices yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ── FILES ────────────────────────────────────────────────────── */}
          {tab === "files" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Files</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Shared documents and deliverables.</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading…" : "Upload File"}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>

              {filesLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Loading…
                </div>
              )}

              {files && files.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((f) => (
                    <div key={f.id} className="bg-card border border-border/60 rounded-xl p-4 flex items-start gap-3 group hover:border-primary/30 transition-colors">
                      <div className="text-2xl shrink-0 mt-0.5">{fileIcon(f.fileName)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.fileName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(f.uploadedAt).toLocaleDateString()}</p>
                        <div className="flex gap-2 mt-2">
                          <a href={f.filePath} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="w-3 h-3" /> Open
                          </a>
                          <button onClick={() => handleDeleteFile(f.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !filesLoading && (
                <div className="bg-card border border-border/60 rounded-2xl p-16 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">No files yet.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Upload documents, screenshots, or assets above.</p>
                </div>
              )}
            </div>
          )}

          {/* ── REQUESTS ─────────────────────────────────────────────────── */}
          {tab === "requests" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Feature Requests</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Submit changes and track their status.</p>
              </div>

              {/* Submission form */}
              <form onSubmit={handleSubmitRequest} className="bg-card border border-border/60 rounded-2xl p-6 mb-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                  <Lightbulb className="w-4 h-4 text-muted-foreground" />
                  New Request
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Short title (e.g. 'SMS appointment reminders')"
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                  <textarea
                    placeholder="Describe what you'd like added or changed, and why…"
                    value={requestDesc}
                    onChange={(e) => setRequestDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Priority:</span>
                      {(["low", "medium", "high"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setRequestPriority(p)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            requestPriority === p
                              ? p === "high" ? "bg-red-500/20 text-red-400" : p === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-secondary text-foreground"
                              : "text-muted-foreground hover:bg-secondary/50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || !requestTitle.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submitting ? "Sending…" : "Submit"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Request list */}
              {featureRequests && featureRequests.length > 0 ? (
                <div className="space-y-3">
                  {featureRequests.map((req) => (
                    <div key={req.id} className="bg-card border border-border/60 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{req.title}</p>
                          {req.description && <p className="text-xs text-muted-foreground mt-1">{req.description}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.priority === "high" ? "bg-red-500/15 text-red-400" :
                            req.priority === "medium" ? "bg-amber-500/15 text-amber-400" :
                            "bg-secondary text-muted-foreground"
                          }`}>{req.priority}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${FR_STATUS[req.status] ?? "bg-secondary text-muted-foreground"}`}>
                            {frLabel(req.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">No requests yet. Submit one above.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
