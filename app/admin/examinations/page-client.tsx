"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Term = {
  id: string;
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
};

type AcademicYear = {
  id: string;
  year: number;
  terms: Term[];
};

type Grade = {
  id: string;
  name: string;
  level: number;
  _count?: {
    students: number;
  };
};

type Examination = {
  id: string;
  name: string;
  createdAt: string;
  term: {
    id: string;
    name: string;
    academicYear: {
      id: string;
      year: number;
    };
  };
  grade: {
    id: string;
    name: string;
    level: number;
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function ExaminationsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);

  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const [examName, setExamName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [yearsResponse, gradesResponse, examinationsResponse] =
        await Promise.all([
          fetch("/api/academic-years"),
          fetch("/api/grades"),
          fetch("/api/examinations"),
        ]);

      const yearsData = await yearsResponse.json();
      const gradesData = await gradesResponse.json();
      const examinationsData = await examinationsResponse.json();

      if (!yearsResponse.ok) {
        throw new Error(
          yearsData.error || "Could not load academic years.",
        );
      }

      if (!gradesResponse.ok) {
        throw new Error(gradesData.error || "Could not load grades.");
      }

      if (!examinationsResponse.ok) {
        throw new Error(
          examinationsData.error || "Could not load examinations.",
        );
      }

      const years = Array.isArray(yearsData)
        ? (yearsData as AcademicYear[])
        : [];

      const loadedGrades = Array.isArray(gradesData)
        ? (gradesData as Grade[])
        : [];

      const loadedExaminations = Array.isArray(examinationsData)
        ? (examinationsData as Examination[])
        : [];

      setAcademicYears(years);
      setGrades(loadedGrades);
      setExaminations(loadedExaminations);

      setSelectedYearId((currentId) => {
        if (years.some((year) => year.id === currentId)) {
          return currentId;
        }

        return years[0]?.id ?? "";
      });

      setSelectedGradeId((currentId) => {
        if (loadedGrades.some((grade) => grade.id === currentId)) {
          return currentId;
        }

        return loadedGrades[0]?.id ?? "";
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load examination data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedYear = useMemo(
    () => academicYears.find((year) => year.id === selectedYearId),
    [academicYears, selectedYearId],
  );

  const selectedTerm = useMemo(
    () => selectedYear?.terms.find((term) => term.id === selectedTermId),
    [selectedYear, selectedTermId],
  );

  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === selectedGradeId),
    [grades, selectedGradeId],
  );

  const visibleExaminations = useMemo(() => {
    return examinations.filter((examination) => {
      if (
        selectedYearId &&
        examination.term.academicYear.id !== selectedYearId
      ) {
        return false;
      }

      if (
        selectedTermId &&
        examination.term.id !== selectedTermId
      ) {
        return false;
      }

      if (
        selectedGradeId &&
        examination.grade.id !== selectedGradeId
      ) {
        return false;
      }

      return true;
    });
  }, [
    examinations,
    selectedYearId,
    selectedTermId,
    selectedGradeId,
  ]);

  useEffect(() => {
    if (!selectedYear) {
      setSelectedTermId("");
      return;
    }

    setSelectedTermId((currentId) => {
      if (selectedYear.terms.some((term) => term.id === currentId)) {
        return currentId;
      }

      return selectedYear.terms[0]?.id ?? "";
    });
  }, [selectedYear]);

  async function createExamination(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const name = examName.trim();

    if (!selectedTermId) {
      setError("Select a term first.");
      return;
    }

    if (!selectedGradeId) {
      setError("Select a grade first.");
      return;
    }

    if (!name) {
      setError("Enter an examination name.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/examinations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          termId: selectedTermId,
          gradeId: selectedGradeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not create the examination.",
        );
      }

      setExamName("");

      setMessage(
        `${data.name} was created successfully for ${selectedGrade?.name}.`,
      );

      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not create the examination.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Digital School Hub
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Examination Management
            </h1>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Results setup
          </p>

          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Create and manage examinations
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-blue-100">
            Create examinations for each grade and term. Multiple
            examinations can be created within the same term.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">
                Examination overview
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {visibleExaminations.length} examination
                {visibleExaminations.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="text-sm font-medium text-slate-700">
                Academic year

                <select
                  value={selectedYearId}
                  onChange={(event) => {
                    setSelectedYearId(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  className="mt-1 block min-w-32 rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  {academicYears.length === 0 ? (
                    <option value="">No years</option>
                  ) : (
                    academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.year}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Term

                <select
                  value={selectedTermId}
                  onChange={(event) => {
                    setSelectedTermId(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  disabled={!selectedYear}
                  className="mt-1 block min-w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
                >
                  {selectedYear?.terms.length ? (
                    selectedYear.terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No terms</option>
                  )}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Grade

                <select
                  value={selectedGradeId}
                  onChange={(event) => {
                    setSelectedGradeId(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  className="mt-1 block min-w-32 rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  {grades.length === 0 ? (
                    <option value="">No grades</option>
                  ) : (
                    grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <p className="mt-8 text-sm text-slate-600">
              Loading examinations...
            </p>
          ) : visibleExaminations.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="font-semibold">
                No examinations found
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Create the first examination using the form.
              </p>
            </div>
          ) : (
            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
                <span>Examination</span>
                <span>Term</span>
                <span>Grade</span>
              </div>

              <ul className="divide-y divide-slate-200">
                {visibleExaminations.map((examination) => (
                  <li
                    key={examination.id}
                    className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {examination.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Created{" "}
                        {formatDate(examination.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium md:hidden">
                          Term:{" "}
                        </span>
                        {examination.term.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {examination.term.academicYear.year}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium md:hidden">
                          Grade:{" "}
                        </span>
                        {examination.grade.name}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside>
          <form
            onSubmit={createExamination}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <h3 className="text-lg font-bold">
              Add examination
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Create an examination for the selected term and grade.
            </p>

            <label className="mt-5 block text-sm font-medium text-slate-700">
              Academic year

              <select
                value={selectedYearId}
                onChange={(event) => {
                  setSelectedYearId(event.target.value);
                  setMessage("");
                  setError("");
                }}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select academic year</option>

                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Term

              <select
                value={selectedTermId}
                onChange={(event) => {
                  setSelectedTermId(event.target.value);
                  setMessage("");
                  setError("");
                }}
                required
                disabled={!selectedYear}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">Select term</option>

                {selectedYear?.terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Grade

              <select
                value={selectedGradeId}
                onChange={(event) => {
                  setSelectedGradeId(event.target.value);
                  setMessage("");
                  setError("");
                }}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select grade</option>

                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Examination name

              <input
                type="text"
                required
                value={examName}
                onChange={(event) =>
                  setExamName(event.target.value)
                }
                placeholder="e.g. CAT 1"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <button
              type="submit"
              disabled={
                saving ||
                loading ||
                !selectedYearId ||
                !selectedTermId ||
                !selectedGradeId
              }
              className="mt-5 w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create examination"}
            </button>
          </form>
        </aside>
      </div>

      {(error || message) && (
        <div
          className="mx-auto max-w-7xl px-6 pb-8"
          aria-live="polite"
        >
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </p>
          ) : (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {message}
            </p>
          )}
        </div>
      )}
    </main>
  );
}