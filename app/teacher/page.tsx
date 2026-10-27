"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TeacherAssignment = {
  id: string;
  gradeId: string;
  subjectId: string;
  grade: {
    id: string;
    name: string;
    level: number;
    schoolId: string;
  };
  subject: {
    id: string;
    name: string;
  };
};

type ClassTeacherAssignment = {
  id: string;
  gradeId: string;
  grade: {
    id: string;
    name: string;
    level: number;
    schoolId: string;
  };
};

type TeacherProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  assignments: TeacherAssignment[];
  classTeacherAssignments: ClassTeacherAssignment[];
};

export default function TeacherDashboard() {
  const [teacher, setTeacher] =
    useState<TeacherProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [schoolSubjects, setSchoolSubjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadTeacher() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/auth/teacher-me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setTeacher(null);
            setError(
              data?.error ||
                "Your teacher session could not be verified."
            );
          }

          return;
        }

        if (!data?.teacher) {
          if (!cancelled) {
            setTeacher(null);
            setError(
              "You are not currently signed in as a teacher."
            );
          }

          return;
        }

        if (!cancelled) {
          setTeacher(data.teacher);

          try {
            const subjectsResponse = await fetch("/api/subjects", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            });

            if (subjectsResponse.ok) {
              const subjectsData = await subjectsResponse.json();
              const subjects = Array.isArray(subjectsData)
                ? subjectsData
                : subjectsData?.subjects;

              if (!cancelled && Array.isArray(subjects)) {
                setSchoolSubjects(subjects);
              }
            }
          } catch (subjectsError) {
            console.error("Error loading school-configured subjects:", subjectsError);
          }
        }
      } catch (err) {
        console.error(
          "Error loading teacher information:",
          err
        );

        if (!cancelled) {
          setTeacher(null);
          setError(
            "Unable to load your teacher information. Please refresh the page."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTeacher();

    return () => {
      cancelled = true;
    };
  }, []);

  const uniqueSubjects = useMemo(
    () => schoolSubjects.map((subject) => subject.name),
    [schoolSubjects]
  );

  const uniqueClasses = useMemo(() => {
    if (!teacher) {
      return [];
    }

    const classes = new Map<
      string,
      string
    >();

    for (const assignment of teacher.assignments) {
      classes.set(
        assignment.grade.id,
        assignment.grade.name
      );
    }

    for (const assignment of teacher.classTeacherAssignments) {
      classes.set(
        assignment.grade.id,
        assignment.grade.name
      );
    }

    return Array.from(classes.values()).sort(
      (a, b) => {
        const levelA =
          Number(
            a.replace(/\D/g, "")
          ) || 0;

        const levelB =
          Number(
            b.replace(/\D/g, "")
          ) || 0;

        return levelA - levelB;
      }
    );
  }, [teacher]);

  const subjectCount = uniqueSubjects.length;

  const classCount = uniqueClasses.length;

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

          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Home
          </Link>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Teacher Portal
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Welcome,{" "}
            {loading
              ? "Teacher"
              : teacher?.name || "Teacher"}
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            Manage your classes, subjects, assignments,
            quizzes and student performance from one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {loading && (
          <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-800">
            Loading your teacher information...
          </div>
        )}

        {!loading && error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-semibold">
              Unable to load teacher information
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">&#128197;</div>
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
            <div className="text-3xl">&#128218;</div>
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
            <div className="text-3xl">&#9997;</div>
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
            <div className="text-3xl">&#128221;</div>
            <h3 className="mt-4 text-xl font-bold">
              My Quizzes
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create, manage and publish quizzes for your assigned
              grades and subjects.
            </p>

            <Link
              href="/teacher/my-quizzes"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl">&#128202;</div>
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
            <div className="text-3xl">&#128101;</div>
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
            <div className="text-3xl">&#128227;</div>
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
            <div className="text-3xl">&#128214;</div>
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
                {loading
                  ? "Loading..."
                  : teacher?.name || "Not signed in"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Subjects
              </p>

              <p className="mt-1 font-semibold">
                {loading
                  ? "Loading..."
                  : teacher
                    ? subjectCount
                    : "Not assigned"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Classes
              </p>

              <p className="mt-1 font-semibold">
                {loading
                  ? "Loading..."
                  : teacher
                    ? classCount
                    : "Not assigned"}
              </p>
            </div>
          </div>

          {teacher && (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-5">
                <h4 className="font-bold">
                  Assigned Subjects
                </h4>

                <div className="mt-4 flex flex-wrap gap-2">
                  {uniqueSubjects.map(
                    (subject) => (
                      <span
                        key={subject}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
                      >
                        {subject}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <h4 className="font-bold">
                  Assigned Classes
                </h4>

                <div className="mt-4 flex flex-wrap gap-2">
                  {uniqueClasses.map(
                    (grade) => (
                      <span
                        key={grade}
                        className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700"
                      >
                        {grade}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
        &#169; 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}