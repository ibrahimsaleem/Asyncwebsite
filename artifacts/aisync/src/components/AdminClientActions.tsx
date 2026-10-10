import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import {
  getGetAdminSummaryQueryKey, getListClientsQueryKey, getListDemoRequestsQueryKey, getListFeatureRequestsQueryKey,
  getListFilesQueryKey, getListInvoicesQueryKey, getListProjectsQueryKey, useUpdateClient,
} from "@workspace/api-client-react";

type Client = { id: number; businessName: string; industry: string; phone: string; notes?: string | null; isDemo?: boolean };
const FIELD = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

function useRefreshAll() {
  const qc = useQueryClient();
  return () => Promise.all([
    getListClientsQueryKey(), getListProjectsQueryKey(), getListInvoicesQueryKey(), getListFilesQueryKey(),
    getListFeatureRequestsQueryKey(), getListDemoRequestsQueryKey(), getGetAdminSummaryQueryKey(),
  ].map((queryKey) => qc.invalidateQueries({ queryKey })));
}

// In the client detail panel: edit details, or delete the client and everything they own.
export function ClientDetailsActions({ client, onDeleted }: { client: Client; onDeleted: () => void }) {
  const update = useUpdateClient();
  const refreshAll = useRefreshAll();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ businessName: client.businessName, industry: client.industry, phone: client.phone, notes: client.notes ?? "" });
  const [confirmText, setConfirmText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await update.mutateAsync({ id: client.id, data: { ...form, notes: form.notes.trim() || null } });
      await refreshAll();
      setEditing(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't save"); }
  }

  async function remove() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't delete");
      await refreshAll();
      onDeleted();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't delete"); setBusy(false); }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-2.5 bg-secondary/30 rounded-xl p-4">
        {([["businessName", "Business name"], ["industry", "Industry"], ["phone", "Phone"]] as const).map(([k, label]) => (
          <label key={k} className="block">
            <span className="block text-[11px] text-muted-foreground mb-1">{label}</span>
            <input required={k !== "phone"} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className={FIELD} />
          </label>
        ))}
        <label className="block">
          <span className="block text-[11px] text-muted-foreground mb-1">Notes (only your team sees these)</span>
          <textarea rows={4} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={`${FIELD} resize-y`} />
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={update.isPending} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">{update.isPending ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 border border-border rounded-lg text-xs">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <Pencil className="w-3.5 h-3.5" aria-hidden /> Edit details
        </button>
        <button type="button" onClick={() => setConfirming((v) => !v)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" aria-hidden /> Delete client
        </button>
      </div>
      {confirming && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 space-y-2 text-xs">
          <p>This permanently deletes <b>{client.businessName}</b>, their portal login, projects, checklist, answers, invoices, files and requests.</p>
          <label className="block">
            <span className="block text-muted-foreground mb-1">Type the business name to confirm</span>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={FIELD} />
          </label>
          {error && <p className="text-destructive">{error}</p>}
          <button type="button" disabled={busy || confirmText.trim() !== client.businessName} onClick={remove}
            className="px-3 py-1.5 bg-destructive text-white rounded-lg font-semibold disabled:opacity-40">{busy ? "Deleting…" : "Delete permanently"}</button>
        </div>
      )}
    </div>
  );
}

// Overview banner button: clear all the first-run sample data in one go.
export function RemoveDemoData() {
  const refreshAll = useRefreshAll();
  const [stage, setStage] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [msg, setMsg] = useState("");
  async function run() {
    setStage("busy");
    try {
      const res = await fetch("/api/demo-data", { method: "DELETE", credentials: "include" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Couldn't remove demo data");
      await refreshAll();
      setMsg(`Removed ${body.clientsRemoved} demo clients and ${body.leadsRemoved} demo leads.`);
      setStage("done");
    } catch (err) { setMsg(err instanceof Error ? err.message : "Failed"); setStage("idle"); }
  }
  if (stage === "done") return <p className="text-xs text-emerald-300" role="status">{msg}</p>;
  return stage === "confirm" ? (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      Delete all demo clients, their projects, invoices and requests, and demo leads?
      <button type="button" onClick={run} className="px-2.5 py-1 rounded-md bg-destructive text-white font-semibold">Yes, remove</button>
      <button type="button" onClick={() => setStage("idle")} className="px-2.5 py-1 rounded-md border border-border">Cancel</button>
    </span>
  ) : (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={stage === "busy"} onClick={() => setStage("confirm")} className="text-xs font-semibold text-amber-200 underline underline-offset-2 hover:text-amber-100 disabled:opacity-50">
        {stage === "busy" ? "Removing…" : "Remove all demo data"}
      </button>
      {msg && <span className="text-xs text-destructive">{msg}</span>}
    </span>
  );
}
