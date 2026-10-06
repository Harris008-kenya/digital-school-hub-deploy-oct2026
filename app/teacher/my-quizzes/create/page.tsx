
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Assignment = {
  id: string;
  gradeId: string;
  subjectId: string;
  grade: {
    id: string;
    name: string;
    level: number;
  };
  subject: {
    id: string;
    name: string;
  };
};

type TeacherResponse = {
  teacher?: {
    assignments?: Assignment[];
  };
};

export default function CreateQuizPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadTeacher() {
      try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
          setError("Please sign in as a teacher.");
          return;
        }

        const data = (await response.json()) as TeacherResponse;
        const teacherAssignments = data.teacher?.assignments ?? [];

        setAssignments(teacherAssignments);

        if (teacherAssignments.length > 0) {
          setGradeId(teacherAssignments[0].gradeId);
          setSubjectId(teacherAssignments[0].subjectId);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load your teacher assignments.");
      } finally {
        setLoading(false);
      }
    }

    void loadTeacher();
  }, []);

  const grades = useMemo(() => {
    const map = new Map<string, Assignment["grade"]>();

    for (const assignment of assignments) {
      map.set(assignment.grade.id, assignment.grade);
    }

    return Array.from(map.values()).sort(
      (a, b) => a.level - b.level
    );
  }, [assignments]);

  const subjects = useMemo(() => {
    const map = new Map<string, Assignment["subject"]>();

    for (const assignment of assignments) {
      if (assignment.gradeId === gradeId) {
        map.set(assignment.subject.id, assignment.subject);
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [assignments, gradeId]);

  function handleGradeChange(value: string) {
    setGradeId(value);

    const firstAssignmentForGrade = assignments.find(
      (assignment) => assignment.gradeId === value
    );

    setSubjectId(firstAssignmentForGrade?.subjectId ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Please enter a quiz title.");
      return;
    }

    if (!gradeId) {
      setError("Please select a grade.");
      return;
    }

    if (!subjectId) {
      setError("Please select a subject.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/teacher/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          gradeId,
          subjectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Failed to create quiz.");
        return;
      }

      setSuccess("Quiz created successfully as a draft.");

      setTitle("");
      setDescription("");

      if (data.quiz?.id) {
        window.location.href = `/teacher/my-quizzes/${data.quiz.id}`;
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while creating the quiz.");
    } finally {
      setSaving(false);
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
            Create New Quiz
          </h2>

          <p className="mt-3 max-w-3xl text-blue-100">
            Create a quiz for one of the grades and subjects assigned
            to you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900">
              Quiz Information
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              The quiz will initially be saved as a draft.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">
              Loading your assignments...
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6">
              <h3 className="font-bold text-amber-900">
                No teaching assignments found
              </h3>

              <p className="mt-2 text-sm text-amber-800">
                You need to be assigned a grade and subject before
                you can create a quiz. Please contact the School
                Administrator.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Quiz Title
                </label>

                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Mathematics Revision Quiz"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Optional description for this quiz"
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="grade"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Grade
                </label>

                <select
                  id="grade"
                  value={gradeId}
                  onChange={(event) =>
                    handleGradeChange(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Subject
                </label>

                <select
                  id="subject"
                  value={subjectId}
                  onChange={(event) =>
                    setSubjectId(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  {subjects.length === 0 ? (
                    <option value="">
                      No subject assigned to this grade
                    </option>
                  ) : (
                    subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                  {success}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-end">
                <Link
                  href="/teacher/my-quizzes"
                  className="rounded-lg border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Creating Quiz..." : "Create Quiz"}
                </button>
              </div>
            </form>
          )}
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