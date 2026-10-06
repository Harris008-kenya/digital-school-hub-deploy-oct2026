"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Grade = { id: string; name: string; level: number };
type Subject = { id: string; name: string };
type GradeSubject = { id: string; subject: Subject };
type Term = { id: string; name: string; academicYear: { year: number } };
type Examination = { id: string; name: string; gradeId: string; term: Term; grade: Grade };
type SheetRow = {
  student: { id: string; name: string; admissionNumber: string | null };
  result: { marks: number } | null;
};

export default function ResultsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [setupGradeId, setSetupGradeId] = useState("");
  const [setupSubjects, setSetupSubjects] = useState<GradeSubject[]>([]);
  const [name, setName] = useState("");
  const [termId, setTermId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examinationId, setExaminationId] = useState("");
  const [resultSubjectId, setResultSubjectId] = useState("");
  const [resultSubjects, setResultSubjects] = useState<GradeSubject[]>([]);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedExamination = useMemo(
    () => examinations.find((examination) => examination.id === examinationId),
    [examinations, examinationId]
  );
  const selectedExaminationGradeId = selectedExamination?.gradeId;

  const loadSetup = useCallback(async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch("/api/terms"),
        fetch("/api/grades"),
        fetch("/api/subjects"),
        fetch("/api/examinations"),
      ]);
      const data = await Promise.all(responses.map((response) => response.json()));
      const failed = responses.findIndex((response) => !response.ok);
      if (failed !== -1) throw new Error(data[failed].error || "Could not load examination setup");

      const [termData, gradeData, subjectData, examinationData] = data as [
        Term[], Grade[], Subject[], Examination[],
      ];
      setTerms(termData);
      setGrades(gradeData);
      setSubjects(subjectData);
      setExaminations(examinationData);
      setTermId((current) => current || termData[0]?.id || "");
      setGradeId((current) => current || gradeData[0]?.id || "");
      setSetupGradeId((current) => current || gradeData[0]?.id || "");
      setExaminationId((current) => current || examinationData[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load examination setup");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGradeSubjects = useCallback(async (
    selectedGradeId: string,
    setTarget: (items: GradeSubject[]) => void
  ) => {
    if (!selectedGradeId) {
      setTarget([]);
      return;
    }

    const response = await fetch(`/api/grade-subjects?gradeId=${encodeURIComponent(selectedGradeId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load grade subjects");
    setTarget(data);
  }, []);

  useEffect(() => {
    void loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    void loadGradeSubjects(setupGradeId, setSetupSubjects).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Could not load grade subjects");
    });
  }, [setupGradeId, loadGradeSubjects]);

  useEffect(() => {
    if (!selectedExaminationGradeId) {
      setResultSubjects([]);
      setResultSubjectId("");
      return;
    }

    setResultSubjectId("");
    setRows([]);
    setMarks({});
    void loadGradeSubjects(selectedExaminationGradeId, setResultSubjects).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Could not load examination subjects");
    });
  }, [examinationId, selectedExaminationGradeId, loadGradeSubjects]);

  const loadResultsSheet = useCallback(async () => {
    if (!examinationId || !resultSubjectId) {
      setRows([]);
      setMarks({});
      return;
    }

    setSheetLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/results?examinationId=${encodeURIComponent(examinationId)}&subjectId=${encodeURIComponent(resultSubjectId)}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load results sheet");
      setRows(data.students);
      setMarks(Object.fromEntries(data.students.map((row: SheetRow) => [
        row.student.id,
        row.result ? String(row.result.marks) : "",
      ])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load results sheet");
    } finally {
      setSheetLoading(false);
    }
  }, [examinationId, resultSubjectId]);

  useEffect(() => {
    void loadResultsSheet();
  }, [loadResultsSheet]);

  async function createExamination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/examinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, termId, gradeId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create examination");
      setName("");
      setExaminationId(data.id);
      setMessage("Examination created. Choose it below to enter marks.");
      await loadSetup();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create examination");
    } finally {
      setSaving(false);
    }
  }

  async function createSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subjectName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create subject");
      setSubjectName("");
      setSubjectId(data.id);
      setMessage("Subject created. Assign it to a grade below.");
      await loadSetup();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create subject");
    } finally {
      setSaving(false);
    }
  }

  async function assignSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/grade-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: setupGradeId, subjectId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not assign subject");
      setMessage(`${data.subject.name} is now available for the selected grade.`);
      await loadGradeSubjects(setupGradeId, setSetupSubjects);
      if (selectedExamination?.gradeId === setupGradeId) {
        await loadGradeSubjects(setupGradeId, setResultSubjects);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not assign subject");
    } finally {
      setSaving(false);
    }
  }

  async function saveResults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const results = rows.flatMap((row) => {
      const value = marks[row.student.id]?.trim();
      return value === "" ? [] : [{ studentId: row.student.id, marks: Number(value) }];
    });

    if (!results.length) {
      setSaving(false);
      setError("Enter at least one mark before saving.");
      return;
    }

    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examinationId, subjectId: resultSubjectId, results }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save results");
      setMessage(`${data.saved} ${data.saved === 1 ? "mark was" : "marks were"} saved.`);
      await loadResultsSheet();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save results");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
  const buttonClass = "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">Digital School Hub</h1>
            <p className="text-sm text-slate-500">Examinations and Results</p>
          </div>
          <Link href="/admin" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">Admin dashboard</Link>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">Results entry</p>
          <h2 className="mt-2 text-3xl font-bold">One results sheet for every grade and subject</h2>
          <p className="mt-2 max-w-3xl text-blue-100">The learner list comes directly from the selected examination grade, so newly registered learners appear automatically.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        {(error || message) && <div role="status" className={`rounded-lg p-4 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{error || message}</div>}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold">1. Create an examination</h3>
            <p className="mt-1 text-sm text-slate-600">Choose the term and grade for CATs, midterms, or end-term exams.</p>
            <form className="mt-5 space-y-4" onSubmit={createExamination}>
              <label className="block text-sm font-medium">Examination name<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="For example, CAT 1" required /></label>
              <label className="block text-sm font-medium">Term<select className={inputClass} value={termId} onChange={(event) => setTermId(event.target.value)} required disabled={!terms.length}><option value="">{terms.length ? "Select a term" : "Create a term first"}</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.academicYear.year} — {term.name}</option>)}</select></label>
              <label className="block text-sm font-medium">Grade<select className={inputClass} value={gradeId} onChange={(event) => setGradeId(event.target.value)} required disabled={!grades.length}><option value="">{grades.length ? "Select a grade" : "Create a grade first"}</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
              <button className={buttonClass} disabled={saving || loading || !terms.length || !grades.length}>{saving ? "Saving…" : "Create examination"}</button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold">2. Set subjects for a grade</h3>
            <p className="mt-1 text-sm text-slate-600">Only these subjects can be selected when entering marks for the grade.</p>
            <form className="mt-5 flex gap-2" onSubmit={createSubject}>
              <input className={inputClass.replace("mt-1 ", "")} value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="New subject, for example English" required />
              <button className={buttonClass} disabled={saving}>Add subject</button>
            </form>
            <form className="mt-5 space-y-4 border-t pt-5" onSubmit={assignSubject}>
              <label className="block text-sm font-medium">Grade<select className={inputClass} value={setupGradeId} onChange={(event) => setSetupGradeId(event.target.value)} disabled={!grades.length}>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
              <label className="block text-sm font-medium">Subject<select className={inputClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)} required disabled={!subjects.length}><option value="">Select a subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
              <button className={buttonClass} disabled={saving || !setupGradeId || !subjectId}>Make subject available</button>
            </form>
            <div className="mt-5 border-t pt-4"><h4 className="text-sm font-semibold">Available subjects</h4>{setupSubjects.length ? <p className="mt-2 text-sm text-slate-600">{setupSubjects.map((item) => item.subject.name).join(", ")}</p> : <p className="mt-2 text-sm text-slate-500">No subjects assigned to this grade yet.</p>}</div>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b px-6 py-5"><h3 className="text-xl font-bold">3. Enter marks</h3><p className="mt-1 text-sm text-slate-600">Select an examination and subject. The current learners in its grade load into the sheet automatically.</p></div>
          <div className="grid gap-4 border-b px-6 py-5 md:grid-cols-2">
            <label className="block text-sm font-medium">Examination<select className={inputClass} value={examinationId} onChange={(event) => setExaminationId(event.target.value)} disabled={!examinations.length}><option value="">{examinations.length ? "Select an examination" : "Create an examination first"}</option>{examinations.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} — {exam.grade.name} ({exam.term.name} {exam.term.academicYear.year})</option>)}</select></label>
            <label className="block text-sm font-medium">Subject<select className={inputClass} value={resultSubjectId} onChange={(event) => setResultSubjectId(event.target.value)} disabled={!examinationId || !resultSubjects.length}><option value="">{resultSubjects.length ? "Select a subject" : "No subjects assigned to this grade"}</option>{resultSubjects.map((item) => <option key={item.subject.id} value={item.subject.id}>{item.subject.name}</option>)}</select></label>
          </div>
          {!examinationId || !resultSubjectId ? <p className="px-6 py-8 text-sm text-slate-500">Choose an examination and subject to open the results sheet.</p> : sheetLoading ? <p className="px-6 py-8 text-sm text-slate-500">Loading learners…</p> : rows.length === 0 ? <p className="px-6 py-8 text-sm text-slate-500">There are no learners registered in this examination grade yet.</p> : <form onSubmit={saveResults}><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-6 py-3 font-semibold">Learner</th><th className="px-6 py-3 font-semibold">Admission number</th><th className="px-6 py-3 font-semibold">Marks / 100</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.student.id}><td className="px-6 py-4 font-medium">{row.student.name}</td><td className="px-6 py-4 text-slate-600">{row.student.admissionNumber || "—"}</td><td className="px-6 py-3"><input aria-label={`Marks for ${row.student.name}`} className="w-28 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600" type="number" min="0" max="100" step="0.01" value={marks[row.student.id] ?? ""} onChange={(event) => setMarks((current) => ({ ...current, [row.student.id]: event.target.value }))} /></td></tr>)}</tbody></table></div><div className="border-t px-6 py-4"><button className={buttonClass} disabled={saving}>{saving ? "Saving…" : "Save marks"}</button></div></form>}
        </section>
      </div>
    </main>
  );
}
