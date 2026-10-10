import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminSummaryQueryKey, getListInvoicesQueryKey,
  useCreateInvoice, useUpdateInvoice,
  type Invoice, type InvoiceInputStatus,
} from "@workspace/api-client-react";
import { formatMoney, type Currency } from "@/lib/money";

type ClientOpt = { id: number; businessName: string; isDemo?: boolean };
type ProjectOpt = { id: number; clientId: number; projectName: string };

const INPUT = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50";
const LABEL = "block text-xs font-medium text-muted-foreground mb-1.5";

function useRefreshInvoices() {
  const qc = useQueryClient();
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() }),
    qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() }),
  ]);
}

// INV-2026-006: next number after the highest one used this year
function nextInvoiceNumber(existing: { invoiceNumber: string }[]) {
  const year = new Date().getFullYear();
  const max = existing.reduce((m, i) => {
    const hit = new RegExp(`^INV-${year}-(\\d+)$`).exec(i.invoiceNumber);
    return hit ? Math.max(m, Number(hit[1])) : m;
  }, 0);
  return `INV-${year}-${String(max + 1).padStart(3, "0")}`;
}

function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function NewInvoiceForm({ clients, projects, invoices, onDone }: {
  clients: ClientOpt[]; projects: ProjectOpt[]; invoices: Invoice[]; onDone: () => void;
}) {
  const create = useCreateInvoice();
  const refresh = useRefreshInvoices();
  const realClients = clients.filter((c) => !c.isDemo);
  const [clientId, setClientId] = useState(String(realClients[0]?.id ?? clients[0]?.id ?? ""));
  const clientProjects = useMemo(() => projects.filter((p) => String(p.clientId) === clientId), [projects, clientId]);
  const [projectId, setProjectId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(() => nextInvoiceNumber(invoices));
  const [currency, setCurrency] = useState<Currency>("INR");
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("0");
  const [dueDate, setDueDate] = useState(inDays(7));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const totalN = parseFloat(total) || 0;
  const paidN = parseFloat(paid) || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!(totalN > 0)) return setError("Enter an amount more than 0.");
    if (paidN < 0 || paidN > totalN) return setError("Already paid must be between 0 and the total.");
    try {
      await create.mutateAsync({
        data: {
          clientId: Number(clientId),
          projectId: projectId ? Number(projectId) : (clientProjects.length === 1 ? clientProjects[0].id : null),
          invoiceNumber: invoiceNumber.trim(),
          currency,
          totalAmount: totalN,
          paidAmount: paidN,
          // The server works these out again from the amounts and date
          dueAmount: Math.max(0, totalN - paidN),
          status: (paidN >= totalN ? "paid" : paidN > 0 ? "partial" : "due") as InvoiceInputStatus,
          dueDate,
          notes: notes.trim() || null,
        },
      });
      await refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the invoice");
    }
  }

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-5 sm:p-6 mb-6 space-y-4">
      <div>
        <h3 className="font-semibold text-sm">New invoice</h3>
        <p className="text-xs text-muted-foreground mt-0.5">The client sees it in their portal under Invoices as soon as you create it.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={LABEL}>Client *</span>
          <select required value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(""); }} className={INPUT}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}{c.isDemo ? " · DEMO" : ""}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Project</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={INPUT}>
            <option value="">{clientProjects.length === 1 ? clientProjects[0].projectName : "No specific project"}</option>
            {clientProjects.length > 1 && clientProjects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Invoice number *</span>
          <input required value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={`${INPUT} font-mono`} />
        </label>
        <label className="block">
          <span className={LABEL}>Due date *</span>
          <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={INPUT} />
        </label>
        <div className="grid grid-cols-[6.5rem_1fr] gap-2">
          <label className="block">
            <span className={LABEL}>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={INPUT}>
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>Amount *</span>
            <input required inputMode="decimal" type="number" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 75000" className={INPUT} />
          </label>
        </div>
        <label className="block">
          <span className={LABEL}>Already paid</span>
          <input inputMode="decimal" type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} className={INPUT} />
        </label>
        <label className="block sm:col-span-2">
          <span className={LABEL}>What it's for (the client sees this)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Payment 1: 50% of the setup fee (advance)" className={INPUT} />
        </label>
      </div>
      {totalN > 0 && (
        <p className="text-xs text-muted-foreground">
          Client will see: total <b className="text-foreground">{formatMoney(totalN, currency)}</b>, paid {formatMoney(paidN, currency)}, balance <b className="text-foreground">{formatMoney(Math.max(0, totalN - paidN), currency)}</b>, due {dueDate}.
        </p>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={create.isPending} className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {create.isPending ? "Creating…" : "Create invoice"}
        </button>
        <button type="button" onClick={onDone} className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary">Cancel</button>
      </div>
    </form>
  );
}

