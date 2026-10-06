"use client";

import React, { useEffect, useMemo, useState } from "react";

type Grade = {
  id: string;
  name: string;
  level: number;
};

type Assignment = {
  id: string;
  teacherId: string;
  gradeId: string;
  subjectId: string;
  grade: Grade;
  subject: {
    id: string;
    name: string;
  };
};

type Examination = {
  id: string;
  name: string;
  gradeId: string;
  grade: Grade;
  term: {
    id: string;
    name: string;
    academicYear: {
      id: string;
      year: number;
    };
  };
};

type SheetRow = {
  student: {
    id: string;
    name: string;
    admissionNumber: string | null;
  };
  result: {
    id: string;
    marks: number;
  } | null;
};

type SubjectResult = {
  subjectId: string;
  subjectName: string;
  results: ResultRecord[];
};

type ResultRecord = {
  id: string;
  studentId: string;
  marks: number;
};

type StudentRow = {
  studentId: string;
  admissionNumber: string;
  name: string;
  marksBySubject: Record<string, number | null>;
  totalMarks: number;
  totalPoints: number;
  position: number;
};

function getExpectation(marks: number | null) {
  if (marks === null || !Number.isFinite(marks) || marks <= 0) {
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

export default function TeacherResultsPage() {
  const [teacherName, setTeacherName] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);

  const [assignmentId, setAssignmentId] = useState("");
  const [examinationId, setExaminationId] = useState("");

  const [rows, setRows] = useState<SheetRow[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [finalExaminationId, setFinalExaminationId] = useState("");
  const [finalSubjectResults, setFinalSubjectResults] = useState<
    SubjectResult[]
  >([]);
  const [finalStudents, setFinalStudents] = useState<
    {
      id: string;
      name: string;
      admissionNumber: string | null;
    }[]
  >([]);
  const [finalLoading, setFinalLoading] = useState(false);
  const [finalError, setFinalError] = useState("");

  useEffect(() => {
    async function loadTeacherData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/teacher-results", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load teacher results");
        }

        setTeacherName(data.teacher?.name || "");
        setAssignments(data.teacher?.assignments || []);
        setExaminations(data.examinations || []);

        if (data.teacher?.assignments?.length > 0) {
          setAssignmentId(data.teacher.assignments[0].id);
        }

        if (data.examinations?.length > 0) {
          setExaminationId(data.examinations[0].id);
          setFinalExaminationId(data.examinations[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load teacher results",
        );
      } finally {
        setLoading(false);
      }
    }

    loadTeacherData();
  }, []);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === assignmentId),
    [assignments, assignmentId],
  );

  const filteredExaminations = useMemo(() => {
    if (!selectedAssignment) {
      return [];
    }

    return examinations.filter(
      (examination) => examination.gradeId === selectedAssignment.gradeId,
    );
  }, [examinations, selectedAssignment]);

  const selectedExamination = useMemo(
    () =>
      examinations.find(
        (examination) => examination.id === examinationId,
      ),
    [examinations, examinationId],
  );

  const selectedFinalExamination = useMemo(
    () =>
      examinations.find(
        (examination) => examination.id === finalExaminationId,
      ),
    [examinations, finalExaminationId],
  );

  useEffect(() => {
    if (!selectedAssignment) {
      return;
    }

    const available = examinations.filter(
      (examination) => examination.gradeId === selectedAssignment.gradeId,
    );

    if (
      available.length > 0 &&
      !available.some((examination) => examination.id === examinationId)
    ) {
      setExaminationId(available[0].id);
    }
  }, [selectedAssignment, examinations, examinationId]);

  useEffect(() => {
    async function loadMarksSheet() {
      if (!selectedAssignment || !examinationId) {
        setRows([]);
        return;
      }

      try {
        setSheetLoading(true);
        setError("");
        setMessage("");

        const response = await fetch(
          `/api/teacher-results?examinationId=${encodeURIComponent(
            examinationId,
          )}&subjectId=${encodeURIComponent(selectedAssignment.subjectId)}`,
          {
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load marks sheet");
        }

        const sheetRows: SheetRow[] = data.students || [];

        setRows(sheetRows);

        const nextMarks: Record<string, string> = {};

        for (const row of sheetRows) {
          nextMarks[row.student.id] =
            row.result?.marks !== undefined && row.result?.marks !== null
              ? String(row.result.marks)
              : "";
        }

        setMarks(nextMarks);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load marks sheet",
        );
      } finally {
        setSheetLoading(false);
      }
    }

    loadMarksSheet();
  }, [selectedAssignment, examinationId]);

  async function saveMarks() {
    if (!selectedAssignment || !examinationId) {
      setError("Please select a subject and examination.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const results = rows
        .map((row) => {
          const value = marks[row.student.id]?.trim();

          if (value === "") {
            return null;
          }

          return {
            studentId: row.student.id,
            marks: Number(value),
          };
        })
        .filter(
          (
            result,
          ): result is {
            studentId: string;
            marks: number;
          } => result !== null,
        );

      for (const result of results) {
        if (
          !Number.isFinite(result.marks) ||
          result.marks < 0 ||
          result.marks > 100
        ) {
          setError("Each entered mark must be a number from 0 to 100.");
          return;
        }
      }

      if (results.length === 0) {
        setError("Please enter at least one mark before saving.");
        return;
      }

      const response = await fetch("/api/teacher-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examinationId,
          subjectId: selectedAssignment.subjectId,
          results,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save marks");
      }

      setMessage(
        `Successfully saved ${data.saved || results.length} mark(s).`,
      );

      if (finalExaminationId === examinationId) {
        await loadFinalResults(examinationId);
      }

      const refreshedResponse = await fetch(
        `/api/teacher-results?examinationId=${encodeURIComponent(
          examinationId,
        )}&subjectId=${encodeURIComponent(selectedAssignment.subjectId)}`,
        {
          cache: "no-store",
        },
      );

      const refreshedData = await refreshedResponse.json();

      if (refreshedResponse.ok) {
        const refreshedRows: SheetRow[] = refreshedData.students || [];

        setRows(refreshedRows);

        const refreshedMarks: Record<string, string> = {};

        for (const row of refreshedRows) {
          refreshedMarks[row.student.id] =
            row.result?.marks !== undefined && row.result?.marks !== null
              ? String(row.result.marks)
              : "";
        }

        setMarks(refreshedMarks);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save marks",
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadFinalResults(examId: string) {
    if (!examId) {
      setFinalSubjectResults([]);
      setFinalStudents([]);
      return;
    }

    try {
      setFinalLoading(true);
      setFinalError("");

      const response = await fetch(
        `/api/teacher-final-results?examinationId=${encodeURIComponent(
          examId,
        )}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load complete final results",
        );
      }

      const students =
        Array.isArray(data.students) ? data.students : [];

      const subjects =
        Array.isArray(data.subjects) ? data.subjects : [];

      const results =
        Array.isArray(data.results) ? data.results : [];

      const subjectResults: SubjectResult[] = subjects.map(
        (subject: {
          subjectId: string;
          subjectName: string;
        }) => {
          const subjectRecords: ResultRecord[] = results
            .filter(
              (result: {
                studentId?: string;
                subjectId?: string;
                marks?: number;
              }) =>
                result.subjectId === subject.subjectId &&
                result.marks !== undefined &&
                result.marks !== null,
            )
            .map(
              (result: {
                id: string;
                studentId: string;
                marks: number;
              }) => ({
                id: result.id,
                studentId: result.studentId,
                marks: Number(result.marks),
              }),
            );

          return {
            subjectId: subject.subjectId,
            subjectName: subject.subjectName,
            results: subjectRecords,
          };
        },
      );

      setFinalStudents(
        students.map(
          (student: {
            id: string;
            name: string;
            admissionNumber: string | null;
          }) => ({
            id: student.id,
            name: student.name,
            admissionNumber: student.admissionNumber,
          }),
        ),
      );

      setFinalSubjectResults(subjectResults);
    } catch (err) {
      setFinalError(
        err instanceof Error
          ? err.message
          : "Failed to load final results",
      );
      setFinalSubjectResults([]);
      setFinalStudents([]);
    } finally {
      setFinalLoading(false);
    }
  }

  useEffect(() => {
    if (finalExaminationId && examinations.length > 0) {
      loadFinalResults(finalExaminationId);
    }
  }, [finalExaminationId, examinations]);

  const finalRows = useMemo<StudentRow[]>(() => {
    if (finalStudents.length === 0) {
      return [];
    }

    const calculated = finalStudents.map((student) => {
      const marksBySubject: Record<string, number | null> = {};
      let totalMarks = 0;
      let totalPoints = 0;

      for (const subject of finalSubjectResults) {
        const result = subject.results.find(
          (item) => item.studentId === student.id,
        );

        const mark =
          result && Number.isFinite(result.marks)
            ? result.marks
            : null;

        marksBySubject[subject.subjectId] = mark;

        if (mark !== null) {
          totalMarks += mark;
        }

        totalPoints += getExpectation(mark).points;
      }

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber || "—",
        name: student.name,
        marksBySubject,
        totalMarks,
        totalPoints,
        position: 0,
      };
    });

    calculated.sort((a, b) => {
      if (b.totalMarks !== a.totalMarks) {
        return b.totalMarks - a.totalMarks;
      }

      return a.name.localeCompare(b.name);
    });

    // Competition ranking: 1, 2, 2, 4
    let previousMarks: number | null = null;
    let previousPosition = 0;

    calculated.forEach((row, index) => {
      const position = index + 1;

      if (previousMarks === row.totalMarks) {
        row.position = previousPosition;
      } else {
        row.position = position;
        previousPosition = position;
        previousMarks = row.totalMarks;
      }
    });

    return calculated;
  }, [finalStudents, finalSubjectResults]);

  async function signOut() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-700 font-medium">
          Loading teacher results...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-bold text-emerald-600">
              Digital School Hub
            </p>

            <h1 className="text-2xl font-bold text-slate-950">
              Teacher Results
            </h1>

            {teacherName && (
              <p className="mt-1 text-sm font-medium text-slate-700">
                Welcome, {teacherName}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-950">
              Enter marks for your assigned subjects
            </h2>

            <p className="mt-2 text-slate-700">
              Select your assigned subject and examination, then enter
              learner marks from 0 to 100.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {message}
            </div>
          )}

          <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="assignment"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Assigned Subject
                </label>

                <select
                  id="assignment"
                  value={assignmentId}
                  onChange={(event) =>
                    setAssignmentId(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-400 bg-white px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="">Select subject</option>

                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.grade.name} —{" "}
                      {assignment.subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="examination"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Examination
                </label>

                <select
                  id="examination"
                  value={examinationId}
                  onChange={(event) =>
                    setExaminationId(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-400 bg-white px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="">Select examination</option>

                  {filteredExaminations.map((examination) => (
                    <option
                      key={examination.id}
                      value={examination.id}
                    >
                      {examination.term.academicYear.year} —{" "}
                      {examination.term.name} —{" "}
                      {examination.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedAssignment && selectedExamination && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-800">
                <strong className="font-bold">
                  {selectedAssignment.subject.name}
                </strong>
                {" · "}
                {selectedAssignment.grade.name}
                {" · "}
                {selectedExamination.name}
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-300 px-6 py-5">
              <h3 className="text-xl font-bold text-slate-950">
                Results sheet
              </h3>

              <p className="mt-1 text-sm font-medium text-slate-700">
                Enter marks for every learner in the selected subject.
              </p>
            </div>

            {sheetLoading ? (
              <div className="px-6 py-10 text-center font-medium text-slate-700">
                Loading marks sheet...
              </div>
            ) : rows.length === 0 ? (
              <div className="px-6 py-10 text-center font-medium text-slate-700">
                Select an assigned subject and examination to load
                learners.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-left text-sm font-bold text-slate-900">
                        <th className="border-b border-slate-300 px-4 py-3">
                          No.
                        </th>

                        <th className="border-b border-slate-300 px-4 py-3">
                          Admission No.
                        </th>

                        <th className="border-b border-slate-300 px-4 py-3">
                          Learner Name
                        </th>

                        <th className="border-b border-slate-300 px-4 py-3">
                          Marks / 100
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row, index) => (
                        <tr
                          key={row.student.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
                            {index + 1}
                          </td>

                          <td className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
                            {row.student.admissionNumber || "—"}
                          </td>

                          <td className="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-950">
                            {row.student.name}
                          </td>

                          <td className="border-b border-slate-200 px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={marks[row.student.id] || ""}
                              onChange={(event) =>
                                setMarks((current) => ({
                                  ...current,
                                  [row.student.id]:
                                    event.target.value,
                                }))
                              }
                              className="w-32 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end border-t border-slate-300 px-6 py-5">
                  <button
                    type="button"
                    onClick={saveMarks}
                    disabled={saving}
                    className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Marks"}
                  </button>
                </div>
              </>
            )}
          </section>
        </section>

        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-950">
              Final Grade Results
            </h2>

            <p className="mt-2 text-slate-700">
              View the complete examination results for a grade,
              including subject marks, expectations, total marks,
              total points and position.
            </p>
          </div>

          {finalError && (
            <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {finalError}
            </div>
          )}

          <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-300 p-6">
              <label
                htmlFor="final-examination"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Select Examination
              </label>

              <select
                id="final-examination"
                value={finalExaminationId}
                onChange={(event) =>
                  setFinalExaminationId(event.target.value)
                }
                className="w-full max-w-xl rounded-lg border border-slate-400 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              >
                <option value="">Select examination</option>

                {examinations.map((examination) => (
                  <option
                    key={examination.id}
                    value={examination.id}
                  >
                    {examination.term.academicYear.year} —{" "}
                    {examination.term.name} —{" "}
                    {examination.grade.name} —{" "}
                    {examination.name}
                  </option>
                ))}
              </select>

              {selectedFinalExamination && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                  <strong>
                    {selectedFinalExamination.grade.name}
                  </strong>
                  {" · "}
                  {selectedFinalExamination.term.name}
                  {" · "}
                  {selectedFinalExamination.name}
                </div>
              )}
            </div>

            {finalLoading ? (
              <div className="px-6 py-10 text-center font-medium text-slate-700">
                Loading final grade results...
              </div>
            ) : finalRows.length === 0 ? (
              <div className="px-6 py-10 text-center font-medium text-slate-700">
                No final results are available for the selected
                examination.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-left text-sm font-bold text-white">
                      <th className="border border-slate-600 px-3 py-3">
                        No.
                      </th>

                      <th className="border border-slate-600 px-3 py-3">
                        Admission No.
                      </th>

                      <th className="border border-slate-600 px-3 py-3">
                        Learner Name
                      </th>

                      {finalSubjectResults.map((subject) => (
                        <React.Fragment key={subject.subjectId}>
                          <th className="border border-slate-600 px-3 py-3 text-center">
                            {subject.subjectName}
                            <div className="mt-1 text-xs font-medium text-white">
                              Mark
                            </div>
                          </th>

                          <th className="border border-slate-600 px-3 py-3 text-center">
                            {subject.subjectName}
                            <div className="mt-1 text-xs font-medium text-white">
                              Expectation
                            </div>
                          </th>
                        </React.Fragment>
                      ))}

                      <th className="border border-slate-600 px-3 py-3">
                        Total Marks
                      </th>

                      <th className="border border-slate-600 px-3 py-3">
                        Total Points
                      </th>

                      <th className="border border-slate-600 px-3 py-3">
                        POS
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {finalRows.map((student, index) => (
                      <tr
                        key={student.studentId}
                        className="bg-white hover:bg-slate-50"
                      >
                        <td className="border border-slate-300 px-3 py-3 text-sm font-bold text-slate-950">
                          {index + 1}
                        </td>

                        <td className="border border-slate-300 px-3 py-3 text-sm font-bold text-slate-950">
                          {student.admissionNumber}
                        </td>

                        <td className="border border-slate-300 px-3 py-3 text-sm font-bold text-slate-950">
                          {student.name}
                        </td>

                        {finalSubjectResults.map((subject) => {
                          const mark =
                            student.marksBySubject[
                              subject.subjectId
                            ] ?? null;

                          const expectation =
                            getExpectation(mark);

                          return (
                            <React.Fragment
                              key={subject.subjectId}
                            >
                              <td className="border border-slate-300 px-3 py-3 text-center text-sm font-bold text-slate-950">
                                {mark === null ? "—" : mark}
                              </td>

                              <td className="border border-slate-300 px-3 py-3 text-center text-sm font-extrabold text-slate-950">
                                {expectation.code}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        <td className="border border-slate-300 px-3 py-3 text-center text-sm font-extrabold text-slate-950">
                          {student.totalMarks}
                        </td>

                        <td className="border border-slate-300 px-3 py-3 text-center text-sm font-extrabold text-slate-950">
                          {student.totalPoints}
                        </td>

                        <td className="border border-slate-300 px-3 py-3 text-center text-sm font-extrabold text-slate-950">
                          {student.position}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="mt-4 rounded-lg border border-slate-300 bg-white px-5 py-4 text-sm font-medium text-slate-800">
            <strong className="font-bold">Expectation scale:</strong>{" "}
            EE = 75–100 (8 points), ME = 51–74 (6 points), AE =
            25–50 (4 points), BE = 1–24 (2 points).
          </div>
        </section>
      </div>
    </main>
  );
}