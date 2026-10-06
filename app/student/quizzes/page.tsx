"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  subject: {
    id: string;
    name: string;
  };
  grade: {
    id: string;
    name: string;
  };
  questions: {
    id: string;
    question: string;
    options: {
      id: string;
      text: string;
    }[];
  }[];
};

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const response = await fetch("/api/student/quizzes");

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load quizzes.");
        }

        setQuizzes(data.quizzes || []);
      } catch (error) {
        console.error("Error loading quizzes:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load quizzes."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadQuizzes();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              Student Quizzes
            </p>
          </div>

          <Link
            href="/student"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            ← Back to Student Dashboard
          </Link>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Student Portal
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            My Quizzes
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            Complete published quizzes for your grade and test
            your understanding of different subjects.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {loading && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-600">
              Loading quizzes...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && quizzes.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <div className="text-4xl">📝</div>

            <h3 className="mt-4 text-xl font-bold">
              No quizzes available
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              There are currently no published quizzes available
              for your grade.
            </p>

            <Link
              href="/student"
              className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              ← Back to Student Dashboard
            </Link>
          </div>
        )}

        {!loading && !error && quizzes.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {quiz.subject.name}
                    </span>

                    <h3 className="mt-4 text-xl font-bold text-slate-900">
                      {quiz.title}
                    </h3>
                  </div>

                  <div className="text-3xl">📝</div>
                </div>

                {quiz.description && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {quiz.description}
                  </p>
                )}

                <div className="mt-5 space-y-2 text-sm text-slate-500">
                  <p>
                    <span className="font-semibold text-slate-700">
                      Grade:
                    </span>{" "}
                    {quiz.grade.name}
                  </p>

                  <p>
                    <span className="font-semibold text-slate-700">
                      Questions:
                    </span>{" "}
                    {quiz.questions.length}
                  </p>
                </div>

                <Link
                  href={`/student/quizzes/${quiz.id}`}
                  className="mt-6 inline-block w-full rounded-lg bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Start Quiz
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/student"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            ← Back to Student Dashboard
          </Link>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          © 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}