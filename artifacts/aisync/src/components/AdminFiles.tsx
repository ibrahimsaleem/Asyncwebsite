import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { getListFilesQueryKey, useDeleteFile, useListFiles } from "@workspace/api-client-react";

type ClientOpt = { id: number; businessName: string; isDemo?: boolean };

export function fileSize(bytes?: number | null) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Admin Files tab: everything clients uploaded, grouped by client, plus uploading files for a client.
export function AdminFilesTab({ clients }: { clients: ClientOpt[] }) {
  const qc = useQueryClient();
  const { data: files, isLoading } = useListFiles({ query: { queryKey: getListFilesQueryKey() } });
  const del = useDeleteFile();
  const input = useRef<HTMLInputElement>(null);
  const [clientId, setClientId] = useState(String(clients.find((c) => !c.isDemo)?.id ?? clients[0]?.id ?? ""));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("clientId", clientId);
      const res = await fetch("/api/files", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Upload failed");
      await qc.invalidateQueries({ queryKey: getListFilesQueryKey() });
      setMsg(`Shared ${file.name} with ${clients.find((c) => String(c.id) === clientId)?.businessName}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(id: number, name: string) {
    if (!window.confirm(`Delete ${name}? The client will no longer see it.`)) return;
    await del.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListFilesQueryKey() });
  }

  const byClient = clients
    .map((c) => ({ client: c, files: (files ?? []).filter((f) => f.clientId === c.id).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)) }))
    .filter((g) => g.files.length > 0);

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5 flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[14rem]">
          <span className="block text-xs font-medium text-muted-foreground mb-1.5">Share a file with</span>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}{c.isDemo ? " · DEMO" : ""}</option>)}
          </select>
        </label>
        <input ref={input} type="file" className="hidden" onChange={uploadFile} />
        <button type="button" disabled={busy || !clientId} onClick={() => input.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Upload className="w-4 h-4" aria-hidden /> {busy ? "Uploading…" : "Upload file"}
        </button>
        <p className="basis-full text-xs text-muted-foreground" role="status">{msg || "Up to 10 MB. The client sees it under Files in their portal."}</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading files…</p>}
      {!isLoading && byClient.length === 0 && <p className="text-sm text-muted-foreground">No files yet. Files clients upload in their portal appear here.</p>}

      {byClient.map(({ client, files: list }) => (
        <section key={client.id} className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-3">{client.businessName} <span className="text-xs font-normal text-muted-foreground">· {list.length} file{list.length === 1 ? "" : "s"}</span></h3>
          <ul className="divide-y divide-border/40">
            {list.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{f.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.uploadedBy === "admin" ? "Shared by your team" : "Uploaded by client"} · {when(f.uploadedAt)}{f.size ? ` · ${fileSize(f.size)}` : ""}
                  </p>
                </div>
                <a href={f.filePath} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0">
                  <Download className="w-3.5 h-3.5" aria-hidden /> Download
                </a>
                <button type="button" onClick={() => remove(f.id, f.fileName)} aria-label={`Delete ${f.fileName}`}
                  className="p-1.5 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
