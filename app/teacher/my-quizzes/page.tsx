
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  grade: {
    name: string;
  };
  subject: {
    name: string;
  };
  questions: {
    id: string;
  }[];
};

export default function TeacherMyQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/teacher/quizzes");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load quizzes"
        );
      }

      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load quizzes"
      );
    } finally {
      setLoading(false);
    }
  }

  async function togglePublished(quiz: Quiz) {
    const newPublishedStatus = !quiz.published;

    if (
      newPublishedStatus &&
      quiz.questions.length === 0
    ) {
      setError(
        "A quiz must have at least one question before it can be published."
      );
      setMessage("");
      return;
    }

    const action = newPublishedStatus
      ? "publish"
      : "unpublish";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${quiz.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(quiz.id);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/teacher/quizzes",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quizId: quiz.id,
            published: newPublishedStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${action} quiz`
        );
      }

      setQuizzes((currentQuizzes) =>
        currentQuizzes.map((item) =>
          item.id === quiz.id
            ? {
                ...item,
                published: data.quiz.published,
              }
            : item
        )
      );

      setMessage(
        newPublishedStatus
          ? "Quiz published successfully."
          : "Quiz unpublished successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${action} quiz`
      );
    } finally {
      setUpdatingId(null);
    }
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

          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Teacher Dashboard
            </Link>

            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Home
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
            My Quizzes
          </h2>

          <p className="mt-3 max-w-3xl text-blue-100">
            Create, manage and publish quizzes for the
            grades and subjects assigned to you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              My Quizzes
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Quizzes created by you are shown here.
            </p>
          </div>

          <Link
            href="/teacher/my-quizzes/create"
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + Create New Quiz
          </Link>
        </div>

        {message && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Loading quizzes...
            </p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📝</div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              No quizzes yet
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
              You have not created any quizzes yet. Create
              your first quiz for one of your assigned
              subjects and grades.
            </p>

            <Link
              href="/teacher/my-quizzes/create"
              className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Create Your First Quiz
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => {
              const isUpdating =
                updatingId === quiz.id;

              return (
                <article
                  key={quiz.id}
                  className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                      📝
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        quiz.published
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {quiz.published
                        ? "Published"
                        : "Draft"}
                    </span>
                  </div>

                  <h4 className="mt-5 text-xl font-bold text-slate-900">
                    {quiz.title}
                  </h4>

                  {quiz.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {quiz.description}
                    </p>
                  )}

                  <div className="mt-5 space-y-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Grade
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {quiz.grade.name}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Subject
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {quiz.subject.name}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Questions
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {quiz.questions.length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
                    <Link
                      href={`/teacher/my-quizzes/${quiz.id}`}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Open Quiz
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        togglePublished(quiz)
                      }
                      disabled={isUpdating}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                        quiz.published
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {isUpdating
                        ? "Updating..."
                        : quiz.published
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
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