import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useGetAdminSummary,
  useListClients,
  useListProjects,
  useListEmployees,
  useListInvoices,
  useListFeatureRequests,
  useListDemoRequests,
  useCreateClient,
  useCreateProject,
  useCreateEmployee,
  useUpdateFeatureRequest,
  useDeleteEmployee,
  ProjectInputStatus,
  getGetAdminSummaryQueryKey,
  getListClientsQueryKey,
  getListProjectsQueryKey,
  getListEmployeesQueryKey,
  getListInvoicesQueryKey,
  getListFeatureRequestsQueryKey,
  getListDemoRequestsQueryKey,
  FeatureRequestUpdateStatus,
  FeatureRequestStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "overview" | "clients" | "projects" | "employees" | "invoices" | "feature-requests" | "demo-leads";

const PROJECT_STATUS_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  build_phase: "Build Phase",
  demo_phase: "Demo Phase",
  testing: "Testing",
  completed: "Completed",
};

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    paid: "bg-emerald-500/20 text-emerald-400",
    partial: "bg-amber-500/20 text-amber-400",
    unpaid: "bg-red-500/20 text-red-400",
    overdue: "bg-red-600/20 text-red-500",
    completed: "bg-emerald-500/20 text-emerald-400",
    onboarding: "bg-amber-500/20 text-amber-400",
    build_phase: "bg-blue-500/20 text-blue-400",
    demo_phase: "bg-purple-500/20 text-purple-400",
    testing: "bg-orange-500/20 text-orange-400",
    new: "bg-blue-500/20 text-blue-400",
    in_review: "bg-amber-500/20 text-amber-400",
    approved: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-red-500/20 text-red-400",
    high: "bg-red-500/20 text-red-400",
    medium: "bg-amber-500/20 text-amber-400",
    low: "bg-secondary text-muted-foreground",
  };
  return colors[status] ?? "bg-secondary text-muted-foreground";
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const qc = useQueryClient();

  // New client form
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientBusiness, setNewClientBusiness] = useState("");
  const [newClientIndustry, setNewClientIndustry] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [addingClient, setAddingClient] = useState(false);

  // New project form
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProjClientId, setNewProjClientId] = useState("");
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjStatus, setNewProjStatus] = useState<string>(ProjectInputStatus.onboarding);
  const [newProjStart, setNewProjStart] = useState("");
  const [newProjEnd, setNewProjEnd] = useState("");
  const [addingProject, setAddingProject] = useState(false);

  // New employee form
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [addingEmp, setAddingEmp] = useState(false);
  const [showEmpForm, setShowEmpForm] = useState(false);

  const { data: summary } = useGetAdminSummary({ query: { queryKey: getGetAdminSummaryQueryKey() } });
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

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setAddingClient(true);
    try {
      await createClient.mutateAsync({
        data: {
          name: newClientName,
          email: newClientEmail,
          businessName: newClientBusiness,
          industry: newClientIndustry,
          phone: newClientPhone,
          password: newClientPassword || undefined,
        },
      });
      setNewClientName(""); setNewClientEmail(""); setNewClientBusiness("");
      setNewClientIndustry(""); setNewClientPhone(""); setNewClientPassword("");
      setShowClientForm(false);
      qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
    } finally {
      setAddingClient(false);
    }
  }

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjClientId) return;
    setAddingProject(true);
    try {
      await createProject.mutateAsync({
        data: {
          clientId: parseInt(newProjClientId, 10),
          projectName: newProjName,
          description: newProjDesc,
          status: newProjStatus as typeof ProjectInputStatus[keyof typeof ProjectInputStatus],
          startDate: newProjStart || undefined,
          expectedCompletionDate: newProjEnd || undefined,
        },
      });
      setNewProjClientId(""); setNewProjName(""); setNewProjDesc("");
      setNewProjStatus(ProjectInputStatus.onboarding); setNewProjStart(""); setNewProjEnd("");
      setShowProjectForm(false);
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
    } finally {
      setAddingProject(false);
    }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setAddingEmp(true);
    try {
      await createEmployee.mutateAsync({
        data: { name: newEmpName, role: newEmpRole, email: newEmpEmail },
      });
      setNewEmpName(""); setNewEmpRole(""); setNewEmpEmail("");
      setShowEmpForm(false);
      qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
    } finally {
      setAddingEmp(false);
    }
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

  const navItems: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "clients", label: "Clients" },
    { id: "projects", label: "Projects" },
    { id: "employees", label: "Employees" },
    { id: "invoices", label: "Invoices" },
    { id: "feature-requests", label: "Feature Requests" },
    { id: "demo-leads", label: "Demo Leads" },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border/50 bg-card/50 flex flex-col">
        <div className="p-5 border-b border-border/50 flex items-center gap-2">
          <div className="w-5 h-5 bg-destructive rounded-sm" />
          <span className="font-bold tracking-tight text-sm">Aisync Admin</span>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
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
            <h1 className="text-3xl font-bold mb-1">Admin Overview</h1>
            <p className="text-muted-foreground mb-8">Platform metrics and health.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { label: "Total Clients", value: summary?.totalClients ?? 0, color: "text-foreground" },
                { label: "Active Projects", value: summary?.activeProjects ?? 0, color: "text-primary" },
                { label: "Completed Projects", value: summary?.completedProjects ?? 0, color: "text-emerald-400" },
                { label: "Total Revenue", value: `$${(summary?.totalPaid ?? 0).toLocaleString()}`, color: "text-emerald-400" },
                { label: "Outstanding Due", value: `$${(summary?.totalDue ?? 0).toLocaleString()}`, color: "text-destructive" },
                { label: "Pending Requests", value: summary?.pendingFeatureRequests ?? 0, color: "text-amber-400" },
              ].map((m) => (
                <div key={m.label} className="bg-card border border-border p-6 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">{m.label}</p>
                  <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Recent demo leads */}
            {demoRequests && demoRequests.length > 0 && (
              <div className="mt-8 bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                  <h3 className="font-semibold">Recent Demo Leads</h3>
                  <button onClick={() => setTab("demo-leads")} className="text-xs text-primary hover:underline">View all</button>
                </div>
                <div className="divide-y divide-border/30">
                  {demoRequests.slice(0, 3).map((d) => (
                    <div key={d.id} className="px-6 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.businessName} · {d.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CLIENTS ── */}
        {tab === "clients" && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-1">Clients</h1>
                <p className="text-muted-foreground">All client accounts.</p>
              </div>
              <button
                onClick={() => setShowClientForm((v) => !v)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {showClientForm ? "Cancel" : "+ Add Client"}
              </button>
            </div>

            {showClientForm && (
              <form onSubmit={handleAddClient} className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-4">New Client</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input required value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Full name" className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input required value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="Email address" type="email" className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input required value={newClientBusiness} onChange={(e) => setNewClientBusiness(e.target.value)} placeholder="Business name" className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input value={newClientIndustry} onChange={(e) => setNewClientIndustry(e.target.value)} placeholder="Industry (e.g. Dental)" className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="Phone number" className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input value={newClientPassword} onChange={(e) => setNewClientPassword(e.target.value)} placeholder="Portal password (optional)" type="password" className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <button type="submit" disabled={addingClient} className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {addingClient ? "Adding…" : "Add Client"}
                </button>
              </form>
            )}

            {clients && clients.length > 0 ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/30">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Business</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Industry</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c, i) => (
                      <tr key={c.id} className={`border-b border-border/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold shrink-0">
                              {initials(c.userName ?? c.userEmail ?? "?")}
                            </div>
                            <span className="font-medium">{c.userName ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{c.businessName}</td>
                        <td className="px-5 py-3 text-muted-foreground">{c.email}</td>
                        <td className="px-5 py-3 text-muted-foreground">{c.industry || "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{c.phone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No clients yet.
              </div>
            )}
          </div>
        )}

        {/* ── PROJECTS ── */}
        {tab === "projects" && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-1">Projects</h1>
                <p className="text-muted-foreground">All client projects and their status.</p>
              </div>
              <button
                onClick={() => setShowProjectForm((v) => !v)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {showProjectForm ? "Cancel" : "+ Add Project"}
              </button>
            </div>

            {showProjectForm && (
              <form onSubmit={handleAddProject} className="bg-card border border-border rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-4">New Project</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <select
                      required
                      value={newProjClientId}
                      onChange={(e) => setNewProjClientId(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select client…</option>
                      {clients?.map((c) => (
                        <option key={c.id} value={c.id}>{c.businessName} ({c.userEmail})</option>
                      ))}
                    </select>
                  </div>
                  <input required value={newProjName} onChange={(e) => setNewProjName(e.target.value)} placeholder="Project name" className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <select
                    value={newProjStatus}
                    onChange={(e) => setNewProjStatus(e.target.value)}
                    className="bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {Object.entries(PROJECT_STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <div className="col-span-2">
                    <textarea required value={newProjDesc} onChange={(e) => setNewProjDesc(e.target.value)} placeholder="Project description" rows={2} className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Start date</label>
                    <input type="date" value={newProjStart} onChange={(e) => setNewProjStart(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Expected completion</label>
                    <input type="date" value={newProjEnd} onChange={(e) => setNewProjEnd(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <button type="submit" disabled={addingProject || !newProjClientId} className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {addingProject ? "Adding…" : "Add Project"}
                </button>
              </form>
            )}

            {projects && projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((p) => (
                  <div key={p.id} className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-lg">{p.projectName}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge(p.status)}`}>
                        {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      {p.clientBusinessName && <span>Client: {p.clientBusinessName}</span>}
                      <span>Start: {p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"}</span>
                      <span>Due: {p.expectedCompletionDate ? new Date(p.expectedCompletionDate).toLocaleDateString() : "—"}</span>
                      {p.employees && p.employees.length > 0 && (
                        <span>{p.employees.length} team member{p.employees.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {p.latestUpdate && (
                      <div className="mt-3 pt-3 border-t border-border/30 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Update: </span>{p.latestUpdate}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No projects yet.
              </div>
            )}
          </div>
        )}

        {/* ── EMPLOYEES ── */}
        {tab === "employees" && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-1">Employees</h1>
                <p className="text-muted-foreground">Your team members.</p>
              </div>
              <button
                onClick={() => setShowEmpForm((v) => !v)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {showEmpForm ? "Cancel" : "+ Add Employee"}
              </button>
            </div>

            {showEmpForm && (
              <form onSubmit={handleAddEmployee} className="bg-card border border-border rounded-xl p-6 mb-6 space-y-3">
                <h3 className="font-semibold mb-2">New Employee</h3>
                <input required value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} placeholder="Full name" className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input required value={newEmpRole} onChange={(e) => setNewEmpRole(e.target.value)} placeholder="Role (e.g. AI Engineer)" className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input required value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} placeholder="Email" type="email" className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <button type="submit" disabled={addingEmp} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {addingEmp ? "Adding…" : "Add Employee"}
                </button>
              </form>
            )}

            {employees && employees.length > 0 ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/30">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => (
                      <tr key={emp.id} className={`border-b border-border/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                              {initials(emp.name)}
                            </div>
                            <span className="font-medium">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{emp.role}</td>
                        <td className="px-5 py-3 text-muted-foreground">{emp.email}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="text-destructive hover:underline text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No employees yet.
              </div>
            )}
          </div>
        )}

        {/* ── INVOICES ── */}
        {tab === "invoices" && (
          <div>
            <h1 className="text-3xl font-bold mb-1">Invoices</h1>
            <p className="text-muted-foreground mb-8">All billing records.</p>

            {invoices && invoices.length > 0 ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/30">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Client</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Paid</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Due</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => (
                      <tr key={inv.id} className={`border-b border-border/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                        <td className="px-5 py-3 text-muted-foreground">{inv.id}</td>
                        <td className="px-5 py-3">{inv.clientId}</td>
                        <td className="px-5 py-3 font-medium">${parseFloat(String(inv.totalAmount)).toLocaleString()}</td>
                        <td className="px-5 py-3 text-emerald-400">${parseFloat(String(inv.paidAmount)).toLocaleString()}</td>
                        <td className="px-5 py-3 text-destructive">${parseFloat(String(inv.dueAmount)).toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No invoices yet.
              </div>
            )}
          </div>
        )}

        {/* ── FEATURE REQUESTS ── */}
        {tab === "feature-requests" && (
          <div>
            <h1 className="text-3xl font-bold mb-1">Feature Requests</h1>
            <p className="text-muted-foreground mb-8">Review and action client requests.</p>

            {featureRequests && featureRequests.length > 0 ? (
              <div className="space-y-3">
                {featureRequests.map((req) => (
                  <div key={req.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{req.title}</p>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${statusBadge(req.priority)}`}>
                            {req.priority}
                          </span>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${statusBadge(req.status)}`}>
                            {req.status === FeatureRequestStatus.in_review ? "In Review" : req.status}
                          </span>
                        </div>
                        {req.description && (
                          <p className="text-sm text-muted-foreground">{req.description}</p>
                        )}
                        {req.clientBusinessName && (
                          <p className="text-xs text-muted-foreground mt-1">From: {req.clientBusinessName}</p>
                        )}
                      </div>
                      {(req.status === FeatureRequestStatus.new || req.status === FeatureRequestStatus.in_review) && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateRequest(req.id, FeatureRequestUpdateStatus.approved)}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateRequest(req.id, FeatureRequestUpdateStatus.rejected)}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No feature requests yet.
              </div>
            )}
          </div>
        )}

        {/* ── DEMO LEADS ── */}
        {tab === "demo-leads" && (
          <div>
            <h1 className="text-3xl font-bold mb-1">Demo Leads</h1>
            <p className="text-muted-foreground mb-8">Businesses who requested a demo.</p>

            {demoRequests && demoRequests.length > 0 ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/30">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Business</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Phone</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Industry</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Message</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoRequests.map((d, i) => (
                      <tr key={d.id} className={`border-b border-border/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                        <td className="px-5 py-3 font-medium">{d.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{d.email}</td>
                        <td className="px-5 py-3 text-muted-foreground">{d.businessName}</td>
                        <td className="px-5 py-3 text-muted-foreground">{d.phone}</td>
                        <td className="px-5 py-3 text-muted-foreground">{d.industry}</td>
                        <td className="px-5 py-3 text-muted-foreground max-w-[160px] truncate">{d.message ?? "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No demo requests yet.
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
