
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Examination = {
  id: string;
  name: string;
  term: string;
  gradeId: string;
  grade?: {
    id: string;
    name: string;
  };
};

type Grade = {
  id: string;
  name: string;
  level?: number;
  _count?: {
    students: number;
  };
};

type Subject = {
  id: string;
  name: string;
};

type GradeSubject = {
  id?: string;
  gradeId: string;
  subjectId: string;
  subject: Subject;
};

type Student = {
  id: string;
  name: string;
  admissionNumber: string;
};

type ResultRecord = {
  id: string;
  studentId: string;
  marks: number;
  updatedAt?: string;
};

type SubjectResult = {
  subjectId: string;
  subjectName: string;
  students: Student[];
  results: ResultRecord[];
};

type StudentRow = {
  student: Student;
  subjectValues: {
    subjectId: string;
    subjectName: string;
    marks: number | null;
    expectation: string;
    points: number;
  }[];
  totalMarks: number;
  totalPoints: number;
  position: number;
};

function getExpectation(marks: number | null) {
  if (marks === null || !Number.isFinite(marks)) {
    return {
      label: "—",
      points: 0,
    };
  }

  if (marks >= 75 && marks <= 100) {
    return {
      label: "EE",
      points: 8,
    };
  }

  if (marks >= 51 && marks <= 74) {
    return {
      label: "ME",
      points: 6,
    };
  }

  if (marks >= 25 && marks <= 50) {
    return {
      label: "AE",
      points: 4,
    };
  }

  if (marks >= 1 && marks <= 24) {
    return {
      label: "BE",
      points: 2,
    };
  }

  return {
    label: "—",
    points: 0,
  };
}

