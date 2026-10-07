
"use client";

import { useEffect, useMemo, useState } from "react";

type AcademicYear = {
  id: string;
  year: number;
};

type Term = {
  id: string;
  name: string;
  academicYear: AcademicYear;
};

type Examination = {
  id: string;
  name: string;
  gradeId: string;
  grade: {
    id: string;
    name: string;
    level: number;
  };
  term: {
    id: string;
    name: string;
    academicYear: AcademicYear;
  };
};

type Subject = {
  subjectId: string;
  name: string;
};

type Student = {
  id: string;
  name: string;
  admissionNumber: string | null;
};

type ResultRecord = {
  id: string;
  studentId: string;
  subjectId: string;
  marks: number;
};

type StudentRow = {
  student: Student;
  marks: Record<string, number | null>;
  totalMarks: number;
  totalPoints: number;
  position: number;
};

function getExpectation(marks: number | null) {
  if (
    marks === null ||
    marks === undefined ||
    Number.isNaN(marks)
  ) {
    return {
      code: "—",
      points: 0,
    };
  }

  if (marks >= 75) {
    return {
      code: "EE",
      points: 8,
    };
  }

  if (marks >= 51) {
    return {
      code: "ME",
      points: 6,
    };
  }

  if (marks >= 25) {
    return {
      code: "AE",
      points: 4,
    };
  }

  return {
    code: "BE",
    points: 2,
  };
}

