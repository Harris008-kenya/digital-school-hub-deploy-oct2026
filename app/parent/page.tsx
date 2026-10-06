"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Child = {
  parentContactId: string;
  studentId: string;
  studentName: string;
  relationship: string | null;
};

type ParentData = {
  id: string;
  name: string;
  phoneNumber: string;
  school: {
    id: string;
    name: string;
    code: string;
  };
  children: Child[];
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  targetType: string;
  grade: string | null;
  student: string | null;
  createdAt: string;
  readAt: string | null;
  child: {
    parentContactId: string;
    studentId: string;
    studentName: string;
  };
  postedBy: string;
};

type ChildResult = {
  id: string;
  subject: string;
  marks: number;
  performanceLevel: string;
  points: number;
  examination: string;
  examinationId: string;
  grade: string;
  term: string;
  academicYear: number;
  totalMarks: number;
  position: number | null;
};

type ChildResultsResponse = {
  child: {
    parentContactId: string;
    studentId: string;
    name: string;
    admissionNumber: string | null;
    grade: string;
    school: string;
    relationship: string | null;
  };
  results: ChildResult[];
};

export default function ParentPage() {
  const router = useRouter();

  const [parent, setParent] = useState<ParentData | null>(null);
  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] =
    useState(true);

  const [loggingOut, setLoggingOut] = useState(false);
  const [markingReadId, setMarkingReadId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [announcementError, setAnnouncementError] =
    useState("");

  const [selectedChildId, setSelectedChildId] =
    useState<string | null>(null);

  const [childResults, setChildResults] =
    useState<ChildResultsResponse | null>(null);

  const [resultsLoading, setResultsLoading] =
    useState(false);

  const [resultsError, setResultsError] = useState("");

  useEffect(() => {
    async function loadParent() {
      try {
        const response = await fetch("/api/parent/me", {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.error || "Unable to load parent account."
          );
          return;
        }

        setParent(data.parent);
      } catch {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    loadParent();
  }, [router]);

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const response = await fetch(
          "/api/parent/announcements",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          setAnnouncementError(
            data.error || "Unable to load announcements."
          );
          return;
        }

        setAnnouncements(data.announcements || []);
      } catch {
        setAnnouncementError(
          "Unable to connect to the announcements service."
        );
      } finally {
        setAnnouncementsLoading(false);
      }
    }

    loadAnnouncements();
  }, [router]);

  async function handleViewResults(studentId: string) {
    setSelectedChildId(studentId);
    setChildResults(null);
    setResultsError("");
    setResultsLoading(true);

    try {
      const response = await fetch(
        `/api/parent/results?studentId=${encodeURIComponent(
          studentId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setResultsError(
          data.error || "Unable to load student results."
        );
        return;
      }

      setChildResults(data);
    } catch {
      setResultsError(
        "Unable to connect to the results service."
      );
    } finally {
      setResultsLoading(false);
    }
  }

  function handleCloseResults() {
    setSelectedChildId(null);
    setChildResults(null);
    setResultsError("");
  }

  async function handleMarkAsRead(announcementId: string) {
    const announcement = announcements.find(
      (item) => item.id === announcementId
    );

    if (!announcement || announcement.readAt || markingReadId) {
      return;
    }

    setMarkingReadId(announcementId);

    try {
      const response = await fetch(
        "/api/parent/announcements",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            announcementId,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setAnnouncementError(
          data.error ||
            "Unable to mark announcement as read."
        );
        return;
      }

      setAnnouncements((currentAnnouncements) =>
        currentAnnouncements.map((item) =>
          item.id === announcementId
            ? {
                ...item,
                readAt:
                  data.readAt ||
                  new Date().toISOString(),
              }
            : item
        )
      );
    } catch {
      setAnnouncementError(
        "Unable to connect to the announcements service."
      );
    } finally {
      setMarkingReadId(null);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/parent/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const groupedResults = useMemo(() => {
    if (!childResults) {
      return [];
    }

    const groups = new Map<
      string,
      {
        examinationId: string;
        examination: string;
        grade: string;
        term: string;
        academicYear: number;
        totalMarks: number;
        position: number | null;
        subjects: ChildResult[];
      }
    >();

    for (const result of childResults.results) {
      if (!groups.has(result.examinationId)) {
        groups.set(result.examinationId, {
          examinationId: result.examinationId,
          examination: result.examination,
          grade: result.grade,
          term: result.term,
          academicYear: result.academicYear,
          totalMarks: result.totalMarks,
          position: result.position,
          subjects: [],
        });
      }

      groups.get(result.examinationId)!.subjects.push(result);
    }

    return Array.from(groups.values());
  }, [childResults]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-slate-600">
            Loading parent portal...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Parent Portal
          </h1>

          <p className="text-red-600 mb-6">{error}</p>

          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white font-semibold hover:bg-slate-800"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  if (!parent) {
    return null;
  }

  const unreadCount = announcements.filter(
    (announcement) => !announcement.readAt
  ).length;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">
              Parent Portal
            </p>

            <h1 className="text-2xl font-bold">
              {parent.school.name}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <p className="text-sm text-slate-500 mb-1">
            Welcome
          </p>

          <h2 className="text-2xl font-bold text-slate-900">
            {parent.name}
          </h2>

          <p className="text-slate-600 mt-1">
            {parent.phoneNumber}
          </p>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                My Children
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Students linked to your parent account
              </p>
            </div>

            <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
              {parent.children.length}
            </span>
          </div>

          {parent.children.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-slate-600">
                No children are currently linked to your
                account.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {parent.children.map((child) => (
                <div
                  key={child.parentContactId}
                  className="bg-white rounded-2xl shadow-sm p-6"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <span className="text-lg font-bold text-slate-700">
                      {child.studentName
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    {child.studentName}
                  </h3>

                  {child.relationship && (
                    <p className="text-sm text-slate-500 mt-1">
                      Relationship: {child.relationship}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleViewResults(child.studentId)
                    }
                    disabled={
                      resultsLoading &&
                      selectedChildId === child.studentId
                    }
                    className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {resultsLoading &&
                    selectedChildId === child.studentId
                      ? "Loading Results..."
                      : "View Results"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {(resultsLoading ||
          resultsError ||
          childResults) && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Child Results
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Examination results for your linked child
                </p>
              </div>

              {childResults && (
                <button
                  type="button"
                  onClick={handleCloseResults}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Close Results
                </button>
              )}
            </div>

            {resultsLoading ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-slate-600">
                  Loading child results...
                </p>
              </div>
            ) : resultsError ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-red-600">
                  {resultsError}
                </p>
              </div>
            ) : childResults ? (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {childResults.child.name}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      Grade: {childResults.child.grade}
                    </span>

                    {childResults.child.admissionNumber && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        Admission:{" "}
                        {childResults.child.admissionNumber}
                      </span>
                    )}
                  </div>
                </div>

                {childResults.results.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                    <p className="text-slate-600">
                      No examination results have been
                      published for this child yet.
                    </p>
                  </div>
                ) : (
                  groupedResults.map((exam) => (
                    <div
                      key={exam.examinationId}
                      className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    >
                      <div className="p-6 border-b border-slate-100">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              {exam.examination}
                            </h3>

                            <p className="text-sm text-slate-500 mt-1">
                              {exam.term} •{" "}
                              {exam.academicYear} •{" "}
                              {exam.grade}
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
                              <p className="text-xs text-slate-500">
                                Total
                              </p>

                              <p className="text-lg font-bold text-slate-900">
                                {exam.totalMarks}
                              </p>
                            </div>

                            <div className="rounded-xl bg-blue-50 px-4 py-3 text-center">
                              <p className="text-xs text-blue-600">
                                Position
                              </p>

                              <p className="text-lg font-bold text-blue-700">
                                {exam.position
                                  ? exam.position
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left px-6 py-3 font-semibold text-slate-600">
                                Subject
                              </th>

                              <th className="text-right px-6 py-3 font-semibold text-slate-600">
                                Marks
                              </th>

                              <th className="text-center px-6 py-3 font-semibold text-slate-600">
                                Performance
                              </th>

                              <th className="text-center px-6 py-3 font-semibold text-slate-600">
                                Points
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {exam.subjects.map((result) => (
                              <tr
                                key={result.id}
                                className="border-t border-slate-100"
                              >
                                <td className="px-6 py-4 font-medium text-slate-800">
                                  {result.subject}
                                </td>

                                <td className="px-6 py-4 text-right font-semibold text-slate-900">
                                  {result.marks}
                                </td>

                                <td className="px-6 py-4 text-center">
                                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                    {result.performanceLevel}
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-center font-bold text-slate-900">
                                  {result.points}
                                </td>
                              </tr>
                            ))}
                          </tbody>

                          <tfoot className="bg-slate-50">
                            <tr>
                              <td className="px-6 py-4 font-bold text-slate-900">
                                Total Marks
                              </td>

                              <td className="px-6 py-4 text-right font-bold text-slate-900">
                                {exam.totalMarks}
                              </td>

                              <td className="px-6 py-4 text-center font-bold text-slate-900">
                                -
                              </td>

                              <td className="px-6 py-4 text-center font-bold text-slate-900">
                                {exam.subjects.reduce(
                                  (total, result) =>
                                    total + result.points,
                                  0
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                School Announcements
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Announcements sent to you by the school
              </p>
            </div>

            {unreadCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                {unreadCount} unread
              </span>
            )}
          </div>

          {announcementsLoading ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-slate-600">
                Loading announcements...
              </p>
            </div>
          ) : announcementError ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-red-600">
                {announcementError}
              </p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-slate-600">
                You have no announcements at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  onClick={() =>
                    handleMarkAsRead(announcement.id)
                  }
                  className={`bg-white rounded-2xl shadow-sm p-6 border-l-4 transition ${
                    announcement.readAt
                      ? "border-slate-200"
                      : "border-blue-600 cursor-pointer hover:shadow-md"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">
                          {announcement.title}
                        </h3>

                        {!announcement.readAt && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {markingReadId ===
                            announcement.id
                              ? "Opening..."
                              : "New"}
                          </span>
                        )}

                        {announcement.readAt && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            Read
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-500 mt-1">
                        {formatDate(
                          announcement.createdAt
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-slate-700 mt-4 whitespace-pre-wrap">
                    {announcement.message}
                  </p>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Child:{" "}
                      {announcement.child.studentName}
                    </span>

                    {announcement.grade && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Grade: {announcement.grade}
                      </span>
                    )}

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      From: {announcement.postedBy}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}