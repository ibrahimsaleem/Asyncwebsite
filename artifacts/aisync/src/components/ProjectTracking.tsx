import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, MotionConfig } from "framer-motion";
import { getListProjectsQueryKey } from "@workspace/api-client-react";
import { Check, CheckCircle2, ChevronDown, Circle, Pencil, Trash2 } from "lucide-react";

// Timeline, milestone checklist and onboarding questions for one project.
// These endpoints live outside the OpenAPI spec, so they use plain fetch.

type Update = { id: number; message: string; createdAt: string };
type Milestone = { id: number; title: string; position: number; doneAt: string | null };
type Question = { id: number; section: string; question: string; options: string[] | null; answer: string | null; answeredAt: string | null };

// The saved answer is "chosen options; typed note", e.g. "Tamil; Telugu; also Urdu at 2 clinics".
// Chosen options always come first, so the note box only ever shows what the client typed.
const SEP = "; ";
function splitAnswer(answer: string, options: string[]) {
  const ps = answer ? answer.split(SEP) : [];
  let i = 0;
  while (i < ps.length && options.includes(ps[i].trim())) i++;
  return { chosen: ps.slice(0, i).map((p) => p.trim()), note: ps.slice(i).join(SEP) };
}
const joinAnswer = (chosen: string[], note: string) => [...chosen, ...(note ? [note] : [])].join(SEP);
// "Pick all that apply" / "Pick 4" questions allow several answers; the rest allow one.
const isMulti = (q: Question) => /pick (all|\d)/i.test(q.question);
// "Pick 4" caps how many can be chosen; "Pick all that apply" has no cap
const maxPicks = (q: Question) => Number(/pick (\d+)/i.exec(q.question)?.[1]) || Infinity;
function toggleOption(q: Question, answer: string, option: string) {
  const options = q.options ?? [];
  const { chosen, note } = splitAnswer(answer, options);
  const on = chosen.includes(option);
  const next = isMulti(q)
    ? (on ? chosen.filter((c) => c !== option)
      : chosen.length >= maxPicks(q) ? chosen // at the limit: ignore until one is unticked
      : options.filter((o) => o === option || chosen.includes(o)))
    : (on ? [] : [option]);
  return joinAnswer(next, note);
}

// One colour per section so the form is easy to scan. Full class names so Tailwind keeps them.
const PALETTE = [
  { header: "bg-sky-500/10",     badge: "bg-sky-500/20 text-sky-300",         pill: "border-sky-400/30 text-sky-200 hover:bg-sky-500/10",         chipOn: "bg-sky-500 border-sky-400 text-white focus-visible:ring-sky-400",         chipOff: "border-sky-400/30 text-sky-100 hover:bg-sky-500/15 focus-visible:ring-sky-400",         answered: "border-sky-400/40 bg-sky-500/5" },
  { header: "bg-violet-500/10",  badge: "bg-violet-500/20 text-violet-300",   pill: "border-violet-400/30 text-violet-200 hover:bg-violet-500/10", chipOn: "bg-violet-500 border-violet-400 text-white focus-visible:ring-violet-400", chipOff: "border-violet-400/30 text-violet-100 hover:bg-violet-500/15 focus-visible:ring-violet-400", answered: "border-violet-400/40 bg-violet-500/5" },
  { header: "bg-emerald-500/10", badge: "bg-emerald-500/20 text-emerald-300", pill: "border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10", chipOn: "bg-emerald-600 border-emerald-400 text-white focus-visible:ring-emerald-400", chipOff: "border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/15 focus-visible:ring-emerald-400", answered: "border-emerald-400/40 bg-emerald-500/5" },
  { header: "bg-amber-500/10",   badge: "bg-amber-500/20 text-amber-300",     pill: "border-amber-400/30 text-amber-200 hover:bg-amber-500/10",     chipOn: "bg-amber-500 border-amber-300 text-black focus-visible:ring-amber-400",     chipOff: "border-amber-400/30 text-amber-100 hover:bg-amber-500/15 focus-visible:ring-amber-400",     answered: "border-amber-400/40 bg-amber-500/5" },
  { header: "bg-rose-500/10",    badge: "bg-rose-500/20 text-rose-300",       pill: "border-rose-400/30 text-rose-200 hover:bg-rose-500/10",       chipOn: "bg-rose-500 border-rose-400 text-white focus-visible:ring-rose-400",       chipOff: "border-rose-400/30 text-rose-100 hover:bg-rose-500/15 focus-visible:ring-rose-400",       answered: "border-rose-400/40 bg-rose-500/5" },
  { header: "bg-cyan-500/10",    badge: "bg-cyan-500/20 text-cyan-300",       pill: "border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10",       chipOn: "bg-cyan-500 border-cyan-300 text-black focus-visible:ring-cyan-400",       chipOff: "border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/15 focus-visible:ring-cyan-400",       answered: "border-cyan-400/40 bg-cyan-500/5" },
  { header: "bg-orange-500/10",  badge: "bg-orange-500/20 text-orange-300",   pill: "border-orange-400/30 text-orange-200 hover:bg-orange-500/10", chipOn: "bg-orange-500 border-orange-300 text-black focus-visible:ring-orange-400", chipOff: "border-orange-400/30 text-orange-100 hover:bg-orange-500/15 focus-visible:ring-orange-400", answered: "border-orange-400/40 bg-orange-500/5" },
  { header: "bg-indigo-500/10",  badge: "bg-indigo-500/20 text-indigo-300",   pill: "border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/10", chipOn: "bg-indigo-500 border-indigo-400 text-white focus-visible:ring-indigo-400", chipOff: "border-indigo-400/30 text-indigo-100 hover:bg-indigo-500/15 focus-visible:ring-indigo-400", answered: "border-indigo-400/40 bg-indigo-500/5" },
];

