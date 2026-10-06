"use client";

import { useEffect, useState } from "react";

type Grade = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  admissionNumber?: string | null;
  grade: Grade;
};

type Administrator = {
  id: string;
  name: string;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  targetType:
    | "ALL_PARENTS"
    | "GRADE"
    | "STUDENT"
    | "SELECTED_PARENTS";
  createdAt: string;
  grade?: Grade | null;
  student?: Student | null;
  administrator: Administrator;
};

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/teacher/announcements"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load announcements"
          );
        }

        setAnnouncements(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load announcements"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadAnnouncements();
  }, []);

  function getStudentName(student: Student) {
    return [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function getTargetLabel(
    announcement: Announcement
  ) {
    if (announcement.targetType === "ALL_PARENTS") {
      return "All Parents / Guardians";
    }

    if (announcement.targetType === "GRADE") {
      return announcement.grade
        ? `Parents / Guardians of ${announcement.grade.name}`
        : "Parents / Guardians of a Grade";
    }

    if (announcement.targetType === "STUDENT") {
      return announcement.student
        ? `Parents / Guardians of ${getStudentName(
            announcement.student
          )}`
        : "Parents / Guardians of a Student";
    }

    return "Selected Parents / Guardians";
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
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

          <a
            href="/teacher"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Teacher Portal
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            School Announcements
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            View announcements created by your school
            administrator.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {loading && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-medium text-slate-600">
              Loading announcements...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 font-medium text-red-800">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          announcements.length === 0 && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-5xl">📢</div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                No Announcements Yet
              </h3>

              <p className="mt-2 text-slate-600">
                Your school administrator has not
                created any announcements yet.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          announcements.length > 0 && (
            <div className="space-y-6">
              {announcements.map(
                (announcement) => (
                  <article
                    key={announcement.id}
                    className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {announcement.title}
                        </h3>

                        <p className="mt-2 text-sm font-medium text-slate-500">
                          {formatDate(
                            announcement.createdAt
                          )}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                        School Announcement
                      </span>
                    </div>

                    <div className="mt-5 rounded-xl bg-slate-50 p-5">
                      <p className="whitespace-pre-wrap leading-7 text-slate-800">
                        {announcement.message}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Sent To
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {getTargetLabel(
                            announcement
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Created By
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {announcement.administrator
                            .name}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              )}
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