export default function AdminResultsPage() {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<GradeSubject[]>([]);
  const [subjectResults, setSubjectResults] = useState<SubjectResult[]>([]);

  const [selectedExaminationId, setSelectedExaminationId] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);

  const [error, setError] = useState("");
  const [sheetError, setSheetError] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError("");

        const examinationsResponse =
          await fetch("/api/examinations");

        const gradesResponse =
          await fetch("/api/grades");

        if (!examinationsResponse.ok) {
          throw new Error("Failed to load examinations");
        }

        if (!gradesResponse.ok) {
          throw new Error("Failed to load grades");
        }

        const examinationsData =
          await examinationsResponse.json();

        const gradesData =
          await gradesResponse.json();

        const loadedExaminations =
          Array.isArray(examinationsData)
            ? examinationsData
            : examinationsData.examinations ?? [];

        const loadedGrades =
          Array.isArray(gradesData)
            ? gradesData
            : gradesData.grades ?? [];

        setExaminations(loadedExaminations);
        setGrades(loadedGrades);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load examinations and grades"
        );
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  const selectedExamination = useMemo(() => {
    return (
      examinations.find(
        (examination) =>
          examination.id === selectedExaminationId
      ) ?? null
    );
  }, [examinations, selectedExaminationId]);

  const selectedGrade = useMemo(() => {
    return (
      grades.find(
        (grade) => grade.id === selectedGradeId
      ) ?? null
    );
  }, [grades, selectedGradeId]);

  useEffect(() => {
    if (!selectedExaminationId) {
      setSelectedGradeId("");
      return;
    }

    const examination = examinations.find(
      (item) => item.id === selectedExaminationId
    );

    if (examination && examination.gradeId) {
      setSelectedGradeId(examination.gradeId);
    }
  }, [selectedExaminationId, examinations]);

  useEffect(() => {
    async function loadGradeSubjects() {
      if (!selectedGradeId) {
        setGradeSubjects([]);
        setSubjectResults([]);
        return;
      }

      try {
        setLoadingSheet(true);
        setSheetError("");

        const subjectsUrl =
          "/api/grade-subjects?gradeId=" +
          encodeURIComponent(selectedGradeId);

        const response =
          await fetch(subjectsUrl);

        if (!response.ok) {
          throw new Error(
            "Failed to load subjects for this grade"
          );
        }

        const data =
          await response.json();

        const subjects: GradeSubject[] =
          Array.isArray(data)
            ? data
            : data.gradeSubjects ??
              data.subjects ??
              [];

        setGradeSubjects(subjects);
      } catch (err) {
        console.error(err);

        setGradeSubjects([]);
        setSubjectResults([]);

        setSheetError(
          err instanceof Error
            ? err.message
            : "Failed to load grade subjects"
        );
      } finally {
        setLoadingSheet(false);
      }
    }

    loadGradeSubjects();
  }, [selectedGradeId]);

  useEffect(() => {
    async function loadResultsSheet() {
      if (
        !selectedExaminationId ||
        !selectedGradeId ||
        gradeSubjects.length === 0
      ) {
        setSubjectResults([]);
        return;
      }

      try {
        setLoadingSheet(true);
        setSheetError("");

        const loadedResults: SubjectResult[] = [];

        for (const gradeSubject of gradeSubjects) {
          const resultsUrl =
            "/api/results?examinationId=" +
            encodeURIComponent(
              selectedExaminationId
            ) +
            "&subjectId=" +
            encodeURIComponent(
              gradeSubject.subjectId
            );

          const response =
            await fetch(resultsUrl);

          if (!response.ok) {
            const data =
              await response
                .json()
                .catch(() => null);

            throw new Error(
              data?.error ||
                "Failed to load results for " +
                  gradeSubject.subject.name
            );
          }

          const data =
            await response.json();

          const students: Student[] =
            Array.isArray(data.students)
              ? data.students.map(
                  (item: {
                    student: Student;
                  }) => item.student
                )
              : [];

          const results: ResultRecord[] =
            Array.isArray(data.students)
              ? data.students
                  .map(
                    (item: {
                      student: Student;
                      result: ResultRecord | null;
                    }) => item.result
                  )
                  .filter(
                    (
                      result: ResultRecord | null
                    ): result is ResultRecord =>
                      result !== null
                  )
              : [];

          loadedResults.push({
            subjectId:
              gradeSubject.subjectId,
            subjectName:
              gradeSubject.subject.name,
            students,
            results,
          });
        }

        setSubjectResults(loadedResults);
      } catch (err) {
        console.error(err);

        setSubjectResults([]);

        setSheetError(
          err instanceof Error
            ? err.message
            : "Failed to load results sheet"
        );
      } finally {
        setLoadingSheet(false);
      }
    }

    loadResultsSheet();
  }, [
    selectedExaminationId,
    selectedGradeId,
    gradeSubjects,
  ]);

  const students = useMemo(() => {
    const studentMap =
      new Map<string, Student>();

    for (const subjectResult of subjectResults) {
      for (const student of subjectResult.students) {
        if (!studentMap.has(student.id)) {
          studentMap.set(
            student.id,
            student
          );
        }
      }
    }

    return Array.from(
      studentMap.values()
    );
  }, [subjectResults]);

  const rows: StudentRow[] = useMemo(() => {
    const calculatedRows: StudentRow[] =
      students.map((student) => {
        let totalMarks = 0;
        let totalPoints = 0;

        const subjectValues =
          subjectResults.map(
            (subjectResult) => {
              const result =
                subjectResult.results.find(
                  (item) =>
                    item.studentId ===
                    student.id
                );

              const marks =
                result &&
                Number.isFinite(
                  Number(result.marks)
                )
                  ? Number(result.marks)
                  : null;

              const expectation =
                getExpectation(marks);

              if (marks !== null) {
                totalMarks += marks;
                totalPoints +=
                  expectation.points;
              }

              return {
                subjectId:
                  subjectResult.subjectId,
                subjectName:
                  subjectResult.subjectName,
                marks,
                expectation:
                  expectation.label,
                points:
                  expectation.points,
              };
            }
          );

        return {
          student,
          subjectValues,
          totalMarks,
          totalPoints,
          position: 0,
        };
      });

    calculatedRows.sort((a, b) => {
      if (
        b.totalMarks !==
        a.totalMarks
      ) {
        return (
          b.totalMarks -
          a.totalMarks
        );
      }

      return a.student.name.localeCompare(
        b.student.name
      );
    });

    let currentPosition = 0;
    let previousTotalMarks:
      number | null = null;

    calculatedRows.forEach(
      (row, index) => {
        if (
          previousTotalMarks ===
            null ||
          row.totalMarks !==
            previousTotalMarks
        ) {
          currentPosition =
            index + 1;

          previousTotalMarks =
            row.totalMarks;
        }

        row.position =
          currentPosition;
      }
    );

    return calculatedRows;
  }, [students, subjectResults]);

  function clearSheet() {
    setSelectedExaminationId("");
    setSelectedGradeId("");
    setGradeSubjects([]);
    setSubjectResults([]);
    setSheetError("");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-7xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Examination Results
          </h1>

          <p className="mt-2 text-slate-600">
            View a complete grade-wide results spreadsheet
            with marks, expectations, total points and
            automatic position ranking.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="grid gap-5 md:grid-cols-2">

            <div>
              <label
                htmlFor="examination"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Examination
              </label>

              <select
                id="examination"
                value={selectedExaminationId}
                onChange={(event) =>
                  setSelectedExaminationId(
                    event.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="">
                  Select examination
                </option>

                {examinations.map(
                  (examination) => (
                    <option
                      key={examination.id}
                      value={examination.id}
                    >
                      {examination.name}
                      {examination.term
                        ? " — " +
                          examination.term
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="grade"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Grade
              </label>

              <select
                id="grade"
                value={selectedGradeId}
                onChange={(event) =>
                  setSelectedGradeId(
                    event.target.value
                  )
                }
                disabled={
                  loading ||
                  Boolean(
                    selectedExaminationId
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="">
                  Select grade
                </option>

                {grades.map((grade) => (
                  <option
                    key={grade.id}
                    value={grade.id}
                  >
                    {grade.name}
                  </option>
                ))}
              </select>

              {selectedExaminationId && (
                <p className="mt-2 text-xs text-slate-500">
                  Grade is automatically selected
                  from the examination.
                </p>
              )}
            </div>

          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={clearSheet}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>

            {selectedExamination &&
              selectedGrade && (
                <div className="text-sm text-slate-600">
                  <span className="font-semibold">
                    {selectedExamination.name}
                  </span>

                  {" • "}

                  <span className="font-semibold">
                    {selectedGrade.name}
                  </span>
                </div>
              )}

          </div>

          {loading && (
            <p className="mt-4 text-sm text-slate-600">
              Loading examinations and grades...
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {sheetError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {sheetError}
            </div>
          )}

        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-5">

            <h2 className="text-xl font-bold text-slate-900">
              Grade Results Spreadsheet
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Each subject shows the mark and expectation.
              Points are calculated automatically into Total
              Points. Learners are arranged from highest to
              lowest Total Marks.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">

              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                BE: 1–24 = 2 points
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                AE: 25–50 = 4 points
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                ME: 51–74 = 6 points
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                EE: 75–100 = 8 points
              </span>

            </div>
          </div>

          {loadingSheet && (
            <div className="p-8 text-center text-sm text-slate-600">
              Loading results spreadsheet...
            </div>
          )}

          {!loadingSheet &&
            selectedGradeId &&
            gradeSubjects.length === 0 &&
            !sheetError && (
              <div className="p-8 text-center text-sm text-slate-600">
                No subjects have been made available for
                this grade yet.
              </div>
            )}

          {!loadingSheet &&
            selectedGradeId &&
            gradeSubjects.length > 0 &&
            rows.length === 0 &&
            !sheetError && (
              <div className="p-8 text-center text-sm text-slate-600">
                No learners were found in this grade.
              </div>
            )}

          {!loadingSheet &&
            rows.length > 0 && (
              <div className="overflow-x-auto">

                <table className="min-w-max border-collapse text-sm text-slate-900">

                  <thead>

                    <tr className="bg-slate-900 text-white">

                      <th
                        rowSpan={2}
                        className="border border-slate-600 px-4 py-3 text-left font-semibold"
                      >
                        No.
                      </th>

                      <th
                        rowSpan={2}
                        className="border border-slate-600 px-4 py-3 text-left font-semibold"
                      >
                        Admission No.
                      </th>

                      <th
                        rowSpan={2}
                        className="border border-slate-600 px-4 py-3 text-left font-semibold"
                      >
                        Learner Name
                      </th>

                      {subjectResults.map(
                        (subject) => (
                          <th
                            key={
                              subject.subjectId
                            }
                            colSpan={2}
                            className="border border-slate-600 px-4 py-3 text-center font-semibold"
                          >
                            {subject.subjectName}
                          </th>
                        )
                      )}

                      <th
                        rowSpan={2}
                        className="border border-slate-600 px-4 py-3 text-center font-semibold"
                      >
                        Total Marks
                      </th>

                      <th
                        rowSpan={2}
                        className="border border-slate-600 px-4 py-3 text-center font-semibold"
                      >
                        Total Points
                      </th>

                      <th
                        rowSpan={2}
                        className="border border-slate-600 px-4 py-3 text-center font-semibold"
                      >
                        POS
                      </th>

                    </tr>

                    <tr className="bg-slate-50">

                      {subjectResults.map(
                        (subject) => (
                          <React.Fragment
                            key={
                              subject.subjectId
                            }
                          >

                            <th className="border border-slate-300 px-3 py-2 font-medium text-slate-700">
                              Mark
                            </th>

                            <th className="border border-slate-300 px-3 py-2 font-medium text-slate-700">
                              Expectation
                            </th>

                          </React.Fragment>
                        )
                      )}

                    </tr>

                  </thead>

                  <tbody className="text-slate-900">

                    {rows.map(
                      (row, rowIndex) => (
                        <tr
                          key={row.student.id}
                          className="bg-white hover:bg-slate-50"
                        >

                          <td className="border border-slate-200 px-4 py-3 text-center font-medium text-slate-900">
                            {rowIndex + 1}
                          </td>

                          <td className="border border-slate-200 px-4 py-3 font-medium text-slate-900">
                            {row.student.admissionNumber}
                          </td>

                          <td className="border border-slate-200 px-4 py-3 font-semibold text-slate-900">
                            {row.student.name}
                          </td>

                          {row.subjectValues.map(
                            (value) => (
                              <React.Fragment
                                key={
                                  row.student.id +
                                  "-" +
                                  value.subjectId
                                }
                              >

                                <td className="border border-slate-200 px-3 py-3 text-center font-medium text-slate-900">
                                  {value.marks ===
                                  null
                                    ? "—"
                                    : value.marks}
                                </td>

                                <td className="border border-slate-200 px-3 py-3 text-center font-semibold text-slate-900">
                                  {
                                    value.expectation
                                  }
                                </td>

                              </React.Fragment>
                            )
                          )}

                          <td className="border border-slate-200 px-4 py-3 text-center font-bold text-slate-900">
                            {row.totalMarks}
                          </td>

                          <td className="border border-slate-200 px-4 py-3 text-center font-bold text-slate-900">
                            {row.totalPoints}
                          </td>

                          <td className="border border-slate-200 px-4 py-3 text-center font-bold text-slate-900">
                            {row.position}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          {!selectedGradeId &&
            !loading && (
              <div className="p-10 text-center">

                <p className="text-lg font-semibold text-slate-700">
                  Select an examination to view the
                  results spreadsheet.
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  The grade will be selected
                  automatically from the examination.
                </p>

              </div>
            )}

        </section>

      </section>
    </main>
  );
}
