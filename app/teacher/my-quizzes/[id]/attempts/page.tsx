"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type QuizAttempt = {
  id: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  percentage: number;
  completedAt: string;
  student: {
    id: string;
    name: string;
    admissionNumber: string | null;
    grade: {
      name: string;
    };
  };
};

type Quiz = {
  id: string;
  title: string;
  grade: {
    name: string;
  };
  subject: {
    name: string;
  };
};

export default function TeacherQuizAttemptsPage() {
  const params = useParams();

  const quizId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quizId) {
      setError("Quiz ID is missing.");
      setLoading(false);
      return;
    }

    async function loadAttempts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/teacher/quizzes/${quizId}/attempts`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load quiz attempts."
          );
        }

        setQuiz(data.quiz);
        setAttempts(data.attempts || []);
      } catch (err) {
        console.error(
          "Error loading quiz attempts:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load quiz attempts."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadAttempts();
  }, [quizId]);

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              Teacher Portal
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/teacher/my-quizzes"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              My Quizzes
            </Link>

            <Link
              href="/teacher"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Teacher Portal
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Quiz Attempts
          </h2>

          {quiz && (
            <>
              <p className="mt-3 text-2xl font-semibold">
                {quiz.title}
              </p>

              <p className="mt-2 text-blue-100">
                {quiz.subject.name} ·{" "}
                {quiz.grade.name}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6">
          <Link
            href={
              quizId
                ? `/teacher/my-quizzes/${quizId}`
                : "/teacher/my-quizzes"
            }
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Back to Quiz
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-600">
              Loading student attempts...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && quiz && (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Quiz
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {quiz.title}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Students Attempted
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-700">
                  {attempts.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Subject
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {quiz.subject.name}
                </p>
              </div>
            </div>

            {attempts.length === 0 ? (
              <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
                <div className="text-5xl">📊</div>

                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  No student attempts yet
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                  Students who complete this published quiz
                  will appear here with their scores and
                  completion details.
                </p>
              </div>
            ) : (
              <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left">
                        <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                          #
                        </th>

                        <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                          Student
                        </th>

                        <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                          Admission No.
                        </th>

                        <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                          Grade
                        </th>

                        <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                          Correct
                        </th>

                        <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                          Answered
                        </th>

                        <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                          Total
                        </th>

                        <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                          Percentage
                        </th>

                        <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                          Completed
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {attempts.map(
                        (attempt, index) => (
                          <tr
                            key={attempt.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                              {index + 1}
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {attempt.student.name}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              {attempt.student
                                .admissionNumber ||
                                "—"}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              {
                                attempt.student
                                  .grade.name
                              }
                            </td>

                            <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                              {
                                attempt.correctAnswers
                              }
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              {
                                attempt.answeredQuestions
                              }
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              {
                                attempt.totalQuestions
                              }
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${
                                  attempt.percentage >=
                                  70
                                    ? "bg-green-100 text-green-800"
                                    : attempt.percentage >=
                                        50
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {
                                  attempt.percentage
                                }
                                %
                              </span>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {formatDate(
                                attempt.completedAt
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          © 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}