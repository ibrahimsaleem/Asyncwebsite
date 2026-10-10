import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, KeyRound, ShieldCheck } from "lucide-react";
import { getListProjectsQueryKey, useAssignEmployee, useUnassignEmployee } from "@workspace/api-client-react";

type Member = { id: number; name: string; role: string; email: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: init?.body ? { "Content-Type": "application/json" } : undefined, ...init });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`);
  return res.json();
}

const ADMIN_LOGINS_KEY = ["admin-logins"];

export function useAdminLogins() {
  return useQuery({ queryKey: ADMIN_LOGINS_KEY, queryFn: () => api<string[]>("/api/admin-logins") });
}

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return "AIC-" + Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// On a team member card: shows whether they can sign in to the admin panel, and lets you give or remove that.
export function AdminLoginControl({ member }: { member: Member }) {
  const qc = useQueryClient();
  const { data: admins } = useAdminLogins();
  const hasLogin = admins?.includes(member.email.trim().toLowerCase()) ?? false;
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const give = useMutation({
    mutationFn: () => api(`/api/employees/${member.id}/admin-login`, { method: "POST", body: JSON.stringify({ password }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ADMIN_LOGINS_KEY }); setMsg(`Login ready: ${member.email} with the password above. Share it privately.`); },
    onError: (e: Error) => setMsg(e.message),
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/employees/${member.id}/admin-login`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ADMIN_LOGINS_KEY }); setMsg("Admin login removed."); setOpen(false); },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {hasLogin && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
            <ShieldCheck className="w-3 h-3" aria-hidden /> Admin login
          </span>
        )}
        <button type="button" onClick={() => { setOpen((v) => !v); setPassword(randomPassword()); setMsg(""); }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <KeyRound className="w-3 h-3" aria-hidden /> {hasLogin ? "Reset password" : "Give admin login"}
        </button>
        {hasLogin && (
          <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()}
            className="text-xs text-muted-foreground hover:text-destructive">
            {remove.isPending ? "Removing…" : "Remove admin login"}
          </button>
        )}
      </div>
      {open && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); give.mutate(); }}>
          <label className="block text-[11px] text-muted-foreground" htmlFor={`pw-${member.id}`}>
            Password for {member.email}. They can see and manage every client.
          </label>
          <div className="flex gap-2">
            <input id={`pw-${member.id}`} value={password} onChange={(e) => setPassword(e.target.value)} minLength={10}
              className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <button type="submit" disabled={give.isPending || password.length < 10}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">
              {give.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
      {msg && <p className="text-[11px] text-muted-foreground" role="status">{msg}</p>}
    </div>
  );
}

// On a project: tap team members to put them on (or take them off) this client's project.
export function ProjectTeamPicker({ projectId, assigned, members }: { projectId: number; assigned: number[]; members: Member[] }) {
  const qc = useQueryClient();
  const assign = useAssignEmployee();
  const unassign = useUnassignEmployee();
  const [busy, setBusy] = useState<number | null>(null);

  async function toggle(m: Member) {
    setBusy(m.id);
    try {
      const on = assigned.includes(m.id);
      await (on ? unassign : assign).mutateAsync({ id: projectId, data: { employeeId: m.id } });
      await qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    } finally { setBusy(null); }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-semibold mb-1">Team on this project</h3>
      <p className="text-xs text-muted-foreground mb-4">The client sees these people under “Your Dedicated Team”. Tap to add or remove.</p>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const on = assigned.includes(m.id);
          return (
            <button key={m.id} type="button" aria-pressed={on} disabled={busy === m.id} onClick={() => toggle(m)}
              className={`inline-flex items-center gap-1.5 min-h-10 px-3.5 py-1.5 rounded-full text-sm border transition-colors disabled:opacity-60 ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
              {on && <Check className="w-3.5 h-3.5" aria-hidden />}
              <span className="font-medium">{m.name}</span>
              <span className={`text-xs ${on ? "opacity-80" : "text-muted-foreground"}`}>{m.role}</span>
            </button>
          );
        })}
        {members.length === 0 && <p className="text-sm text-muted-foreground">Add people in the Team tab first.</p>}
      </div>
    </div>
  );
}