// In the invoice table: add a payment (part or full); balance and status update by themselves.
export function RecordPayment({ invoice }: { invoice: Invoice }) {
  const update = useUpdateInvoice();
  const refresh = useRefreshInvoices();
  const due = Number(invoice.dueAmount);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(due));
  const [error, setError] = useState("");

  if (due <= 0) return <span className="text-xs text-muted-foreground">Paid in full</span>;

  async function save(value: number) {
    setError("");
    if (!(value > 0) || value > due) return setError(`Enter 1 to ${formatMoney(due, invoice.currency)}`);
    try {
      await update.mutateAsync({ id: invoice.id, data: { paidAmount: Number(invoice.paidAmount) + value } });
      await refresh();
      setOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't save"); }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => { setAmount(String(due)); setOpen(true); }}
        className="px-3 py-1.5 bg-primary/15 text-primary rounded-lg text-xs font-semibold hover:bg-primary/25 whitespace-nowrap">
        Record payment
      </button>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(parseFloat(amount)); }} className="flex flex-col gap-1.5 min-w-[13rem]">
      <div className="flex gap-1.5">
        <input autoFocus inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
          aria-label={`Payment received for ${invoice.invoiceNumber}`} className="w-28 bg-background border border-border rounded-lg px-2 py-1.5 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <button type="submit" disabled={update.isPending} className="px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">
          {update.isPending ? "…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-2 py-1.5 border border-border rounded-lg text-xs">Cancel</button>
      </div>
      <p className="text-[11px] text-muted-foreground">Balance {formatMoney(due, invoice.currency)}. Enter the amount received.</p>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </form>
  );
}

// Fix an invoice's number, amount, currency, due date or description, or delete it.
export function EditInvoiceForm({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const update = useUpdateInvoice();
  const refresh = useRefreshInvoices();
  const [form, setForm] = useState({
    invoiceNumber: invoice.invoiceNumber,
    currency: (invoice.currency ?? "USD") as Currency,
    total: String(invoice.totalAmount),
    dueDate: invoice.dueDate,
    notes: invoice.notes ?? "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const paid = Number(invoice.paidAmount);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const total = parseFloat(form.total);
    if (!(total > 0)) return setError("Enter an amount more than 0.");
    if (total < paid) return setError(`The total can't be less than what's already paid (${formatMoney(paid, form.currency)}).`);
    try {
      await update.mutateAsync({ id: invoice.id, data: { invoiceNumber: form.invoiceNumber.trim(), currency: form.currency, totalAmount: total, dueDate: form.dueDate, notes: form.notes.trim() || null } });
      await refresh();
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't save"); }
  }

  async function remove() {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't delete");
      await refresh();
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't delete"); }
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_1fr_1fr] gap-3 items-end">
      <label className="block"><span className={LABEL}>Invoice number</span>
        <input required value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} className={`${INPUT} font-mono`} /></label>
      <label className="block"><span className={LABEL}>Currency</span>
        <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))} className={INPUT}>
          <option value="INR">₹ INR</option><option value="USD">$ USD</option>
        </select></label>
      <label className="block"><span className={LABEL}>Amount</span>
        <input required type="number" min="0" step="0.01" inputMode="decimal" value={form.total} onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))} className={INPUT} /></label>
      <label className="block"><span className={LABEL}>Due date</span>
        <input required type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={INPUT} /></label>
      <label className="block sm:col-span-4"><span className={LABEL}>What it's for</span>
        <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={INPUT} /></label>
      {error && <p className="sm:col-span-4 text-sm text-destructive" role="alert">{error}</p>}
      <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={update.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">{update.isPending ? "Saving…" : "Save changes"}</button>
        <button type="button" onClick={onDone} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
        {confirmDelete ? (
          <span className="ml-auto inline-flex items-center gap-2 text-xs">
            Delete {invoice.invoiceNumber}? The client stops seeing it.
            <button type="button" onClick={remove} className="px-3 py-1.5 bg-destructive text-white rounded-lg font-semibold">Delete</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto text-xs text-muted-foreground hover:text-destructive">Delete invoice</button>
        )}
      </div>
    </form>
  );
}
