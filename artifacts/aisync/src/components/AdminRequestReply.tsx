import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { getGetAdminSummaryQueryKey, getListDemoRequestsQueryKey, getListFeatureRequestsQueryKey, useUpdateFeatureRequest, type FeatureRequestUpdateStatus } from "@workspace/api-client-react";

const STATUSES: [FeatureRequestUpdateStatus, string][] = [
  ["new", "New"], ["in_review", "In review"], ["approved", "Approved"], ["completed", "Completed"], ["rejected", "Rejected"],
];

// Under each request in admin: reply to the client (they see it under their request) and set any status.
export function RequestReply({ request }: { request: { id: number; status: string; adminResponse?: string | null } }) {
  const qc = useQueryClient();
  const update = useUpdateFeatureRequest();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(request.adminResponse ?? "");
  const refresh = () => Promise.all([getListFeatureRequestsQueryKey(), getGetAdminSummaryQueryKey()].map((queryKey) => qc.invalidateQueries({ queryKey })));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await update.mutateAsync({ id: request.id, data: { adminResponse: text.trim() || null } });
    await refresh();
    setOpen(false);
  }

  return (
    <div className="mt-3 space-y-2">
      {request.adminResponse && !open && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs">
          <p className="font-semibold text-primary mb-0.5">Your reply</p>
          <p className="text-foreground/90 whitespace-pre-line">{request.adminResponse}</p>
        </div>
      )}
      {open ? (
        <form onSubmit={save} className="space-y-2">
          <textarea autoFocus rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply to the client. They see this under their request."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" />
          <div className="flex gap-2">
            <button type="submit" disabled={update.isPending} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">{update.isPending ? "Sending…" : "Save reply"}</button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 border border-border rounded-lg text-xs">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setText(request.adminResponse ?? ""); setOpen(true); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <MessageSquare className="w-3.5 h-3.5" aria-hidden /> {request.adminResponse ? "Edit reply" : "Reply"}
          </button>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            Status
            <select value={request.status} disabled={update.isPending}
              onChange={async (e) => { await update.mutateAsync({ id: request.id, data: { status: e.target.value as FeatureRequestUpdateStatus } }); await refresh(); }}
              className="bg-background border border-border rounded-md px-2 py-1 text-xs">
              {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

const LEAD_STYLES: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-300", contacted: "bg-amber-500/15 text-amber-300", won: "bg-emerald-500/15 text-emerald-300", lost: "bg-secondary text-muted-foreground",
};

// On each demo lead: track where it stands (new → contacted → won/lost).
export function LeadStatus({ id, status }: { id: number; status: string }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  async function change(next: string) {
    setSaving(true);
    try {
      await fetch(`/api/demo-requests/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      await qc.invalidateQueries({ queryKey: getListDemoRequestsQueryKey() });
    } finally { setSaving(false); }
  }
  return (
    <select aria-label="Lead status" value={status} disabled={saving} onChange={(e) => change(e.target.value)}
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 ${LEAD_STYLES[status] ?? LEAD_STYLES.new}`}>
      <option value="new">New</option><option value="contacted">Contacted</option><option value="won">Won</option><option value="lost">Lost</option>
    </select>
  );
}