export default function TeacherFinalResultsPage() {
  const [examinations, setExaminations] = useState<Examination[]>([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedExamination, setSelectedExamination] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rows, setRows] = useState<StudentRow[]>([]);

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * Load the school-wide examination list.
   *
   * This endpoint is intentionally used instead of the old combination
   * of /api/academic-years, /api/terms, /api/examinations and /api/grades.
   *
   * The backend already restricts this list to the logged-in teacher's
   * school.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function loadExaminations() {
      try {
        setLoadingSetup(true);
        setError("");

        const response = await fetch(
          "/api/teacher-final-results",
          {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Teacher sign-in is required to view Final Results."
            );
          }

          const data = await response.json().catch(() => null);

          throw new Error(
            data?.error ||
              "Failed to load Final Results information."
          );
        }

        const data = await response.json();

        const list: Examination[] = Array.isArray(
          data.examinations
        )
          ? data.examinations
          : [];

        setExaminations(list);

        if (list.length > 0) {
          const first = list[0];

          setSelectedYear(String(first.term.academicYear.id));
          setSelectedTerm(String(first.term.id));
          setSelectedExamination(String(first.id));
          setSelectedGrade(String(first.grade.id));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load Final Results information."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSetup(false);
        }
      }
    }

    loadExaminations();

    return () => controller.abort();
  }, []);

  /*
   * Build academic years directly from the examinations returned
   * by the school-wide final-results endpoint.
   */
  const academicYears = useMemo<AcademicYear[]>(() => {
    const map = new Map<string, AcademicYear>();

    for (const exam of examinations) {
      map.set(String(exam.term.academicYear.id), {
        id: exam.term.academicYear.id,
        year: exam.term.academicYear.year,
      });
    }

    return Array.from(map.values()).sort(
      (a, b) => b.year - a.year
    );
  }, [examinations]);

  /*
   * Terms belonging to the selected academic year.
   */
  const filteredTerms = useMemo<Term[]>(() => {
    if (!selectedYear) {
      return [];
    }

    const map = new Map<string, Term>();

    for (const exam of examinations) {
      if (
        String(exam.term.academicYear.id) ===
        String(selectedYear)
      ) {
        map.set(String(exam.term.id), {
          id: exam.term.id,
          name: exam.term.name,
          academicYear: exam.term.academicYear,
        });
      }
    }

    return Array.from(map.values());
  }, [examinations, selectedYear]);

  /*
   * Examinations belonging to the selected academic year and term.
   */
  const filteredExaminations = useMemo(() => {
    if (!selectedYear || !selectedTerm) {
      return [];
    }

    return examinations.filter(
      (exam) =>
        String(exam.term.academicYear.id) ===
          String(selectedYear) &&
        String(exam.term.id) === String(selectedTerm)
    );
  }, [examinations, selectedYear, selectedTerm]);

  /*
   * The selected examination determines the grade.
   */
  const filteredGrades = useMemo(() => {
    if (!selectedExamination) {
      return [];
    }

    const exam = examinations.find(
      (item) =>
        String(item.id) === String(selectedExamination)
    );

    if (!exam) {
      return [];
    }

    return [exam.grade];
  }, [examinations, selectedExamination]);

  /*
   * Keep the selected term valid when the academic year changes.
   */
  useEffect(() => {
    if (!selectedYear) {
      setSelectedTerm("");
      return;
    }

    const exists = filteredTerms.some(
      (term) => String(term.id) === String(selectedTerm)
    );

    if (!exists) {
      setSelectedTerm(
        filteredTerms.length > 0
          ? String(filteredTerms[0].id)
          : ""
      );
    }
  }, [selectedYear, filteredTerms, selectedTerm]);

  /*
   * Keep the selected examination valid when the term changes.
   */
  useEffect(() => {
    const exists = filteredExaminations.some(
      (exam) =>
        String(exam.id) === String(selectedExamination)
    );

    if (!exists) {
      setSelectedExamination(
        filteredExaminations.length > 0
          ? String(filteredExaminations[0].id)
          : ""
      );
    }
  }, [
    filteredExaminations,
    selectedExamination,
  ]);

  /*
   * The grade is automatically determined by the selected
   * examination.
   */
  useEffect(() => {
    const exam = examinations.find(
      (item) =>
        String(item.id) === String(selectedExamination)
    );

    if (exam) {
      setSelectedGrade(String(exam.grade.id));
    } else {
      setSelectedGrade("");
    }
  }, [selectedExamination, examinations]);

  /*
   * Load the actual final results for the selected examination.
   */
  useEffect(() => {
    if (!selectedExamination) {
      setSubjects([]);
      setRows([]);
      return;
    }

    const controller = new AbortController();

    async function loadFinalResults() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/teacher-final-results?examinationId=${encodeURIComponent(
            selectedExamination
          )}`,
          {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Teacher sign-in is required to view Final Results."
            );
          }

          const data = await response.json().catch(() => null);

          throw new Error(
            data?.error ||
              "Failed to load Final Results."
          );
        }

        const data = await response.json();

        const gradeSubjects: Subject[] = Array.isArray(
          data.subjects
        )
          ? data.subjects
          : [];

        const students: Student[] = Array.isArray(
          data.students
        )
          ? data.students
          : [];

        const results: ResultRecord[] = Array.isArray(
          data.results
        )
          ? data.results
          : [];

        setSubjects(gradeSubjects);

        const resultMap = new Map<string, number>();

        for (const result of results) {
          if (
            typeof result.marks === "number" &&
            !Number.isNaN(result.marks)
          ) {
            resultMap.set(
              `${result.studentId}_${result.subjectId}`,
              result.marks
            );
          }
        }

        const calculatedRows: StudentRow[] =
          students.map((student) => {
            const marks: Record<string, number | null> =
              {};

            let totalMarks = 0;
            let totalPoints = 0;

            for (const subject of gradeSubjects) {
              const key = `${student.id}_${subject.subjectId}`;
              const value = resultMap.get(key);

              const studentMarks =
                typeof value === "number" &&
                !Number.isNaN(value)
                  ? value
                  : null;

              marks[subject.subjectId] = studentMarks;

              if (studentMarks !== null) {
                totalMarks += studentMarks;
                totalPoints +=
                  getExpectation(studentMarks).points;
              }
            }

            return {
              student,
              marks,
              totalMarks,
              totalPoints,
              position: 0,
            };
          });

        /*
         * Highest total marks first.
         *
         * Competition ranking:
         * 1, 2, 2, 4
         */
        calculatedRows.sort((a, b) => {
          if (b.totalMarks !== a.totalMarks) {
            return b.totalMarks - a.totalMarks;
          }

          return a.student.name.localeCompare(
            b.student.name
          );
        });

        let previousMarks: number | null = null;
        let previousPosition = 0;

        calculatedRows.forEach((row, index) => {
          if (
            previousMarks !== null &&
            previousMarks === row.totalMarks
          ) {
            row.position = previousPosition;
          } else {
            row.position = index + 1;
            previousPosition = row.position;
            previousMarks = row.totalMarks;
          }
        });

        setRows(calculatedRows);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load Final Results."
        );

        setSubjects([]);
        setRows([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadFinalResults();

    return () => controller.abort();
  }, [selectedExamination]);

  const selectedExam = examinations.find(
    (exam) =>
      String(exam.id) === String(selectedExamination)
  );

  const selectedGradeInfo = selectedExam?.grade;

  const selectedYearInfo = academicYears.find(
    (year) =>
      String(year.id) === String(selectedYear)
  );

  const selectedTermInfo = filteredTerms.find(
    (term) =>
      String(term.id) === String(selectedTerm)
  );

  if (loadingSetup) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-xl bg-white p-8 shadow">
          <p className="font-semibold text-slate-900">
            Loading Final Results...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-950">
                Final Results
              </h1>

              <p className="mt-1 font-medium text-slate-700">
                School-wide read-only examination results
              </p>
            </div>

            <div className="rounded-lg border-2 border-slate-300 bg-slate-50 px-4 py-2">
              <span className="font-bold text-slate-800">
                Teacher View
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-5 text-xl font-extrabold text-slate-950">
            Select Results
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block font-bold text-slate-900">
                Academic Year
              </label>

              <select
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(e.target.value)
                }
                className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-3 font-semibold text-slate-950 outline-none focus:border-slate-900"
              >
                <option value="">
                  Select Academic Year
                </option>

                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-bold text-slate-900">
                Term
              </label>

              <select
                value={selectedTerm}
                onChange={(e) =>
                  setSelectedTerm(e.target.value)
                }
                className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-3 font-semibold text-slate-950 outline-none focus:border-slate-900"
              >
                <option value="">
                  Select Term
                </option>

                {filteredTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-bold text-slate-900">
                Examination
              </label>

              <select
                value={selectedExamination}
                onChange={(e) =>
                  setSelectedExamination(e.target.value)
                }
                className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-3 font-semibold text-slate-950 outline-none focus:border-slate-900"
              >
                <option value="">
                  Select Examination
                </option>

                {filteredExaminations.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} — {exam.grade.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-bold text-slate-900">
                Grade
              </label>

              <select
                value={selectedGrade}
                onChange={(e) =>
                  setSelectedGrade(e.target.value)
                }
                className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-3 font-semibold text-slate-950 outline-none focus:border-slate-900"
              >
                <option value="">
                  Select Grade
                </option>

                {filteredGrades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4 font-bold text-red-900">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border-2 border-slate-300 bg-white p-5 font-bold text-slate-900 shadow">
            Loading final results...
          </div>
        )}

        {!loading &&
          selectedExamination &&
          selectedGrade && (
            <div className="rounded-xl bg-white shadow">
              <div className="border-b-2 border-slate-300 p-6">
                <h2 className="text-2xl font-extrabold text-slate-950">
                  {selectedGradeInfo?.name || "Grade"}
                </h2>

                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-800">
                  <span>
                    Academic Year:{" "}
                    {selectedYearInfo?.year || "—"}
                  </span>

                  <span>
                    Term: {selectedTermInfo?.name || "—"}
                  </span>

                  <span>
                    Examination:{" "}
                    {selectedExam?.name || "—"}
                  </span>

                  <span>
                    Learners: {rows.length}
                  </span>
                </div>
              </div>

              {rows.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-bold text-slate-800">
                    No final results are available for the
                    selected examination.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-max border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="border border-slate-600 px-4 py-3 text-left font-extrabold">
                          No.
                        </th>

                        <th className="border border-slate-600 px-4 py-3 text-left font-extrabold">
                          Admission No.
                        </th>

                        <th className="border border-slate-600 px-4 py-3 text-left font-extrabold">
                          Learner Name
                        </th>

                        {subjects.map((subject) => (
                          <th
                            key={subject.subjectId}
                            className="border border-slate-600 px-4 py-3 text-center font-extrabold"
                          >
                            <div>{subject.name}</div>

                            <div className="mt-1 text-xs font-semibold text-slate-200">
                              Mark / Exp.
                            </div>
                          </th>
                        ))}

                        <th className="border border-slate-600 px-4 py-3 text-center font-extrabold">
                          Total Marks
                        </th>

                        <th className="border border-slate-600 px-4 py-3 text-center font-extrabold">
                          Total Points
                        </th>

                        <th className="border border-slate-600 px-4 py-3 text-center font-extrabold">
                          POS
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row, index) => (
                        <tr
                          key={row.student.id}
                          className={
                            index % 2 === 0
                              ? "bg-white"
                              : "bg-slate-100"
                          }
                        >
                          <td className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-950">
                            {index + 1}
                          </td>

                          <td className="border border-slate-300 px-4 py-3 font-bold text-slate-950">
                            {row.student.admissionNumber ||
                              "—"}
                          </td>

                          <td className="border border-slate-300 px-4 py-3 font-extrabold text-slate-950">
                            {row.student.name}
                          </td>

                          {subjects.map((subject) => {
                            const marks =
                              row.marks[subject.subjectId];

                            const expectation =
                              getExpectation(marks);

                            return (
                              <td
                                key={subject.subjectId}
                                className="border border-slate-300 px-4 py-3 text-center"
                              >
                                <div className="font-extrabold text-slate-950">
                                  {marks === null ||
                                  marks === undefined
                                    ? "—"
                                    : marks}
                                </div>

                                <div className="font-bold text-slate-700">
                                  {expectation.code}
                                </div>
                              </td>
                            );
                          })}

                          <td className="border border-slate-300 px-4 py-3 text-center font-extrabold text-slate-950">
                            {row.totalMarks}
                          </td>

                          <td className="border border-slate-300 px-4 py-3 text-center font-extrabold text-slate-950">
                            {row.totalPoints}
                          </td>

                          <td className="border border-slate-300 px-4 py-3 text-center text-lg font-extrabold text-slate-950">
                            {row.position}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
      </div>
    </main>
  );
}