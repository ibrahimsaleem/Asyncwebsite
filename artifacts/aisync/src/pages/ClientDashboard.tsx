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

type Tab = "overview" | "project" | "invoices" | "files" | "requests";

const STAGES = ["Onboarding", "Build Phase", "Demo Phase", "Testing", "Completed"];

function stageIndex(status: string) {
  const map: Record<string, number> = {
    onboarding: 0,
    build_phase: 1,
    demo_phase: 2,
    testing: 3,
    completed: 4,
  };
  return map[status] ?? 0;
}

function invoiceStatusBadge(status: string) {
  const colors: Record<string, string> = {
    paid: "bg-emerald-500/20 text-emerald-400",
    partial: "bg-amber-500/20 text-amber-400",
    unpaid: "bg-red-500/20 text-red-400",
    overdue: "bg-red-600/20 text-red-500",
  };
  return colors[status] ?? "bg-secondary text-muted-foreground";
}

function reqStatusBadge(status: string) {
  const colors: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-400",
    in_review: "bg-amber-500/20 text-amber-400",
    approved: "bg-emerald-500/20 text-emerald-400",
    completed: "bg-emerald-600/20 text-emerald-500",
    rejected: "bg-red-500/20 text-red-400",
  };
  return colors[status] ?? "bg-secondary text-muted-foreground";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDesc, setRequestDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: client } = useGetMyClient({ query: { queryKey: getGetMyClientQueryKey() } });
  const { data: projects } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const { data: invoices } = useListInvoices({ query: { queryKey: getListInvoicesQueryKey() } });
  const { data: files } = useListFiles({ query: { queryKey: getListFilesQueryKey() } });
  const { data: featureRequests } = useListFeatureRequests({ query: { queryKey: getListFeatureRequestsQueryKey() } });

  const createRequest = useCreateFeatureRequest();
  const deleteFile = useDeleteFile();

  const project = projects?.[0];
  const invoice = invoices?.[0];
  const si = stageIndex(project?.status ?? "onboarding");

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!requestTitle.trim()) return;
    setSubmitting(true);
    try {
      await createRequest.mutateAsync({
        data: {
          title: requestTitle,
          description: requestDesc,
          priority: FeatureRequestInputPriority.medium,
        },
      });
      setRequestTitle("");
      setRequestDesc("");
      qc.invalidateQueries({ queryKey: getListFeatureRequestsQueryKey() });
    } finally {
      setSubmitting(false);
    }
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

  const navItems: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "project", label: "Project" },
    { id: "invoices", label: "Invoices" },
    { id: "files", label: "Files" },
    { id: "requests", label: "Requests" },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border/50 bg-card/50 flex flex-col">
        <div className="p-5 border-b border-border/50 flex items-center gap-2">
          <div className="w-5 h-5 bg-primary rounded-sm" />
          <span className="font-bold tracking-tight text-sm">Aisync Client</span>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                tab === item.id
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/50 text-sm">
          <p className="text-muted-foreground truncate mb-2">{user?.email}</p>
          <button onClick={() => logout()} className="text-destructive font-medium hover:underline text-sm">
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <h1 className="text-3xl font-bold mb-1">Welcome back, {user?.name}</h1>
            <p className="text-muted-foreground mb-8">Here's the latest on your AI agent integration.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-card border border-border p-6 rounded-xl">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Project Status</p>
                <p className="text-2xl font-bold">{STAGES[si]}</p>
                <p className="text-xs text-primary mt-1">{project?.projectName ?? "—"}</p>
              </div>
              <div className="bg-card border border-border p-6 rounded-xl">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Latest Invoice</p>
                <p className="text-2xl font-bold">
                  ${invoice ? parseFloat(String(invoice.totalAmount)).toLocaleString() : "—"}
                </p>
                {invoice && (
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${invoiceStatusBadge(invoice.status)}`}>
                    {invoice.status}
                  </span>
                )}
              </div>
              <div className="bg-card border border-border p-6 rounded-xl">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Company</p>
                <p className="text-2xl font-bold">{client?.businessName ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">{client?.industry ?? ""}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-6 text-lg">Project Timeline</h3>
              <div className="relative py-4">
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-border/50 -translate-y-1/2 z-0" />
                <div
                  className="absolute left-0 top-1/2 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all"
                  style={{ width: `${(si / (STAGES.length - 1)) * 100}%` }}
                />
                <div className="relative z-10 flex justify-between">
                  {STAGES.map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 transition-all ${
                          i <= si
                            ? "bg-primary border-primary shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                            : "bg-card border-border/80"
                        }`}
                      />
                      <span className={`text-xs ${i <= si ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PROJECT ── */}
        {tab === "project" && (
          <div>
            <h1 className="text-3xl font-bold mb-1">Project Details</h1>
            <p className="text-muted-foreground mb-8">Your active AI agent project.</p>

            {project ? (
              <div className="space-y-5">
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">{project.projectName}</h2>
                      <p className="text-muted-foreground text-sm mt-1">{project.description}</p>
                    </div>
                    <span className="px-3 py-1 bg-primary/15 text-primary rounded-full text-xs font-medium capitalize">
                      {STAGES[stageIndex(project.status)]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expected Completion</p>
                      <p className="font-medium">{project.expectedCompletionDate ? new Date(project.expectedCompletionDate).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>
                  {project.latestUpdate && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Latest Update</p>
                      <p className="text-sm">{project.latestUpdate}</p>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-semibold mb-6">Progress</h3>
                  <div className="relative py-4">
                    <div className="absolute left-0 top-1/2 w-full h-0.5 bg-border/50 -translate-y-1/2 z-0" />
                    <div
                      className="absolute left-0 top-1/2 h-0.5 bg-primary -translate-y-1/2 z-0"
                      style={{ width: `${(stageIndex(project.status) / (STAGES.length - 1)) * 100}%` }}
                    />
                    <div className="relative z-10 flex justify-between">
                      {STAGES.map((step, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${
                              i <= stageIndex(project.status)
                                ? "bg-primary border-primary shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                                : "bg-card border-border/80"
                            }`}
                          />
                          <span className={`text-xs ${i <= stageIndex(project.status) ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Team */}
                {project.employees && project.employees.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Assigned Team</h3>
                    <div className="flex flex-col gap-3">
                      {project.employees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold shrink-0">
                            {initials(emp.name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No project assigned yet.
              </div>
            )}
          </div>
        )}

        {/* ── INVOICES ── */}
        {tab === "invoices" && (
          <div>
            <h1 className="text-3xl font-bold mb-1">Invoices</h1>
            <p className="text-muted-foreground mb-8">Your billing history.</p>

            {invoices && invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.map((inv) => (
                  <div key={inv.id} className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">Invoice #{inv.id}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${invoiceStatusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border/50 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-semibold text-lg">${parseFloat(String(inv.totalAmount)).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Paid</p>
                        <p className="font-semibold text-lg text-emerald-400">${parseFloat(String(inv.paidAmount)).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Due</p>
                        <p className="font-semibold text-lg text-destructive">${parseFloat(String(inv.dueAmount)).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No invoices yet.
              </div>
            )}
          </div>
        )}

        {/* ── FILES ── */}
        {tab === "files" && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-1">Files</h1>
                <p className="text-muted-foreground">Shared documents and deliverables.</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {uploading ? "Uploading…" : "Upload File"}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>

            {files && files.length > 0 ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/30">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">File Name</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Uploaded</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f, i) => (
                      <tr key={f.id} className={`border-b border-border/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                        <td className="px-5 py-3">
                          <a href={f.filePath} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {f.fileName}
                          </a>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {new Date(f.uploadedAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDeleteFile(f.id)}
                            className="text-destructive hover:underline text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No files uploaded yet.
              </div>
            )}
          </div>
        )}

        {/* ── REQUESTS ── */}
        {tab === "requests" && (
          <div>
            <h1 className="text-3xl font-bold mb-1">Feature Requests</h1>
            <p className="text-muted-foreground mb-8">Submit and track change requests.</p>

            {/* Submit form */}
            <form onSubmit={handleSubmitRequest} className="bg-card border border-border rounded-xl p-6 mb-6">
              <h3 className="font-semibold mb-4">New Request</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Request title"
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
                <textarea
                  placeholder="Describe the feature or change…"
                  value={requestDesc}
                  onChange={(e) => setRequestDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  disabled={submitting || !requestTitle.trim()}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>

            {/* Requests list */}
            {featureRequests && featureRequests.length > 0 ? (
              <div className="space-y-3">
                {featureRequests.map((req) => (
                  <div key={req.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium">{req.title}</p>
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          req.priority === "high" ? "bg-red-500/20 text-red-400" :
                          req.priority === "medium" ? "bg-amber-500/20 text-amber-400" :
                          "bg-secondary text-muted-foreground"
                        }`}>{req.priority}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${reqStatusBadge(req.status)}`}>
                          {req.status === FeatureRequestStatus.in_review ? "In Review" : req.status}
                        </span>
                      </div>
                    </div>
                    {req.description && (
                      <p className="text-sm text-muted-foreground">{req.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                No requests yet. Submit one above.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
