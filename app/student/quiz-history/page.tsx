"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type QuizAttempt = {
  id: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  percentage: number;
  completedAt: string;
  quiz: {
    id: string;
    title: string;
    subject: {
      id: string;
      name: string;
    };
    grade: {
      id: string;
      name: string;
    };
  };
};

export default function QuizHistoryPage() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAttempts() {
      try {
        const response = await fetch(
          "/api/student/quiz-attempts"
        );

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load quiz history."
          );
        }

        setAttempts(data.attempts || []);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load quiz history."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAttempts();
  }, []);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Quiz History
            </h1>

            <p className="mt-2 text-slate-600">
              View your completed quizzes and results.
            </p>
          </div>

          <Link
            href="/student/quizzes"
            className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Quizzes
          </Link>
        </div>

        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-600">
              Loading quiz history...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-semibold text-red-800">
              Unable to load quiz history
            </h2>

            <p className="mt-2 text-red-700">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && attempts.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              No completed quizzes yet
            </h2>

            <p className="mt-2 text-slate-600">
              Your completed quiz attempts will appear here.
            </p>

            <Link
              href="/student/quizzes"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
            >
              Take a Quiz
            </Link>
          </div>
        )}

        {!loading && !error && attempts.length > 0 && (
          <div className="space-y-5">
            {attempts.map((attempt) => (
              <article
                key={attempt.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {attempt.quiz.title}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                        {attempt.quiz.subject.name}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                        {attempt.quiz.grade.name}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-500">
                      Completed:{" "}
                      {formatDate(attempt.completedAt)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-100 px-6 py-4 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Score
                    </p>

                    <p className="text-3xl font-bold text-slate-900">
                      {attempt.percentage}%
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">
                      Correct
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {attempt.correctAnswers}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">
                      Answered
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {attempt.answeredQuestions}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">
                      Total Questions
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {attempt.totalQuestions}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}