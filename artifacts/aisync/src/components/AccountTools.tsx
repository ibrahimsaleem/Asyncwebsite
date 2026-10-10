import { useState } from "react";
import { KeyRound } from "lucide-react";

const FIELD = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Something went wrong");
}

// Sidebar link + small form so anyone can change their own password.
export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await post("/api/auth/change-password", { currentPassword: current, newPassword: next });
      setMsg({ ok: true, text: "Password changed." });
      setCurrent(""); setNext("");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't change it" });
    } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => { setOpen(true); setMsg(null); }}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <KeyRound className="w-3.5 h-3.5" aria-hidden /> Change password
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block">
        <span className="block text-[11px] text-muted-foreground mb-1">Current password</span>
        <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={FIELD} />
      </label>
      <label className="block">
        <span className="block text-[11px] text-muted-foreground mb-1">New password (10+ characters)</span>
        <input type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} className={FIELD} />
      </label>
      {msg && <p className={`text-[11px] ${msg.ok ? "text-emerald-400" : "text-destructive"}`} role="status">{msg.text}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 border border-border rounded-lg text-xs">Close</button>
      </div>
    </form>
  );
}

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return "AIC-" + Array.from(crypto.getRandomValues(new Uint8Array(14)), (b) => chars[b % chars.length]).join("");
}

// Client detail panel: give the client a new portal password.
export function ResetClientPassword({ clientId, email }: { clientId: number; email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await post(`/api/clients/${clientId}/reset-password`, { password });
      setMsg({ ok: true, text: `Saved. Send ${email} this password privately.` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't reset it" });
    } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => { setPassword(randomPassword()); setMsg(null); setOpen(true); }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
        <KeyRound className="w-3.5 h-3.5" aria-hidden /> Reset portal password
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block">
        <span className="block text-[11px] text-muted-foreground mb-1">New password for {email}</span>
        <input value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} className={`${FIELD} font-mono`} />
      </label>
      {msg && <p className={`text-[11px] ${msg.ok ? "text-emerald-400" : "text-destructive"}`} role="status">{msg.text}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || password.length < 10} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">{busy ? "Saving…" : "Set password"}</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 border border-border rounded-lg text-xs">Close</button>
      </div>
    </form>
  );
}
