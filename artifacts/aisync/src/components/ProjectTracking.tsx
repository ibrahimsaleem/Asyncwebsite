import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";

// Timeline, milestone checklist and onboarding questions for one project.
// These endpoints live outside the OpenAPI spec, so they use plain fetch.

type Update = { id: number; message: string; createdAt: string };
type Milestone = { id: number; title: string; position: number; doneAt: string | null };
type Question = { id: number; section: string; question: string; options: string[] | null; answer: string | null; answeredAt: string | null };

// Chosen options are kept in the answer text, separated by "; ", so typed notes and choices live together.
const SEP = "; ";
const parts = (answer: string) => answer.split(";").map((p) => p.trim()).filter(Boolean);
function toggleOption(answer: string, option: string) {
  const current = parts(answer);
  return (current.includes(option) ? current.filter((p) => p !== option) : [...current, option]).join(SEP);
}
type Tracking = { updates: Update[]; milestones: Milestone[]; questions: Question[] };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`);
  return res.json();
}

const trackingKey = (projectId: number) => ["project-tracking", projectId];

export function useProjectTracking(projectId: number | undefined) {
  return useQuery({
    queryKey: trackingKey(projectId ?? 0),
    queryFn: () => api<Tracking>(`/api/projects/${projectId}/tracking`),
    enabled: !!projectId,
  });
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MilestoneChecklist({ projectId, isAdmin }: { projectId: number; isAdmin?: boolean }) {
  const qc = useQueryClient();
  const { data } = useProjectTracking(projectId);
  const toggle = useMutation({
    mutationFn: (m: Milestone) =>
      api(`/api/projects/${projectId}/milestones/${m.id}`, { method: "PATCH", body: JSON.stringify({ done: !m.doneAt }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: trackingKey(projectId) }),
  });
  const milestones = data?.milestones ?? [];
  const done = milestones.filter((m) => m.doneAt).length;

  return (
    <div className="glass glass-hover rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold">Progress checklist</h3>
        <span className="text-xs text-muted-foreground">{done} of {milestones.length} done</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary mb-5 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${milestones.length ? (done / milestones.length) * 100 : 0}%` }} />
      </div>
      <ul className="space-y-2">
        {milestones.map((m) => {
          const Icon = m.doneAt ? CheckCircle2 : Circle;
          const body = (
            <>
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${m.doneAt ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`flex-1 ${m.doneAt ? "text-foreground" : "text-muted-foreground"}`}>{m.title}</span>
              {m.doneAt && <span className="text-xs text-muted-foreground shrink-0">{when(m.doneAt)}</span>}
            </>
          );
          return (
            <li key={m.id}>
              {isAdmin ? (
                <button type="button" disabled={toggle.isPending} onClick={() => toggle.mutate(m)}
                  className="w-full flex items-start gap-3 text-left text-sm rounded-lg px-2 py-1.5 hover:bg-secondary/50 transition-colors">
                  {body}
                </button>
              ) : (
                <div className="flex items-start gap-3 text-sm px-2 py-1.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {isAdmin && <p className="text-xs text-muted-foreground mt-3">Click a step to tick or untick it. The client sees this list.</p>}
    </div>
  );
}

export function ProjectTimeline({ projectId }: { projectId: number }) {
  const { data } = useProjectTracking(projectId);
  const updates = data?.updates ?? [];
  return (
    <div className="glass glass-hover rounded-2xl p-6">
      <h3 className="font-semibold mb-4">Updates from your team</h3>
      {updates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No updates yet.</p>
      ) : (
        <ol className="space-y-4 border-l border-border/60 ml-1.5">
          {updates.map((u) => (
            <li key={u.id} className="pl-5 relative">
              <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
              <p className="text-xs text-muted-foreground mb-0.5">{when(u.createdAt)}</p>
              <p className="text-sm text-foreground/90 whitespace-pre-line">{u.message}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function QuestionsPanel({ projectId, isAdmin }: { projectId: number; isAdmin?: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useProjectTracking(projectId);
  const questions = data?.questions ?? [];
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newQuestions, setNewQuestions] = useState("");

  // Keep what the user is typing; only fill in questions we haven't seen yet.
  useEffect(() => {
    setDraft((prev) => Object.fromEntries(questions.map((q) => [q.id, prev[q.id] ?? q.answer ?? ""])));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of questions) map.set(q.section, [...(map.get(q.section) ?? []), q]);
    return [...map.entries()];
  }, [questions]);

  const refresh = () => qc.invalidateQueries({ queryKey: trackingKey(projectId) });
  const save = useMutation({
    mutationFn: (answers: Record<number, string>) =>
      api(`/api/projects/${projectId}/answers`, { method: "PUT", body: JSON.stringify({ answers }) }),
    onSuccess: () => { refresh(); setSaved(`All changes saved · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`); },
    onError: (e: Error) => setSaved(`Couldn't save: ${e.message}. Your answers are still here; we'll retry when you make a change.`),
  });

  // Autosave: one second after the last change, send only the answers that changed.
  const changed = useRef(new Set<number>());
  const edit = (id: number, value: string) => {
    changed.current.add(id);
    setSaved("Saving…");
    setDraft((d) => ({ ...d, [id]: value }));
  };
  useEffect(() => {
    if (changed.current.size === 0) return;
    const t = setTimeout(() => {
      const answers = Object.fromEntries([...changed.current].map((id) => [id, draft[id] ?? ""]));
      changed.current.clear();
      // On failure, queue them again so the next change retries them
      save.mutate(answers, { onError: () => Object.keys(answers).forEach((id) => changed.current.add(Number(id))) });
    }, 1000);
    return () => clearTimeout(t);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving the tab or page within that second still saves the last change.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    const flush = () => {
      if (changed.current.size === 0) return;
      const answers = Object.fromEntries([...changed.current].map((id) => [id, draftRef.current[id] ?? ""]));
      changed.current.clear();
      fetch(`/api/projects/${projectId}/answers`, {
        method: "PUT", credentials: "include", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }),
      });
    };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, [projectId]);
  const add = useMutation({
    mutationFn: () => api(`/api/projects/${projectId}/questions`, { method: "POST", body: JSON.stringify({ section: newSection, questions: newQuestions }) }),
    onSuccess: () => { refresh(); setNewQuestions(""); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/projects/${projectId}/questions/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });

  const answered = questions.filter((q) => q.answer).length;
  const input = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{answered} of {questions.length} answered</p>
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? "The client answers these in their portal. You can also fill answers in for them. Changes save automatically."
              : "Every question is optional. Skip anything you're not sure about and come back any time. Your answers save automatically."}
          </p>
        </div>
        {saved && <span className="text-xs text-muted-foreground" role="status" aria-live="polite">{saved}</span>}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading questions…</p>}
      {!isLoading && questions.length === 0 && !isAdmin && (
        <p className="text-sm text-muted-foreground">No questions for you yet. We'll add them here when we need information from you.</p>
      )}

      {sections.map(([section, qs]) => (
        <div key={section} className="glass rounded-2xl p-5 sm:p-6">
          <h3 className="font-semibold mb-4">{section}</h3>
          <div className="space-y-4">
            {qs.map((q) => (
              <div key={q.id}>
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <label htmlFor={`q-${q.id}`} className="text-sm font-medium">{q.question} <span className="text-xs font-normal text-muted-foreground">(optional)</span></label>
                  {isAdmin && (
                    <button type="button" onClick={() => remove.mutate(q.id)} aria-label="Delete question"
                      className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                {q.options && q.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {q.options.map((opt) => {
                      const on = parts(draft[q.id] ?? "").includes(opt);
                      return (
                        <button key={opt} type="button" aria-pressed={on}
                          onClick={() => edit(q.id, toggleOption(draft[q.id] ?? "", opt))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/80 hover:bg-secondary"}`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
                <textarea id={`q-${q.id}`} rows={2} value={draft[q.id] ?? ""} className={`${input} resize-y`}
                  placeholder={q.options?.length ? "Pick one or more above, or type your own answer" : "Your answer"}
                  onChange={(e) => edit(q.id, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {isAdmin && (
        <form className="glass rounded-2xl p-5 space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <h3 className="font-semibold text-sm">Add questions</h3>
          <input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="Section, e.g. Systems" className={input} />
          <textarea value={newQuestions} onChange={(e) => setNewQuestions(e.target.value)} rows={4} placeholder={"One question per line. Add answer options after | \ne.g. Preferred voice? | Female | Male | No preference"} className={`${input} resize-y`} />
          <p className="text-xs text-muted-foreground">Options become buttons the client can click. Avoid using ; inside an option.</p>
          <button type="submit" disabled={add.isPending || !newQuestions.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {add.isPending ? "Adding…" : "Add questions"}
          </button>
        </form>
      )}
    </div>
  );
}