// "A. Calls and volume" → letter "A", title "Calls and volume"
function splitSection(section: string, i: number) {
  const m = section.match(/^([A-Z])\.\s*(.+)$/);
  return m ? { letter: m[1], title: m[2] } : { letter: String.fromCharCode(65 + (i % 26)), title: section };
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
  const refresh = () => qc.invalidateQueries({ queryKey: trackingKey(projectId) });
  const [renaming, setRenaming] = useState<{ id: number; title: string } | null>(null);
  const [newStep, setNewStep] = useState("");
  const rename = useMutation({
    mutationFn: (m: { id: number; title: string }) => api(`/api/projects/${projectId}/milestones/${m.id}`, { method: "PATCH", body: JSON.stringify({ title: m.title }) }),
    onSuccess: () => { refresh(); setRenaming(null); },
  });
  const removeStep = useMutation({
    mutationFn: (id: number) => api(`/api/projects/${projectId}/milestones/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
  const addStep = useMutation({
    mutationFn: () => api(`/api/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify({ title: newStep }) }),
    onSuccess: () => { refresh(); setNewStep(""); },
  });

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
              {isAdmin && renaming?.id === m.id ? (
                <form className="flex gap-2 px-2 py-1" onSubmit={(e) => { e.preventDefault(); if (renaming.title.trim()) rename.mutate(renaming); }}>
                  <input autoFocus value={renaming.title} onChange={(e) => setRenaming({ id: m.id, title: e.target.value })} aria-label="Step name"
                    className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <button type="submit" className="px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold">Save</button>
                  <button type="button" onClick={() => setRenaming(null)} className="px-2 py-1.5 border border-border rounded-lg text-xs">Cancel</button>
                </form>
              ) : isAdmin ? (
                <div className="group flex items-start gap-1">
                  <button type="button" disabled={toggle.isPending} onClick={() => toggle.mutate(m)}
                    className="flex-1 min-w-0 flex items-start gap-3 text-left text-sm rounded-lg px-2 py-1.5 hover:bg-secondary/50 transition-colors">
                    {body}
                  </button>
                  <button type="button" onClick={() => setRenaming({ id: m.id, title: m.title })} aria-label={`Rename ${m.title}`}
                    className="p-1.5 mt-0.5 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => removeStep.mutate(m.id)} aria-label={`Delete ${m.title}`}
                    className="p-1.5 mt-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-sm px-2 py-1.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {isAdmin && (
        <>
          <form className="flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); if (newStep.trim()) addStep.mutate(); }}>
            <input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Add a step, e.g. Pilot review call" aria-label="New step"
              className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <button type="submit" disabled={addStep.isPending || !newStep.trim()} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">Add step</button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">Click a step to tick or untick it. The client sees this list.</p>
        </>
      )}
    </div>
  );
}

