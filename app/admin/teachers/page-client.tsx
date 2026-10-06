
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Grade = {
  id: string;
  name: string;
  level: number;
};

type GradeSubject = {
  id: string;
  subject: {
    id: string;
    name: string;
  };
};

type Assignment = {
  id: string;
  grade: Grade;
  subject: {
    id: string;
    name: string;
  };
};

type ClassTeacherAssignment = {
  id: string;
  grade: Grade;
};

type Teacher = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  assignments: Assignment[];
  classTeacherAssignments: ClassTeacherAssignment[];
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<GradeSubject[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [teacherId, setTeacherId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [classTeacherId, setClassTeacherId] = useState("");
  const [classTeacherGradeId, setClassTeacherGradeId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [teacherResponse, gradeResponse] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/grades"),
      ]);

      const [teacherData, gradeData] = await Promise.all([
        teacherResponse.json(),
        gradeResponse.json(),
      ]);

      if (!teacherResponse.ok) {
        throw new Error(
          teacherData.error || "Could not load teachers"
        );
      }

      if (!gradeResponse.ok) {
        throw new Error(
          gradeData.error || "Could not load grades"
        );
      }

      setTeachers(teacherData);
      setGrades(gradeData);

      setTeacherId(
        (current) => current || teacherData[0]?.id || ""
      );

      setGradeId(
        (current) => current || gradeData[0]?.id || ""
      );

      setClassTeacherId(
        (current) => current || teacherData[0]?.id || ""
      );

      setClassTeacherGradeId(
        (current) => current || gradeData[0]?.id || ""
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load teacher management data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGradeSubjects = useCallback(
    async (selectedGradeId: string) => {
      if (!selectedGradeId) {
        setGradeSubjects([]);
        return;
      }

      const response = await fetch(
        `/api/grade-subjects?gradeId=${encodeURIComponent(
          selectedGradeId
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not load subjects for this grade"
        );
      }

      setGradeSubjects(data);

      setSubjectId((current) =>
        data.some(
          (item: GradeSubject) =>
            item.subject.id === current
        )
          ? current
          : ""
      );
    },
    []
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadGradeSubjects(gradeId).catch((loadError) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load subjects for this grade"
      );
    });
  }, [gradeId, loadGradeSubjects]);

  async function createTeacher(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not create teacher"
        );
      }

      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setTeacherId(data.id);
      setClassTeacherId(data.id);

      setMessage(
        "Teacher account created. Assign teaching responsibilities below."
      );

      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create teacher"
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignTeacher(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/teacher-assignments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teacherId,
            gradeId,
            subjectId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not assign teacher"
        );
      }

      setMessage(
        `${data.grade.name} — ${data.subject.name} assigned to the teacher.`
      );

      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not assign teacher"
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignClassTeacher(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/class-teacher-assignments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teacherId: classTeacherId,
            gradeId: classTeacherGradeId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not assign class teacher"
        );
      }

      setMessage(
        `${data.teacher.name} is now the Class Teacher for ${data.grade.name}.`
      );

      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not assign class teacher"
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  const buttonClass =
    "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              Teacher Management
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Admin dashboard
          </Link>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Administration portal
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Teacher accounts and responsibilities
          </h2>

          <p className="mt-2 text-blue-100">
            Create teacher accounts, assign Class Teachers to
            grades, and assign Subject Teachers to the subjects
            they handle.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        {(error || message) && (
          <div
            role="status"
            className={`rounded-lg p-4 text-sm ${
              error
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold">
              Create a teacher account
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              The teacher uses this email and password to sign in.
            </p>

            <form
              className="mt-5 space-y-4"
              onSubmit={createTeacher}
            >
              <label className="block text-sm font-medium">
                Full name

                <input
                  className={inputClass}
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  required
                  maxLength={100}
                />
              </label>

              <label className="block text-sm font-medium">
                Email address

                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                />
              </label>

              <label className="block text-sm font-medium">
                Phone number{" "}
                <span className="font-normal text-slate-500">
                  (optional)
                </span>

                <input
                  className={inputClass}
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  maxLength={30}
                />
              </label>

              <label className="block text-sm font-medium">
                Temporary password

                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  minLength={8}
                  required
                />
              </label>

              <button
                className={buttonClass}
                disabled={saving}
              >
                {saving ? "Saving…" : "Create teacher"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold">
              Assign Class Teacher
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Each grade can have one Class Teacher. Assigning
              another teacher to the same grade replaces the
              current Class Teacher.
            </p>

            <form
              className="mt-5 space-y-4"
              onSubmit={assignClassTeacher}
            >
              <label className="block text-sm font-medium">
                Teacher

                <select
                  className={inputClass}
                  value={classTeacherId}
                  onChange={(event) =>
                    setClassTeacherId(event.target.value)
                  }
                  disabled={!teachers.length}
                >
                  <option value="">
                    {teachers.length
                      ? "Select a teacher"
                      : "Create a teacher first"}
                  </option>

                  {teachers.map((teacher) => (
                    <option
                      key={teacher.id}
                      value={teacher.id}
                    >
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Grade

                <select
                  className={inputClass}
                  value={classTeacherGradeId}
                  onChange={(event) =>
                    setClassTeacherGradeId(
                      event.target.value
                    )
                  }
                  disabled={!grades.length}
                >
                  <option value="">
                    {grades.length
                      ? "Select a grade"
                      : "Create a grade first"}
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
              </label>

              <button
                className={buttonClass}
                disabled={
                  saving ||
                  !classTeacherId ||
                  !classTeacherGradeId
                }
              >
                {saving
                  ? "Saving…"
                  : "Assign Class Teacher"}
              </button>
            </form>
          </section>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-xl font-bold">
            Assign Subject Teacher
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            A subject must first be available for the selected
            grade.
          </p>

          <form
            className="mt-5 grid gap-4 lg:grid-cols-4"
            onSubmit={assignTeacher}
          >
            <label className="block text-sm font-medium">
              Teacher

              <select
                className={inputClass}
                value={teacherId}
                onChange={(event) =>
                  setTeacherId(event.target.value)
                }
                disabled={!teachers.length}
              >
                <option value="">
                  {teachers.length
                    ? "Select a teacher"
                    : "Create a teacher first"}
                </option>

                {teachers.map((teacher) => (
                  <option
                    key={teacher.id}
                    value={teacher.id}
                  >
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Grade

              <select
                className={inputClass}
                value={gradeId}
                onChange={(event) =>
                  setGradeId(event.target.value)
                }
                disabled={!grades.length}
              >
                <option value="">
                  {grades.length
                    ? "Select a grade"
                    : "Create a grade first"}
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
            </label>

            <label className="block text-sm font-medium">
              Subject

              <select
                className={inputClass}
                value={subjectId}
                onChange={(event) =>
                  setSubjectId(event.target.value)
                }
                disabled={!gradeSubjects.length}
              >
                <option value="">
                  {gradeSubjects.length
                    ? "Select a subject"
                    : "Set up a grade subject first"}
                </option>

                {gradeSubjects.map((item) => (
                  <option
                    key={item.subject.id}
                    value={item.subject.id}
                  >
                    {item.subject.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                className={`${buttonClass} w-full`}
                disabled={
                  saving ||
                  !teacherId ||
                  !gradeId ||
                  !subjectId
                }
              >
                {saving
                  ? "Saving…"
                  : "Assign Subject Teacher"}
              </button>
            </div>
          </form>

          <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            Set up grade subjects on the{" "}
            <Link
              href="/results"
              className="font-semibold text-blue-700 hover:underline"
            >
              Examinations and Results page
            </Link>
            .
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h3 className="text-xl font-bold">
                Teachers
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {teachers.length}{" "}
                {teachers.length === 1
                  ? "teacher"
                  : "teachers"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              Loading teachers…
            </p>
          ) : teachers.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              No teachers created yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 font-semibold">
                      Teacher
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Contact
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Class Teacher
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Subject Teacher
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td className="px-6 py-4 font-medium">
                        {teacher.name}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        <div>{teacher.email}</div>

                        {teacher.phone && (
                          <div>{teacher.phone}</div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {teacher.classTeacherAssignments
                          .length ? (
                          <div className="space-y-1">
                            {teacher.classTeacherAssignments.map(
                              (assignment) => (
                                <div
                                  key={assignment.id}
                                  className="font-medium text-blue-700"
                                >
                                  {assignment.grade.name}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          "Not assigned"
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {teacher.assignments.length ? (
                          <div className="space-y-1">
                            {teacher.assignments.map(
                              (assignment) => (
                                <div key={assignment.id}>
                                  {assignment.grade.name} —{" "}
                                  {assignment.subject.name}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          "Not assigned"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

