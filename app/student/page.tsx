"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Student = {
  id: string;
  name: string;
  admissionNumber?: string | null;
  school?: {
    id: string;
    name: string;
  } | null;
  grade?: {
    id: string;
    name: string;
    level?: number | null;
  } | null;
};

type StudentResult = {
  id: string;
  examinationId: string;
  examinationName: string;
  termName: string;
  academicYearName: string;
  gradeName: string;
  totalMarks: number;
  position: number | null;
  subjectResults: {
    subjectId: string;
    subjectName: string;
    marks: number;
  }[];
};

export default function StudentDashboard() {
  const [student, setStudent] = useState<Student | null>(null);

  const [loading, setLoading] = useState(true);

  const [results, setResults] = useState<StudentResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [resultsMessage, setResultsMessage] = useState("");
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);

        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          window.location.href = "/login";
          return;
        }

        const data = await response.json();

        const currentStudent =
          data?.student ??
          (data?.role === "STUDENT" ? data : null);

        if (!currentStudent) {
          window.location.href = "/login";
          return;
        }

        setStudent(currentStudent);
      } catch (error) {
        console.error("Failed to load student:", error);
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    }

    void loadStudent();
  }, []);

  async function viewResults(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setResultsError("");
    setResultsMessage("");
    setResults([]);
    setShowResults(false);
    setResultsLoading(true);

    try {
      const response = await fetch("/api/student-results", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to retrieve examination results.",
        );
      }

      setResults(data.results || []);
      setShowResults(true);

      if (!data.results || data.results.length === 0) {
        setResultsMessage(
          "No examination results have been published for you yet.",
        );
      }
    } catch (error) {
      console.error("Failed to retrieve examination results:", error);

      setResultsError(
        error instanceof Error
          ? error.message
          : "Failed to retrieve examination results.",
      );
    } finally {
      setResultsLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="rounded-2xl bg-white px-8 py-10 text-center shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm font-medium text-slate-600">
              Loading your student dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              Student Portal
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
            >
              Home
            </Link>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/login";
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Welcome section */}
      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Student Dashboard
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Welcome, {student.name}
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            Access your learning resources, examination results,
            quizzes and other school services from your student
            portal.
          </p>
        </div>
      </section>

      {/* Student information */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student Name
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {student.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Admission Number
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {student.admissionNumber || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Grade
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {student.grade?.name || "Not assigned"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                School
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {student.school?.name || "Not available"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main dashboard cards */}
      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* My Learning */}
          <Link
            href="/student/learning-resources"
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:ring-blue-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
              📚
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              My Learning
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Access notes, revision materials, exercises,
              assignments and other learning resources for your
              grade.
            </p>

            <p className="mt-4 text-sm font-bold text-blue-700 group-hover:underline">
              Open Learning Resources →
            </p>
          </Link>

          {/* Examination Results */}
          <button
            type="button"
            onClick={() => {
              document
                .getElementById("results-section")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
            className="group rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:ring-emerald-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl">
              📊
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              Examination Results
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              View your examination marks, total marks and
              position in your grade.
            </p>

            <p className="mt-4 text-sm font-bold text-emerald-700 group-hover:underline">
              View Examination Results →
            </p>
          </button>

          {/* My Quizzes */}
          <Link
            href="/student/quizzes"
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:ring-purple-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl">
              📝
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              My Quizzes
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Take quizzes published by your teachers and
              practise what you have learned.
            </p>

            <p className="mt-4 text-sm font-bold text-purple-700 group-hover:underline">
              Open My Quizzes →
            </p>
          </Link>

          {/* Quiz History */}
          <Link
            href="/student/quizzes"
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:ring-orange-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-2xl">
              📋
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              Quiz History
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review your available quizzes and continue your
              learning activities.
            </p>

            <p className="mt-4 text-sm font-bold text-orange-700 group-hover:underline">
              View Quiz Activities →
            </p>
          </Link>

          {/* Student Profile */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">
              👤
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              My Profile
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your student account information is displayed
              here for reference.
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-semibold text-slate-700">
                  Name:
                </span>{" "}
                {student.name}
              </p>

              <p>
                <span className="font-semibold text-slate-700">
                  Admission:
                </span>{" "}
                {student.admissionNumber || "Not provided"}
              </p>

              <p>
                <span className="font-semibold text-slate-700">
                  Grade:
                </span>{" "}
                {student.grade?.name || "Not assigned"}
              </p>
            </div>
          </div>

          {/* School Information */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-2xl">
              🏫
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              School Information
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Information about your current school and grade.
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-semibold text-slate-700">
                  School:
                </span>{" "}
                {student.school?.name || "Not available"}
              </p>

              <p>
                <span className="font-semibold text-slate-700">
                  Grade:
                </span>{" "}
                {student.grade?.name || "Not assigned"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Examination Results */}
      <section
        id="results-section"
        className="scroll-mt-6 border-t bg-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              Academic Performance
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-950">
              Examination Results
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Your results are securely retrieved using your
              current student account. You do not need to enter
              your name or admission number again.
            </p>
          </div>

          <section className="rounded-2xl bg-slate-50 p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  View My Results
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  Click the button below to retrieve all
                  examination results currently available for
                  your account.
                </p>
              </div>

              <form onSubmit={viewResults}>
                <button
                  type="submit"
                  disabled={resultsLoading}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resultsLoading
                    ? "Loading Results..."
                    : "View Examination Results"}
                </button>
              </form>
            </div>

            {resultsError ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {resultsError}
              </div>
            ) : null}

            {resultsMessage ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                {resultsMessage}
              </div>
            ) : null}
          </section>

          {showResults && results.length > 0 ? (
            <div className="mt-8 space-y-8">
              {results.map((result) => (
                <section
                  key={result.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
                >
                  {/* Examination heading */}
                  <div className="border-b bg-slate-50 px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                          Examination
                        </p>

                        <h3 className="mt-1 text-2xl font-bold text-slate-950">
                          {result.examinationName}
                        </h3>

                        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                          <p>
                            <span className="font-semibold">
                              Academic Year:
                            </span>{" "}
                            {result.academicYearName}
                          </p>

                          <p>
                            <span className="font-semibold">
                              Term:
                            </span>{" "}
                            {result.termName}
                          </p>

                          <p>
                            <span className="font-semibold">
                              Grade:
                            </span>{" "}
                            {result.gradeName}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                        <div className="rounded-xl bg-blue-50 p-4 text-center ring-1 ring-blue-100">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Total Marks
                          </p>

                          <p className="mt-1 text-2xl font-bold text-blue-900">
                            {result.totalMarks}
                          </p>
                        </div>

                        <div className="rounded-xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                            Position
                          </p>

                          <p className="mt-1 text-2xl font-bold text-emerald-900">
                            {result.position !== null
                              ? result.position
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subject results */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-left text-sm font-bold text-slate-900">
                          <th className="border-b border-slate-300 px-6 py-4">
                            No.
                          </th>

                          <th className="border-b border-slate-300 px-6 py-4">
                            Subject
                          </th>

                          <th className="border-b border-slate-300 px-6 py-4 text-center">
                            Marks
                          </th>

                          <th className="border-b border-slate-300 px-6 py-4 text-center">
                            CBC Level
                          </th>

                          <th className="border-b border-slate-300 px-6 py-4 text-center">
                            CBC Points
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {(result.subjectResults ?? []).map(
                          (subject, index) => {
                            const marks = Number(subject.marks);

                            let level = "BE";
                            let points = 2;

                            if (marks >= 75) {
                              level = "EE";
                              points = 8;
                            } else if (marks >= 51) {
                              level = "ME";
                              points = 6;
                            } else if (marks >= 25) {
                              level = "AE";
                              points = 4;
                            }

                            return (
                              <tr
                                key={subject.subjectId}
                                className="hover:bg-slate-50"
                              >
                                <td className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-700">
                                  {index + 1}
                                </td>

                                <td className="border-b border-slate-200 px-6 py-4 text-sm font-bold text-slate-950">
                                  {subject.subjectName}
                                </td>

                                <td className="border-b border-slate-200 px-6 py-4 text-center text-sm font-bold text-slate-900">
                                  {marks}
                                </td>

                                <td className="border-b border-slate-200 px-6 py-4 text-center">
                                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                                    {level}
                                  </span>
                                </td>

                                <td className="border-b border-slate-200 px-6 py-4 text-center text-sm font-bold text-slate-900">
                                  {points}
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>

                      <tfoot>
                        <tr className="bg-slate-50">
                          <td
                            colSpan={2}
                            className="px-6 py-4 text-right text-sm font-bold text-slate-900"
                          >
                            Total Marks
                          </td>

                          <td className="px-6 py-4 text-center text-lg font-bold text-blue-700">
                            {result.totalMarks}
                          </td>

                          <td
                            colSpan={2}
                            className="px-6 py-4 text-center text-sm font-semibold text-slate-600"
                          >
                            Position:{" "}
                            <span className="font-bold text-slate-900">
                              {result.position !== null
                                ? result.position
                                : "—"}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-500">
          © 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}