export function ProjectTimeline({ projectId, isAdmin }: { projectId: number; isAdmin?: boolean }) {
  const qc = useQueryClient();
  const { data } = useProjectTracking(projectId);
  const updates = data?.updates ?? [];
  const [editing, setEditing] = useState<{ id: number; message: string } | null>(null);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: trackingKey(projectId) }), qc.invalidateQueries({ queryKey: getListProjectsQueryKey() })]);
  const save = useMutation({
    mutationFn: (u: { id: number; message: string }) => api(`/api/projects/${projectId}/updates/${u.id}`, { method: "PATCH", body: JSON.stringify({ message: u.message }) }),
    onSuccess: () => { refresh(); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/projects/${projectId}/updates/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
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
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-2">{when(u.createdAt)}
                {isAdmin && editing?.id !== u.id && (
                  <>
                    <button type="button" onClick={() => setEditing({ id: u.id, message: u.message })} className="text-primary hover:underline">Edit</button>
                    <button type="button" onClick={() => remove.mutate(u.id)} className="hover:text-destructive">Delete</button>
                  </>
                )}
              </p>
              {isAdmin && editing?.id === u.id ? (
                <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (editing.message.trim()) save.mutate(editing); }}>
                  <textarea rows={4} value={editing.message} onChange={(e) => setEditing({ ...editing, message: e.target.value })} aria-label="Update text"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={save.isPending} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">Save</button>
                    <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 border border-border rounded-lg text-xs">Cancel</button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-foreground/90 whitespace-pre-line">{u.message}</p>
              )}
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
  const [open, setOpen] = useState<Set<string> | null>(null);

  // Keep what the user is typing; only fill in questions we haven't seen yet.
  useEffect(() => {
    setDraft((prev) => Object.fromEntries(questions.map((q) => [q.id, prev[q.id] ?? q.answer ?? ""])));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of questions) map.set(q.section, [...(map.get(q.section) ?? []), q]);
    return [...map.entries()];
  }, [questions]);

  // Start with the first section that still has unanswered questions open; the rest collapsed.
  useEffect(() => {
    if (open !== null || sections.length === 0) return;
    const first = sections.find(([, qs]) => qs.some((q) => !q.answer)) ?? sections[0];
    setOpen(new Set([first[0]]));
  }, [sections]); // eslint-disable-line react-hooks/exhaustive-deps
  const isOpen = (section: string) => open?.has(section) ?? false;
  const toggleSection = (section: string, force?: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (force ?? !next.has(section)) next.add(section); else next.delete(section);
      return next;
    });
  const allOpen = sections.length > 0 && sections.every(([s]) => isOpen(s));

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
  const [editingQ, setEditingQ] = useState<{ id: number; section: string; question: string; options: string } | null>(null);
  const saveQuestion = useMutation({
    mutationFn: (q: { id: number; section: string; question: string; options: string }) =>
      api(`/api/projects/${projectId}/questions/${q.id}`, { method: "PATCH", body: JSON.stringify({ section: q.section, question: q.question, options: q.options }) }),
    onSuccess: () => { refresh(); setEditingQ(null); },
  });

  const hasAnswer = (q: Question) => (draft[q.id] ?? q.answer ?? "").trim().length > 0;
  const answered = questions.filter(hasAnswer).length;
  const pct = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const input = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <MotionConfig reducedMotion="user">
    <div className="space-y-5">
      {/* Progress + autosave, stays in view while scrolling */}
      <div className="glass rounded-2xl p-5 md:sticky md:top-3 z-20">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none">{pct}%<span className="text-sm font-medium text-muted-foreground ml-2">{answered} of {questions.length} answered</span></p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {isAdmin
                ? "The client answers these in their portal. You can also fill answers in for them. Changes save automatically."
                : "Every question is optional. Tap the answers that fit, skip anything you're not sure about. Everything saves automatically."}
            </p>
          </div>
          {saved && (
            <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {saved.startsWith("All") && <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden />}{saved}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400"
            initial={false} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
        {sections.length > 1 && (
          <div className="flex items-center gap-2 mt-4">
          <nav aria-label="Jump to section" className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 flex-1 min-w-0">
            {sections.map(([section, qs], i) => {
              const c = PALETTE[i % PALETTE.length];
              const { letter, title } = splitSection(section, i);
              const done = qs.filter(hasAnswer).length;
              return (
                <a key={section} href={`#sec-${i}`} onClick={() => toggleSection(section, true)}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${c.pill}`}>
                  <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold ${done === qs.length ? "bg-emerald-500 text-white" : c.badge}`}>
                    {done === qs.length ? <Check className="w-3 h-3" aria-hidden /> : letter}
                  </span>
                  <span className="max-w-[9rem] truncate">{title}</span>
                  <span className="tabular-nums opacity-70">{done}/{qs.length}</span>
                </a>
              );
            })}
          </nav>
          <button type="button" onClick={() => setOpen(allOpen ? new Set() : new Set(sections.map(([s]) => s)))}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 mb-1 rounded-full border border-border hover:bg-secondary transition-colors">
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
          </div>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading questions…</p>}
      {!isLoading && questions.length === 0 && !isAdmin && (
        <p className="text-sm text-muted-foreground">No questions for you yet. We'll add them here when we need information from you.</p>
      )}

      {(() => { let n = 0; return sections.map(([section, qs], i) => {
        const c = PALETTE[i % PALETTE.length];
        const { letter, title } = splitSection(section, i);
        const done = qs.filter(hasAnswer).length;
        const firstN = n;
        n += qs.length; // keep numbering right even when a section is collapsed
        const expanded = isOpen(section);
        return (
          <section key={section} id={`sec-${i}`} className="glass rounded-2xl overflow-hidden scroll-mt-48">
            <h3>
              <button type="button" onClick={() => toggleSection(section)} aria-expanded={expanded} aria-controls={`sec-body-${i}`}
                className={`w-full flex items-center gap-3 px-5 sm:px-6 py-4 text-left transition-colors hover:brightness-125 ${c.header}`}>
                <span className={`w-9 h-9 rounded-xl grid place-items-center text-sm font-bold shrink-0 ${c.badge}`}>{letter}</span>
                <span className="font-semibold flex-1 min-w-0">{title}</span>
                <span className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full ${done === qs.length ? "bg-emerald-500/20 text-emerald-300" : "bg-black/20 text-foreground/80"}`}>
                  {done}/{qs.length}
                </span>
                <ChevronDown aria-hidden className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
              </button>
            </h3>
            {expanded && (
            <motion.div id={`sec-body-${i}`} className="p-4 sm:p-5 space-y-3"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: "easeOut" }}>
              {qs.map((q, j) => {
                const num = firstN + j + 1;
                const ok = hasAnswer(q);
                return (
                  <div key={q.id} className={`rounded-xl border p-4 transition-colors ${ok ? c.answered : "border-border/60 bg-background/30"}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`mt-0.5 w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0 transition-colors ${ok ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                        {ok ? <Check className="w-3.5 h-3.5" aria-label="Answered" /> : num}
                      </span>
                      <label htmlFor={`q-${q.id}`} className="text-sm font-medium leading-snug flex-1">{q.question}</label>
                      {isAdmin && (
                        <>
                          <button type="button" onClick={() => setEditingQ({ id: q.id, section: q.section, question: q.question, options: (q.options ?? []).join(" | ") })} aria-label="Edit question"
                            className="p-1 -m-1 text-muted-foreground hover:text-foreground shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => remove.mutate(q.id)} aria-label="Delete question"
                            className="p-1 -m-1 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                    {isAdmin && editingQ?.id === q.id && (
                      <form className="mb-3 sm:pl-9 space-y-2" onSubmit={(e) => { e.preventDefault(); if (editingQ.question.trim()) saveQuestion.mutate(editingQ); }}>
                        <input value={editingQ.question} onChange={(e) => setEditingQ({ ...editingQ, question: e.target.value })} aria-label="Question" className={input} />
                        <div className="grid sm:grid-cols-[12rem_1fr] gap-2">
                          <input value={editingQ.section} onChange={(e) => setEditingQ({ ...editingQ, section: e.target.value })} aria-label="Section" placeholder="Section" className={input} />
                          <input value={editingQ.options} onChange={(e) => setEditingQ({ ...editingQ, options: e.target.value })} aria-label="Answer options" placeholder="Options, separated by |  (leave empty for a text answer)" className={input} />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={saveQuestion.isPending} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">Save question</button>
                          <button type="button" onClick={() => setEditingQ(null)} className="px-3 py-1.5 border border-border rounded-lg text-xs">Cancel</button>
                        </div>
                      </form>
                    )}
                    {q.options && q.options.length > 0 && (
                      <div role="group" aria-label={isMulti(q) ? "Choose one or more" : "Choose one"} className="flex flex-wrap gap-2 mb-3 sm:pl-9">
                        {q.options.map((opt) => {
                          const chosen = splitAnswer(draft[q.id] ?? "", q.options ?? []).chosen;
                          const on = chosen.includes(opt);
                          const full = !on && isMulti(q) && chosen.length >= maxPicks(q);
                          return (
                            <motion.button key={opt} type="button" aria-pressed={on} disabled={full} whileTap={full ? undefined : { scale: 0.95 }}
                              onClick={() => edit(q.id, toggleOption(q, draft[q.id] ?? "", opt))}
                              className={`inline-flex items-center gap-1.5 min-h-11 px-4 py-2 text-left rounded-full text-sm font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-35 disabled:cursor-not-allowed ${on ? c.chipOn : c.chipOff}`}>
                              {on && <Check className="w-3.5 h-3.5" aria-hidden />}
                              {opt}
                            </motion.button>
                          );
                        })}
                        {Number.isFinite(maxPicks(q)) && (
                          <p className="basis-full text-xs text-muted-foreground" aria-live="polite">
                            {splitAnswer(draft[q.id] ?? "", q.options ?? []).chosen.length} of {maxPicks(q)} picked
                            {splitAnswer(draft[q.id] ?? "", q.options ?? []).chosen.length >= maxPicks(q) ? ". Untick one to change your choice." : ""}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="sm:pl-9">
                      {q.options?.length ? (
                        <textarea id={`q-${q.id}`} rows={1} className={`${input} resize-y`}
                          aria-label={`${q.question} (note)`} placeholder="Add a note (optional)"
                          value={splitAnswer(draft[q.id] ?? "", q.options).note}
                          onChange={(e) => edit(q.id, joinAnswer(splitAnswer(draft[q.id] ?? "", q.options ?? []).chosen, e.target.value))} />
                      ) : (
                        <textarea id={`q-${q.id}`} rows={2} className={`${input} resize-y`} placeholder="Type your answer (optional)"
                          value={draft[q.id] ?? ""} onChange={(e) => edit(q.id, e.target.value)} />
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
            )}
          </section>
        );
      }); })()}

      {isAdmin && (
        <form className="glass rounded-2xl p-5 space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <h3 className="font-semibold text-sm">Add questions</h3>
          <input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="Section, e.g. Systems" className={input} />
          <textarea value={newQuestions} onChange={(e) => setNewQuestions(e.target.value)} rows={4} placeholder={"One question per line. Add answer options after | \ne.g. Preferred voice? | Female | Male | No preference"} className={`${input} resize-y`} />
          <p className="text-xs text-muted-foreground">Options become buttons the client can click. Add “Pick all that apply” (or “Pick 3”) to a question to allow several answers; otherwise one. Avoid ; inside an option.</p>
          <button type="submit" disabled={add.isPending || !newQuestions.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {add.isPending ? "Adding…" : "Add questions"}
          </button>
        </form>
      )}
    </div>
    </MotionConfig>
  );
}
