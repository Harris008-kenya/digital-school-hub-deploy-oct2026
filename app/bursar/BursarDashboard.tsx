"use client";
import styles from "./BursarDashboard.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";

type AnyRecord = Record<string, any>;

export default function BursarDashboard() {
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("overview");

  const [feeName, setFeeName] = useState("");
  const [feeDescription, setFeeDescription] = useState("");

  const [structureGrade, setStructureGrade] = useState("");
  const [structureTerm, setStructureTerm] = useState("");
  const [structureFeeType, setStructureFeeType] = useState("");
  const [structureAmount, setStructureAmount] = useState("");
  const [structureReason, setStructureReason] = useState("");

  const [paymentStudent, setPaymentStudent] = useState("");
  const [paymentGrade, setPaymentGrade] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("");
  const [paymentFeeType, setPaymentFeeType] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MPESA");
  const [mpesaReference, setMpesaReference] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState("");

  const [search, setSearch] = useState("");
  const [balanceTermId, setBalanceTermId] = useState("");
  const [balanceGradeId, setBalanceGradeId] = useState("");
  const [correctionPaymentId, setCorrectionPaymentId] = useState("");
  const [correctionAmount, setCorrectionAmount] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bursar", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load bursar records.");
      }

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bursar records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(
    method: "POST" | "PATCH",
    body: AnyRecord,
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/bursar", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "The operation failed.");
      }

      setMessage("Saved successfully.");
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "The operation failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const students = data?.students ?? [];
  const grades = data?.grades ?? [];
  const terms = data?.terms ?? [];
  const feeTypes = data?.feeTypes ?? [];
  const structures = data?.structures ?? [];
  const payments = data?.payments ?? [];

  const activeFeeTypes = feeTypes.filter((x: AnyRecord) => x.isActive);

  const filteredStudents = students.filter((student: AnyRecord) => {
    const q = search.toLowerCase();
    return (
      student.name.toLowerCase().includes(q) ||
      String(student.admissionNumber ?? "").toLowerCase().includes(q)
    );
  });

  const totalCollected = payments.reduce(
    (sum: number, p: AnyRecord) => sum + Number(p.amount),
    0,
  );

  const expectedTotal = structures.reduce(
    (sum: number, structure: AnyRecord) => {
      const learnerCount = students.filter(
        (student: AnyRecord) => student.gradeId === structure.gradeId,
      ).length;
      return sum + Number(structure.amount) * learnerCount;
    },
    0,
  );

  useEffect(() => {
    if (!terms.length) {
      if (balanceTermId) setBalanceTermId("");
      return;
    }

    if (!balanceTermId || !terms.some((term: AnyRecord) => term.id === balanceTermId)) {
      setBalanceTermId(terms[0].id);
    }
  }, [terms, balanceTermId]);

  const balanceRows = useMemo(() => {
    return students.map((student: AnyRecord) => {
      const studentStructures = structures.filter(
        (structure: AnyRecord) =>
          structure.gradeId === student.gradeId &&
          structure.termId === balanceTermId,
      );

      const expected = studentStructures.reduce(
        (sum: number, structure: AnyRecord) =>
          sum + Number(structure.amount),
        0,
      );

      const paid = payments
        .filter(
          (payment: AnyRecord) =>
            payment.studentId === student.id &&
            payment.gradeId === student.gradeId &&
            payment.termId === balanceTermId,
        )
        .reduce(
          (sum: number, payment: AnyRecord) => sum + Number(payment.amount),
          0,
        );

      return { ...student, expected, paid, balance: expected - paid };
    });
  }, [students, structures, payments, balanceTermId]);

  const money = (amount: number | string) =>
    `KSh ${Number(amount).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  function termLabel(term: AnyRecord) {
    return `${term.name} ${term.academicYear?.year ?? ""}`.trim();
  }

  if (loading && !data) {
    return <main className="mx-auto max-w-7xl p-6">Loading bursar portal…</main>;
  }

  return (
    <main className={`${styles.portal} mx-auto max-w-7xl space-y-6 p-4 md:p-8`}>
      <header className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Digital School Hub
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Bursar Portal</h1>
        <p className="mt-2 text-slate-600">
          {data?.school?.name ?? "School finance management"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Record payments, manage fee structures, view balances and review receipts.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
          {message}
        </div>
      )}

      <nav className="flex flex-wrap gap-2">
        {[
          ["overview", "Overview"],
          ["fees", "Fee structures"],
          ["payments", "Record payment"],
          ["balances", "Learner balances"],
          ["receipts", "Receipts & reports"],
          ["corrections", "Corrections & audit"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              tab === id
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Learners", students.length],
            ["Active fee types", activeFeeTypes.length],
            ["Fee structures", structures.length],
            ["Payments recorded", payments.length],
            ["Total collected", money(totalCollected)],
            ["Estimated fees configured", money(expectedTotal)],
            ["Grades", grades.length],
            ["Terms", terms.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 break-words text-2xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
          <div className="rounded-xl border bg-white p-5 sm:col-span-2 lg:col-span-4">
            <h2 className="font-bold text-slate-900">Getting started</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600">
              <li>Create fee types, such as Tuition, Transport or Meals.</li>
              <li>Set charges for each grade, term and fee type.</li>
              <li>Record each payment and issue the generated receipt number.</li>
              <li>Review learner balances and collections reports.</li>
            </ol>
          </div>
        </section>
      )}

      {tab === "fees" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <form
            className="space-y-4 rounded-xl border bg-white p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await send("POST", {
                action: "fee-type",
                name: feeName,
                description: feeDescription,
              })) {
                setFeeName("");
                setFeeDescription("");
              }
            }}
          >
            <h2 className="text-lg font-bold">Create a fee type</h2>
            <label className="block text-sm font-medium">
              Fee type name
              <input required value={feeName} onChange={(e) => setFeeName(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2" placeholder="e.g. Tuition" />
            </label>
            <label className="block text-sm font-medium">
              Description (optional)
              <input value={feeDescription} onChange={(e) => setFeeDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2" placeholder="Description" />
            </label>
            <button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Create fee type"}
            </button>
            <div className="border-t pt-4">
              <h3 className="font-semibold">Existing fee types</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {feeTypes.map((fee: AnyRecord) => (
                  <li key={fee.id} className="flex justify-between gap-3 rounded border p-2">
                    <span>{fee.name}{fee.description ? ` — ${fee.description}` : ""}</span>
                    <span className={fee.isActive ? "text-green-700" : "text-slate-400"}>
                      {fee.isActive ? "Active" : "Inactive"}
                    </span>
                  </li>
                ))}
                {!feeTypes.length && <li className="text-slate-500">No fee types created yet.</li>}
              </ul>
            </div>
          </form>

          <form
            className="space-y-4 rounded-xl border bg-white p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await send("POST", {
                action: "fee-structure",
                gradeId: structureGrade,
                termId: structureTerm,
                feeTypeId: structureFeeType,
                amount: structureAmount,
                reason: structureReason,
              })) {
                setStructureAmount("");
                setStructureReason("");
              }
            }}
          >
            <h2 className="text-lg font-bold">Set a grade and term charge</h2>
            <label className="block text-sm font-medium">
              Grade
              <select required value={structureGrade} onChange={(e) => setStructureGrade(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2">
                <option value="">Select grade</option>
                {grades.map((g: AnyRecord) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Term
              <select required value={structureTerm} onChange={(e) => setStructureTerm(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2">
                <option value="">Select term</option>
                {terms.map((t: AnyRecord) => <option key={t.id} value={t.id}>{termLabel(t)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Fee type
              <select required value={structureFeeType} onChange={(e) => setStructureFeeType(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2">
                <option value="">Select fee type</option>
                {activeFeeTypes.map((f: AnyRecord) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Amount (KSh)
              <input required min="0.01" step="0.01" type="number" value={structureAmount}
                onChange={(e) => setStructureAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <label className="block text-sm font-medium">
              Reason (required when changing an existing charge)
              <input value={structureReason} onChange={(e) => setStructureReason(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2" placeholder="Reason for changing a charge" />
            </label>
            <button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save fee structure"}
            </button>
            <p className="text-xs text-slate-500">
              Existing charges are updated only with a reason, and the previous amount is recorded in the revision history.
            </p>
          </form>

          <div className="overflow-x-auto rounded-xl border bg-white p-5 lg:col-span-2">
            <h2 className="mb-3 text-lg font-bold">Configured charges</h2>
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead><tr className="border-b bg-slate-50">
                <th className="p-3">Grade</th><th className="p-3">Term</th>
                <th className="p-3">Fee type</th><th className="p-3 text-right">Amount</th>
              </tr></thead>
              <tbody>
                {structures.map((s: AnyRecord) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-3">{s.grade.name}</td>
                    <td className="p-3">{termLabel(s.term)}</td>
                    <td className="p-3">{s.feeType.name}</td>
                    <td className="p-3 text-right">{money(s.amount)}</td>
                  </tr>
                ))}
                {!structures.length && <tr><td className="p-3 text-slate-500" colSpan={4}>No charges configured yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "payments" && (
        <form
          className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await send("POST", {
              action: "payment",
              studentId: paymentStudent,
              gradeId: paymentGrade,
              termId: paymentTerm,
              feeTypeId: paymentFeeType,
              amount: paymentAmount,
              paymentMethod,
              mpesaReference,
              phoneNumber,
              paidAt,
              notes: paymentNotes,
            })) {
              setPaymentAmount("");
              setMpesaReference("");
              setPhoneNumber("");
              setPaymentNotes("");
            }
          }}
        >
          <h2 className="text-lg font-bold md:col-span-2">Record a learner payment</h2>
          <label className="text-sm font-medium">
            Learner
            <select required value={paymentStudent} onChange={(e) => {
              const studentId = e.target.value;
              setPaymentStudent(studentId);
              const student = students.find((s: AnyRecord) => s.id === studentId);
              if (student) setPaymentGrade(student.gradeId);
            }} className="mt-1 w-full rounded-lg border p-2">
              <option value="">Select learner</option>
              {students.map((s: AnyRecord) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.admissionNumber ? ` (${s.admissionNumber})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Grade
            <select required value={paymentGrade} onChange={(e) => setPaymentGrade(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2">
              <option value="">Select grade</option>
              {grades.map((g: AnyRecord) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Term
            <select required value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2">
              <option value="">Select term</option>
              {terms.map((t: AnyRecord) => <option key={t.id} value={t.id}>{termLabel(t)}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Fee type
            <select required value={paymentFeeType} onChange={(e) => setPaymentFeeType(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2">
              <option value="">Select fee type</option>
              {activeFeeTypes.map((f: AnyRecord) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Amount received (KSh)
            <input required min="0.01" step="0.01" type="number" value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2" />
          </label>
          <label className="text-sm font-medium">
            Payment method
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2">
              <option value="MPESA">M-PESA</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          {paymentMethod === "MPESA" && (
            <label className="text-sm font-medium">
              M-PESA transaction reference
              <input required value={mpesaReference} onChange={(e) => setMpesaReference(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-lg border p-2" />
            </label>
          )}
          <label className="text-sm font-medium">
            Payer phone number (optional)
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2" placeholder="07…" />
          </label>
          <label className="text-sm font-medium">
            Date paid
            <input required type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2" />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Notes (optional)
            <textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2" rows={2} />
          </label>
          <div className="md:col-span-2">
            <button disabled={saving} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">
              {saving ? "Saving payment…" : "Record payment and generate receipt"}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Duplicate M-PESA references are rejected. A successful payment receives a unique DSH receipt number.
            </p>
          </div>
        </form>
      )}

      {tab === "balances" && (
        <section className="overflow-x-auto rounded-xl border bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Learner fee accounts</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border p-2" placeholder="Search learner or admission number" />
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Academic year and term
              <select
                value={balanceTermId}
                onChange={(e) => setBalanceTermId(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2"
                required
              >
                <option value="">Select term</option>
                {terms.map((term: AnyRecord) => (
                  <option key={term.id} value={term.id}>{termLabel(term)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Filter by current grade
              <select
                value={balanceGradeId}
                onChange={(e) => setBalanceGradeId(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2"
              >
                <option value="">All current grades</option>
                {grades.map((grade: AnyRecord) => (
                  <option key={grade.id} value={grade.id}>{grade.name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mb-3 text-sm text-slate-500">
            Balances use configured charges and recorded payments for the selected term and each learner's current grade. Historical balances may differ for learners who have changed grades because historical enrolment is not stored here.
          </p>
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead><tr className="border-b bg-slate-50">
              <th className="p-3">Learner</th><th className="p-3">Admission no.</th>
              <th className="p-3">Grade</th><th className="p-3 text-right">Configured fees</th>
              <th className="p-3 text-right">Paid</th><th className="p-3 text-right">Balance</th>
            </tr></thead>
            <tbody>
              {filteredStudents.filter((student: AnyRecord) => !balanceGradeId || student.gradeId === balanceGradeId).map((s: AnyRecord) => {
                const row = balanceRows.find((x: AnyRecord) => x.id === s.id);
                return <tr key={s.id} className="border-b">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.admissionNumber || "—"}</td>
                  <td className="p-3">{s.grade?.name || "—"}</td>
                  <td className="p-3 text-right">{money(row?.expected ?? 0)}</td>
                  <td className="p-3 text-right">{money(row?.paid ?? 0)}</td>
                  <td className={`p-3 text-right font-semibold ${(row?.balance ?? 0) > 0 ? "text-red-700" : "text-green-700"}`}>
                    {money(row?.balance ?? 0)}
                  </td>
                </tr>;
              })}
              {!filteredStudents.length && <tr><td className="p-3 text-slate-500" colSpan={6}>No learners match your search.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {tab === "receipts" && (
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Total collected</p><p className="mt-2 text-2xl font-bold">{money(totalCollected)}</p></div>
            <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Receipts</p><p className="mt-2 text-2xl font-bold">{payments.length}</p></div>
            <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Fee types</p><p className="mt-2 text-2xl font-bold">{feeTypes.length}</p></div>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-white p-5">
            <h2 className="mb-3 text-lg font-bold">Payment receipts</h2>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead><tr className="border-b bg-slate-50">
                <th className="p-3">Receipt</th><th className="p-3">Date</th>
                <th className="p-3">Learner</th><th className="p-3">Grade / term</th>
                <th className="p-3">Fee type</th><th className="p-3">Method / reference</th>
                <th className="p-3 text-right">Amount</th>
              </tr></thead>
              <tbody>
                {payments.map((p: AnyRecord) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-3 font-semibold">{p.receiptNumber}</td>
                    <td className="p-3">{new Date(p.paidAt).toLocaleDateString("en-KE")}</td>
                    <td className="p-3">{p.student.name}</td>
                    <td className="p-3">{p.grade.name} / {termLabel(p.term)}</td>
                    <td className="p-3">{p.feeType.name}</td>
                    <td className="p-3">{p.paymentMethod}{p.mpesaReference ? ` / ${p.mpesaReference}` : ""}</td>
                    <td className="p-3 text-right">{money(p.amount)}</td>
                  </tr>
                ))}
                {!payments.length && <tr><td className="p-3 text-slate-500" colSpan={7}>No payments recorded yet.</td></tr>}
              </tbody>
            </table>
            <button type="button" onClick={() => window.print()}
              className="mt-4 rounded-lg border px-4 py-2 font-semibold">Print this report</button>
          </div>
        </section>
      )}

      {tab === "corrections" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <form className="space-y-4 rounded-xl border bg-white p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!window.confirm("Save this correction? The reason and previous values will be preserved in the audit trail.")) return;
              if (await send("PATCH", {
                paymentId: correctionPaymentId,
                amount: correctionAmount,
                reason: correctionReason,
                notes: correctionNotes,
              })) {
                setCorrectionPaymentId("");
                setCorrectionAmount("");
                setCorrectionReason("");
                setCorrectionNotes("");
              }
            }}>
            <h2 className="text-lg font-bold">Correct a payment amount or note</h2>
            <label className="block text-sm font-medium">
              Payment / receipt
              <select required value={correctionPaymentId} onChange={(e) => {
                setCorrectionPaymentId(e.target.value);
                const p = payments.find((x: AnyRecord) => x.id === e.target.value);
                if (p) {
                  setCorrectionAmount(String(p.amount));
                  setCorrectionNotes(p.notes || "");
                }
              }} className="mt-1 w-full rounded-lg border p-2">
                <option value="">Select payment</option>
                {payments.map((p: AnyRecord) => (
                  <option key={p.id} value={p.id}>{p.receiptNumber} — {p.student.name} — {money(p.amount)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Correct amount (KSh)
              <input required type="number" min="0.01" step="0.01" value={correctionAmount}
                onChange={(e) => setCorrectionAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <label className="block text-sm font-medium">
              Reason for correction
              <textarea required minLength={5} value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2" rows={3} />
            </label>
            <label className="block text-sm font-medium">
              Corrected notes (optional)
              <textarea value={correctionNotes} onChange={(e) => setCorrectionNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2" rows={2} />
            </label>
            <button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save correction"}
            </button>
            <p className="text-xs text-slate-500">
              This correction form changes only the payment amount and notes. It does not change the learner, grade, term, fee type, date or payment reference.
            </p>
          </form>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-bold">Correction audit trail</h2>
            <div className="mt-3 space-y-3">
              {payments.flatMap((p: AnyRecord) =>
                (p.corrections ?? []).map((c: AnyRecord) => (
                  <div key={c.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-semibold">{p.receiptNumber} — {p.student.name}</p>
                    <p className="mt-1">{c.reason}</p>
                    <p className="mt-1 text-slate-500">
                      By {c.correctedBy?.name ?? "Administrator"} · {new Date(c.createdAt).toLocaleString("en-KE")}
                    </p>
                  </div>
                )),
              )}
              {!payments.some((p: AnyRecord) => (p.corrections ?? []).length > 0) && (
                <p className="text-sm text-slate-500">No corrections have been recorded.</p>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>Financial records are restricted to your assigned school.</span>
        <button onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2 font-semibold text-slate-700">
          Refresh records
        </button>
      </footer>
    </main>
  );
}
