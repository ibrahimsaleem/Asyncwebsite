import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Chat between a client and our team. One thread per client; every admin can read and reply.
// New messages arrive by polling every few seconds (no websockets needed at this size).

type ChatMessage = { id: number; body: string; senderName: string; senderRole: "client" | "admin"; senderTitle: string | null; mine: boolean; createdAt: string };
type Thread = { clientId: number; businessName: string; isDemo: boolean; unread: number; lastMessage: { body: string; senderName: string; createdAt: string } | null };
type Unread = { total: number; latest: { id: number; clientId: number; senderName: string; body: string } | null };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: init?.body ? { "Content-Type": "application/json" } : undefined, ...init });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`);
  return res.json();
}

const UNREAD_KEY = ["messages-unread"];
const THREADS_KEY = ["messages-threads"];
const threadKey = (clientId?: number) => ["messages", clientId ?? "mine"];

function time(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

// Unread count for the nav badge, the browser tab title and a pop-up when something new arrives.
export function useMessageNotifications({ onOpen, viewing }: { onOpen: (clientId: number) => void; viewing: boolean }) {
  const { data } = useQuery({ queryKey: UNREAD_KEY, queryFn: () => api<Unread>("/api/messages/unread"), refetchInterval: 15000 });
  const lastSeen = useRef<number | null>(null);
  const total = data?.total ?? 0;

  useEffect(() => {
    if (!data) return;
    const latest = data.latest;
    // First load only records where we are, so old unread messages don't pop up on every page load
    if (lastSeen.current === null) { lastSeen.current = latest?.id ?? 0; return; }
    if (!latest) return;
    if (latest.id > lastSeen.current && !viewing) {
      toast({
        title: `New message from ${latest.senderName}`,
        description: latest.body,
        className: "cursor-pointer",
        onClick: () => onOpen(latest.clientId),
      });
    }
    lastSeen.current = Math.max(lastSeen.current ?? 0, latest.id);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = total > 0 ? `(${total}) ${base}` : base;
  }, [total]);

  return total;
}

export function ChatThread({ clientId, title, subtitle, onBack, canDelete }: { clientId?: number; title: string; subtitle?: string; onBack?: () => void; canDelete?: boolean }) {
  const qc = useQueryClient();
  const qs = clientId ? `?clientId=${clientId}` : "";
  const { data: messages, isLoading } = useQuery({
    queryKey: threadKey(clientId),
    queryFn: () => api<ChatMessage[]>(`/api/messages${qs}`),
    refetchInterval: 5000,
  });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const lastId = messages?.at(-1)?.id;

  const markRead = () => api("/api/messages/read", { method: "POST", body: JSON.stringify({ clientId }) })
    .then(() => Promise.all([qc.invalidateQueries({ queryKey: UNREAD_KEY }), qc.invalidateQueries({ queryKey: THREADS_KEY })]))
    .catch(() => {});

  // Reading the thread marks it read; keep the newest message in view
  useEffect(() => { if (lastId !== undefined) markRead(); }, [lastId, clientId]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [lastId, clientId]);

  const send = useMutation({
    mutationFn: (body: string) => api("/api/messages", { method: "POST", body: JSON.stringify({ clientId, body }) }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: threadKey(clientId) }); qc.invalidateQueries({ queryKey: THREADS_KEY }); },
    onError: (e: Error) => setError(e.message),
  });
  const removeMsg = useMutation({
    mutationFn: (id: number) => api(`/api/messages/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: threadKey(clientId) }); qc.invalidateQueries({ queryKey: THREADS_KEY }); },
  });
  const submit = () => { const body = text.trim(); if (body && !send.isPending) { setError(""); send.mutate(body); } };

  return (
    <div className="glass rounded-2xl flex flex-col h-[calc(100dvh-11rem)] min-h-[26rem] md:h-[36rem] overflow-hidden">
      <header className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border/50 shrink-0">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back to all chats" className="md:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-secondary"><ArrowLeft className="w-4 h-4" /></button>
        )}
        <div className="min-w-0">
          <p className="font-semibold truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </header>

      <div ref={list} className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-3" aria-live="polite">
        {isLoading && <p className="text-sm text-muted-foreground">Loading messages…</p>}
        {!isLoading && (messages ?? []).length === 0 && (
          <div className="h-full grid place-items-center text-center text-sm text-muted-foreground px-6">
            <div>
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden />
              No messages yet. Write the first one below.
            </div>
          </div>
        )}
        {(messages ?? []).map((m, i) => {
          const prev = messages![i - 1];
          const grouped = prev && prev.senderName === m.senderName && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
          return (
            <div key={m.id} className={`flex gap-2.5 ${m.mine ? "flex-row-reverse" : ""} ${grouped ? "-mt-1.5" : ""}`}>
              <div className={`w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold shrink-0 ${grouped ? "invisible" : ""} ${m.senderRole === "admin" ? "bg-primary/20 text-primary" : "bg-emerald-500/20 text-emerald-300"}`} aria-hidden>
                {initials(m.senderName)}
              </div>
              <div className={`max-w-[78%] min-w-0 flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
                {!grouped && (
                  <p className="text-[11px] text-muted-foreground mb-1 px-1">
                    <span className="font-semibold text-foreground/80">{m.mine ? "You" : m.senderName}</span>
                    {m.senderTitle && !m.mine && <> · {m.senderTitle}</>} · {time(m.createdAt)}
                  </p>
                )}
                <div className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words select-text ${m.mine ? "bg-primary text-primary-foreground rounded-tr-md" : "bg-secondary/70 rounded-tl-md"}`}>
                  {m.body}
                </div>
                {canDelete && (
                  <button type="button" onClick={() => removeMsg.mutate(m.id)} className="mt-0.5 px-1 text-[10px] text-muted-foreground hover:text-destructive">Delete</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form className="border-t border-border/50 p-3 flex items-end gap-2 shrink-0" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor={`chat-${clientId ?? "mine"}`} className="sr-only">Message</label>
        <textarea id={`chat-${clientId ?? "mine"}`} rows={1} value={text} enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
          placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
          className="flex-1 min-w-0 max-h-32 bg-background border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <button type="submit" disabled={!text.trim() || send.isPending} aria-label="Send message"
          className="h-11 w-11 grid place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

// Admin Messages tab: list of client chats on the left, the open chat on the right (stacked on phones).
export function AdminInbox({ openClientId, onOpen }: { openClientId: number | null; onOpen: (id: number | null) => void }) {
  const { data: threads } = useQuery({ queryKey: THREADS_KEY, queryFn: () => api<Thread[]>("/api/messages/threads"), refetchInterval: 15000 });
  const active = threads?.find((t) => t.clientId === openClientId) ?? null;

  return (
    <div className="grid md:grid-cols-[18rem_1fr] gap-4 items-start">
      <nav aria-label="Client chats" className={`glass rounded-2xl overflow-hidden ${active ? "hidden md:block" : ""}`}>
        <ul className="divide-y divide-border/40 max-h-[36rem] overflow-y-auto">
          {(threads ?? []).map((t) => (
            <li key={t.clientId}>
              <button type="button" onClick={() => onOpen(t.clientId)} aria-current={t.clientId === openClientId}
                className={`w-full text-left px-4 py-3 flex gap-3 items-start transition-colors ${t.clientId === openClientId ? "bg-primary/10" : "hover:bg-secondary/40"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate flex items-center gap-2">
                    {t.businessName}
                    {t.isDemo && <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/40 rounded px-1">Demo</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.lastMessage ? `${t.lastMessage.senderName}: ${t.lastMessage.body}` : "No messages yet"}
                  </p>
                </div>
                {t.unread > 0 && <span className="shrink-0 min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-red-500 text-white text-[10px] font-bold">{t.unread}</span>}
              </button>
            </li>
          ))}
          {threads?.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">No clients yet.</li>}
        </ul>
      </nav>
      {active ? (
        <ChatThread key={active.clientId} clientId={active.clientId} title={active.businessName}
          subtitle="Everyone on your team sees this chat and can reply" onBack={() => onOpen(null)} canDelete />
      ) : (
        <div className="hidden md:grid glass rounded-2xl h-[36rem] place-items-center text-sm text-muted-foreground">Pick a client to see your chat with them.</div>
      )}
    </div>
  );
}
