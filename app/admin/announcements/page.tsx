"use client";

import { FormEvent, useEffect, useState } from "react";

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

type ParentContact = {
  id: string;
  name: string;
  phoneNumber: string;
  relationship?: string | null;
  student: Student;
};

type TargetType =
  | "ALL_PARENTS"
  | "GRADE"
  | "STUDENT"
  | "SELECTED_PARENTS";

export default function AnnouncementsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [parentContacts, setParentContacts] = useState<
    ParentContact[]
  >([]);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] =
    useState<TargetType>("ALL_PARENTS");

  const [gradeId, setGradeId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selectedParentIds, setSelectedParentIds] =
    useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [studentsResponse, parentsResponse] =
        await Promise.all([
          fetch("/api/students"),
          fetch("/api/parent-contacts"),
        ]);

      const studentsData =
        await studentsResponse.json();
      const parentsData =
        await parentsResponse.json();

      if (!studentsResponse.ok) {
        throw new Error(
          studentsData.error ||
            "Failed to load students"
        );
      }

      if (!parentsResponse.ok) {
        throw new Error(
          parentsData.error ||
            "Failed to load parent contacts"
        );
      }

      setStudents(studentsData);
      setParentContacts(parentsData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load announcement data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
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

  function toggleParent(parentId: string) {
    setSelectedParentIds((current) => {
      if (current.includes(parentId)) {
        return current.filter(
          (id) => id !== parentId
        );
      }

      return [...current, parentId];
    });
  }

  function selectAllParents() {
    setSelectedParentIds(
      parentContacts.map((parent) => parent.id)
    );
  }

  function clearSelectedParents() {
    setSelectedParentIds([]);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setSuccessMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/announcements",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            message,
            targetType,
            gradeId,
            studentId,
            parentContactIds:
              selectedParentIds,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create announcement"
        );
      }

      setTitle("");
      setMessage("");
      setTargetType("ALL_PARENTS");
      setGradeId("");
      setStudentId("");
      setSelectedParentIds([]);

      setSuccessMessage(
        `Announcement created successfully for ${data.recipientCount} parent contact${
          data.recipientCount === 1 ? "" : "s"
        }.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create announcement"
      );
    } finally {
      setSaving(false);
    }
  }

  const grades = Array.from(
    new Map(
      students.map((student) => [
        student.grade.id,
        student.grade,
      ])
    ).values()
  ).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const filteredStudents = gradeId
    ? students.filter(
        (student) => student.grade.id === gradeId
      )
    : students;

  const inputClassName =
    "w-full rounded-lg border border-slate-400 bg-white px-4 py-3 text-base font-medium text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  const labelClassName =
    "mb-2 block text-sm font-semibold text-slate-800";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            School Announcements
          </h1>

          <p className="mt-2 text-slate-600">
            Send announcements to parents and guardians.
            Teachers will also be able to view school
            announcements from their Teacher Portal.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 font-medium text-green-800">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-slate-900">
            Create Announcement
          </h2>

          {loading ? (
            <div className="py-10 text-center text-slate-600">
              Loading school information...
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div>
                <label className={labelClassName}>
                  Announcement Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Enter announcement title"
                  required
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>
                  Announcement Message
                </label>

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Write the announcement message here..."
                  required
                  rows={6}
                  className={`${inputClassName} resize-y`}
                />
              </div>

              <div>
                <label className={labelClassName}>
                  Send To
                </label>

                <select
                  value={targetType}
                  onChange={(event) => {
                    setTargetType(
                      event.target.value as TargetType
                    );
                    setGradeId("");
                    setStudentId("");
                    setSelectedParentIds([]);
                  }}
                  className={inputClassName}
                >
                  <option value="ALL_PARENTS">
                    All Parents / Guardians
                  </option>
                  <option value="GRADE">
                    Parents / Guardians of a Grade
                  </option>
                  <option value="STUDENT">
                    Parents / Guardians of a Student
                  </option>
                  <option value="SELECTED_PARENTS">
                    Selected Parents / Guardians
                  </option>
                </select>
              </div>

              {targetType === "GRADE" && (
                <div>
                  <label className={labelClassName}>
                    Select Grade
                  </label>

                  <select
                    value={gradeId}
                    onChange={(event) => {
                      setGradeId(event.target.value);
                      setStudentId("");
                    }}
                    required
                    className={inputClassName}
                  >
                    <option value="">
                      Select grade
                    </option>

                    {grades.map((grade) => (
                      <option
                        key={grade.id}
                        value={grade.id}
                      >
                        {grade.name}
                      </option>
                    ))}
                  </select>

                  {gradeId && (
                    <p className="mt-2 text-sm text-slate-600">
                      {
                        parentContacts.filter(
                          (parent) =>
                            parent.student.grade.id ===
                            gradeId
                        ).length
                      }{" "}
                      parent contact
                      {parentContacts.filter(
                        (parent) =>
                          parent.student.grade.id ===
                          gradeId
                      ).length === 1
                        ? ""
                        : "s"}{" "}
                      will receive this announcement.
                    </p>
                  )}
                </div>
              )}

              {targetType === "STUDENT" && (
                <div>
                  <label className={labelClassName}>
                    Select Student
                  </label>

                  <select
                    value={studentId}
                    onChange={(event) =>
                      setStudentId(
                        event.target.value
                      )
                    }
                    required
                    className={inputClassName}
                  >
                    <option value="">
                      Select student
                    </option>

                    {filteredStudents.map(
                      (student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {getStudentName(student)}
                          {student.admissionNumber
                            ? ` — ${student.admissionNumber}`
                            : ""}
                          {` — ${student.grade.name}`}
                        </option>
                      )
                    )}
                  </select>

                  {studentId && (
                    <p className="mt-2 text-sm text-slate-600">
                      {
                        parentContacts.filter(
                          (parent) =>
                            parent.student.id ===
                            studentId
                        ).length
                      }{" "}
                      parent contact
                      {parentContacts.filter(
                        (parent) =>
                          parent.student.id ===
                          studentId
                      ).length === 1
                        ? ""
                        : "s"}{" "}
                      will receive this announcement.
                    </p>
                  )}
                </div>
              )}

              {targetType ===
                "SELECTED_PARENTS" && (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-slate-800">
                      Select Parents / Guardians
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllParents}
                        className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Select All
                      </button>

                      <button
                        type="button"
                        onClick={
                          clearSelectedParents
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50">
                    {parentContacts.length === 0 ? (
                      <div className="p-6 text-center text-slate-600">
                        No parent contacts have been
                        registered yet.
                      </div>
                    ) : (
                      parentContacts.map(
                        (parent) => (
                          <label
                            key={parent.id}
                            className="flex cursor-pointer items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 last:border-b-0 hover:bg-blue-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedParentIds.includes(
                                parent.id
                              )}
                              onChange={() =>
                                toggleParent(
                                  parent.id
                                )
                              }
                              className="h-5 w-5"
                            />

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {parent.name}
                              </p>

                              <p className="text-sm text-slate-700">
                                {parent.phoneNumber}
                                {" • "}
                                {parent.relationship ||
                                  "Guardian"}
                              </p>

                              <p className="text-sm text-slate-600">
                                Student:{" "}
                                {getStudentName(
                                  parent.student
                                )}
                                {" • "}
                                {parent.student.grade.name}
                              </p>
                            </div>
                          </label>
                        )
                      )
                    )}
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {selectedParentIds.length} parent
                    contact
                    {selectedParentIds.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    selected.
                  </p>
                </div>
              )}

              {targetType === "ALL_PARENTS" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
                  <p className="font-semibold">
                    All registered parents and guardians
                  </p>

                  <p className="mt-1 text-sm">
                    {parentContacts.length} parent contact
                    {parentContacts.length === 1
                      ? ""
                      : "s"}{" "}
                    will receive this announcement.
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-5">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    loading ||
                    parentContacts.length === 0
                  }
                  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Creating Announcement..."
                    : "Create Announcement"}
                </button>

                {parentContacts.length === 0 && (
                  <p className="mt-3 text-sm font-medium text-amber-700">
                    Add at least one parent contact before
                    creating an announcement.
                  </p>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}