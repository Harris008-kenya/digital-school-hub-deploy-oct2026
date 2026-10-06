
"use client";

import { useEffect, useMemo, useState } from "react";

type AcademicYear = {
  id: string;
  year: number;
};

type Term = {
  id: string;
  name: string;
  academicYearId: string;
};

type Examination = {
  id: string;
  name: string;
  termId: string;
  gradeId: string;
  grade?: {
    id: string;
    name: string;
    level: number;
  };
};

type Grade = {
  id: string;
  name: string;
  level: number;
};

type GradeSubject = {
  id: string;
  gradeId: string;
  subjectId: string;
  subject: {
    id: string;
    name: string;
  };
};

type Student = {
  id: string;
  name: string;
  admissionNumber: string | null;
  gradeId: string;
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
    Number.isNaN(marks) ||
    marks <= 0
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
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedExamination, setSelectedExamination] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");

  const [subjects, setSubjects] = useState<GradeSubject[]>([]);
  const [rows, setRows] = useState<StudentRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSetup();
  }, []);

  async function loadSetup() {
    try {
      setLoadingSetup(true);
      setError("");

      const [yearsResponse, termsResponse, examsResponse, gradesResponse] =
        await Promise.all([
          fetch("/api/academic-years"),
          fetch("/api/terms"),
          fetch("/api/examinations"),
          fetch("/api/grades"),
        ]);

      if (
        !yearsResponse.ok ||
        !termsResponse.ok ||
        !examsResponse.ok ||
        !gradesResponse.ok
      ) {
        throw new Error("Failed to load Final Results information.");
      }

      const yearsData = await yearsResponse.json();
      const termsData = await termsResponse.json();
      const examsData = await examsResponse.json();
      const gradesData = await gradesResponse.json();

      const years: AcademicYear[] = Array.isArray(yearsData)
        ? yearsData
        : yearsData.academicYears || [];

      const termsList: Term[] = Array.isArray(termsData)
        ? termsData
        : termsData.terms || [];

      const exams: Examination[] = Array.isArray(examsData)
        ? examsData
        : examsData.examinations || [];

      const gradesList: Grade[] = Array.isArray(gradesData)
        ? gradesData
        : gradesData.grades || [];

      setAcademicYears(years);
      setTerms(termsList);
      setExaminations(exams);
      setGrades(gradesList);

      if (years.length > 0) {
        setSelectedYear(String(years[0].id));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Final Results information."
      );
    } finally {
      setLoadingSetup(false);
    }
  }

  const filteredTerms = useMemo(() => {
    if (!selectedYear) return [];

    return terms.filter(
      (term) => String(term.academicYearId) === String(selectedYear)
    );
  }, [terms, selectedYear]);

  const filteredExaminations = useMemo(() => {
    if (!selectedTerm) return [];

    return examinations.filter(
      (exam) => String(exam.termId) === String(selectedTerm)
    );
  }, [examinations, selectedTerm]);

  const filteredGrades = useMemo(() => {
    if (!selectedExamination) return [];

    const exam = examinations.find(
      (item) => String(item.id) === String(selectedExamination)
    );

    if (!exam) return [];

    return grades.filter(
      (grade) => String(grade.id) === String(exam.gradeId)
    );
  }, [examinations, grades, selectedExamination]);

  useEffect(() => {
    if (filteredTerms.length > 0) {
      setSelectedTerm(String(filteredTerms[0].id));
    } else {
      setSelectedTerm("");
    }
  }, [selectedYear, filteredTerms]);

  useEffect(() => {
    if (filteredExaminations.length > 0) {
      setSelectedExamination(String(filteredExaminations[0].id));
    } else {
      setSelectedExamination("");
    }
  }, [selectedTerm, filteredExaminations]);

  useEffect(() => {
    if (filteredGrades.length > 0) {
      setSelectedGrade(String(filteredGrades[0].id));
    } else {
      setSelectedGrade("");
    }
  }, [selectedExamination, filteredGrades]);

  useEffect(() => {
    if (selectedExamination && selectedGrade) {
      loadFinalResults();
    } else {
      setSubjects([]);
      setRows([]);
    }
  }, [selectedExamination, selectedGrade]);

  async function loadFinalResults() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/final-results?examinationId=${encodeURIComponent(
          selectedExamination
        )}&gradeId=${encodeURIComponent(selectedGrade)}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Teacher sign-in is required to view Final Results."
          );
        }

        const data = await response.json().catch(() => null);

        throw new Error(
          data?.error || "Failed to load protected Final Results."
        );
      }

      const data = await response.json();

      const gradeSubjects: GradeSubject[] = Array.isArray(
        data.gradeSubjects
      )
        ? data.gradeSubjects
        : [];

      const students: Student[] = Array.isArray(data.students)
        ? data.students
        : [];

      const results: ResultRecord[] = Array.isArray(data.results)
        ? data.results
        : [];

      setSubjects(gradeSubjects);

      const resultMap = new Map<string, number>();

      for (const result of results) {
        resultMap.set(
          `${result.studentId}_${result.subjectId}`,
          result.marks
        );
      }

      const calculatedRows: StudentRow[] = students.map((student) => {
        const marks: Record<string, number | null> = {};

        let totalMarks = 0;
        let totalPoints = 0;

        for (const subject of gradeSubjects) {
          const key = `${student.id}_${subject.subjectId}`;
          const value = resultMap.get(key);

          const studentMarks =
            typeof value === "number" && !Number.isNaN(value)
              ? value
              : null;

          marks[subject.subjectId] = studentMarks;

          if (studentMarks !== null) {
            totalMarks += studentMarks;
            totalPoints += getExpectation(studentMarks).points;
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

      calculatedRows.sort((a, b) => {
        if (b.totalMarks !== a.totalMarks) {
          return b.totalMarks - a.totalMarks;
        }

        return a.student.name.localeCompare(b.student.name);
      });

      let previousMarks: number | null = null;
      let previousPosition = 0;

      calculatedRows.forEach((row, index) => {
        if (previousMarks === row.totalMarks) {
          row.position = previousPosition;
        } else {
          row.position = index + 1;
          previousPosition = row.position;
          previousMarks = row.totalMarks;
        }
      });

      setRows(calculatedRows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Final Results."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const selectedExam = examinations.find(
    (exam) => String(exam.id) === String(selectedExamination)
  );

  const selectedGradeInfo = grades.find(
    (grade) => String(grade.id) === String(selectedGrade)
  );

  const selectedYearInfo = academicYears.find(
    (year) => String(year.id) === String(selectedYear)
  );

  const selectedTermInfo = terms.find(
    (term) => String(term.id) === String(selectedTerm)
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
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-3 font-semibold text-slate-950 outline-none focus:border-slate-900"
              >
                <option value="">Select Academic Year</option>

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
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-3 font-semibold text-slate-950 outline-none focus:border-slate-900"
              >
                <option value="">Select Term</option>

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
                onChange={(e) => setSelectedExamination(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-3 font-semibold text-slate-950 outline-none focus:border-slate-900"
              >
                <option value="">Select Examination</option>

                {filteredExaminations.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
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
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-3 font-semibold text-slate-950 outline-none focus:border-slate-900"
              >
                <option value="">Select Grade</option>

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

        {!loading && selectedExamination && selectedGrade && (
          <div className="rounded-xl bg-white shadow">
            <div className="border-b-2 border-slate-300 p-6">
              <h2 className="text-2xl font-extrabold text-slate-950">
                {selectedGradeInfo?.name || "Grade"}
              </h2>

              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-800">
                <span>
                  Academic Year: {selectedYearInfo?.year || "—"}
                </span>

                <span>
                  Term: {selectedTermInfo?.name || "—"}
                </span>

                <span>
                  Examination: {selectedExam?.name || "—"}
                </span>

                <span>
                  Learners: {rows.length}
                </span>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-bold text-slate-800">
                  No final results are available for the selected
                  examination.
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
                          <div>{subject.subject.name}</div>
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
                          {row.student.admissionNumber || "—"}
                        </td>

                        <td className="border border-slate-300 px-4 py-3 font-extrabold text-slate-950">
                          {row.student.name}
                        </td>

                        {subjects.map((subject) => {
                          const marks = row.marks[subject.subjectId];
                          const expectation = getExpectation(marks);

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
