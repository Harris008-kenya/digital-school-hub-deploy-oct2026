"use client";

import { useEffect, useMemo, useState } from "react";

type TeacherAssignment = {
  gradeId: string;
};

type TeacherProfile = {
  name: string;
  assignments: TeacherAssignment[];
};

export default function TeacherDashboard() {
  const [teacher, setTeacher] =
    useState<TeacherProfile | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then(async (response) =>
        response.ok ? response.json() : null
      )
      .then((data) =>
        setTeacher(data?.teacher ?? null)
      );
  }, []);

  const classCount = useMemo(
    () =>
      new Set(
        teacher?.assignments.map(
          (assignment) => assignment.gradeId
        ) ?? []
      ).size,
    [teacher]
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              Teacher Dashboard
            </p>
          </div>

          <a
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Home
          </a>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Teacher Portal
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Welcome, {teacher?.name || "Teacher"}
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            Manage your classes, subjects, assignments,
            quizzes and student performance from one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">📚</div>

            <h3 className="mt-4 text-xl font-bold">
              My Classes
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              View and manage the classes assigned to you.
            </p>

            <button
              type="button"
              className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">📖</div>

            <h3 className="mt-4 text-xl font-bold">
              My Subjects
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Access the subjects and learning materials you teach.
            </p>

            <a
              href="/teacher/my-subjects"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open
            </a>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">📝</div>

            <h3 className="mt-4 text-xl font-bold">
              Enter Marks
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter and save learner marks for your assigned subjects
              and examinations.
            </p>

            <a
              href="/teacher/results"
              className="mt-5 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Open
            </a>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">📝</div>

            <h3 className="mt-4 text-xl font-bold">
              My Quizzes
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create, manage and publish quizzes for your assigned
              grades and subjects.
            </p>

            <a
              href="/teacher/my-quizzes"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open
            </a>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">📊</div>

            <h3 className="mt-4 text-xl font-bold">
              Final Results
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              View complete examination results for grades across the
              school.
            </p>

            <a
              href="/teacher/final-results"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open
            </a>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">👨‍🏫</div>

            <h3 className="mt-4 text-xl font-bold">
              Students
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              View students in your assigned classes.
            </p>

            <button
              type="button"
              className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">📢</div>

            <h3 className="mt-4 text-xl font-bold">
              Announcements
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              View important announcements created by your school
              administrator.
            </p>

            <a
              href="/teacher/announcements"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open
            </a>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">📚</div>

            <h3 className="mt-4 text-xl font-bold">
              Learning Resources
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Access platform-wide notes, revision materials,
              exercises, assignments and study guides for all grades
              and subjects.
            </p>

            <a
              href="/teacher/learning-resources"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-2xl font-bold">
            Teacher Information
          </h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Teacher Name
              </p>

              <p className="mt-1 font-semibold">
                {teacher?.name || "Not signed in"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Subjects
              </p>

              <p className="mt-1 font-semibold">
                {teacher
                  ? teacher.assignments.length
                  : "Not assigned"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Classes
              </p>

              <p className="mt-1 font-semibold">
                {teacher ? classCount : "Not assigned"}
              </p>
            </div>
          </div>
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