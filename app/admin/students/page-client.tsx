"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type Grade = {
  id: string;
  name: string;
  level: number;
  _count?: {
    students: number;
  };
};

type Student = {
  id: string;
  name: string;
  admissionNumber: string | null;
  grade: Grade;
};

export default function StudentsPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeName, setGradeName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [studentPassword, setStudentPassword] =
    useState("");
  const [gradeId, setGradeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [gradeResponse, studentResponse] =
        await Promise.all([
          fetch("/api/grades"),
          fetch("/api/students"),
        ]);

      const [gradeData, studentData] =
        await Promise.all([
          gradeResponse.json(),
          studentResponse.json(),
        ]);

      if (!gradeResponse.ok) {
        throw new Error(
          gradeData.error || "Could not load grades"
        );
      }

      if (!studentResponse.ok) {
        throw new Error(
          studentData.error ||
            "Could not load students"
        );
      }

      setGrades(gradeData);
      setStudents(studentData);

      setGradeId(
        (current) =>
          current || gradeData[0]?.id || ""
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load student data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function submitGrade(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/grades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: gradeName,
          level: gradeLevel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not create grade"
        );
      }

      setGradeName("");
      setGradeLevel("");
      setGradeId(data.id);
      setMessage("Grade created.");

      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create grade"
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitStudent(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          secondName,
          admissionNumber,
          password: studentPassword,
          gradeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not register student"
        );
      }

      setFirstName("");
      setSecondName("");
      setAdmissionNumber("");
      setStudentPassword("");

      setMessage(
        "Student registered successfully. Give the student their login password securely."
      );

      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not register student"
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
              Student Management
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
            Administration Portal
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Students and grades
          </h2>

          <p className="mt-2 text-blue-100">
            Set up grade levels and keep your student
            register up to date.
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
              Register a student
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Add a student, assign a grade and create
              their login password.
            </p>

            <form
              className="mt-5 space-y-4"
              onSubmit={submitStudent}
            >
              <label className="block text-sm font-medium">
                First name

                <input
                  className={inputClass}
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  required
                  maxLength={50}
                  autoComplete="given-name"
                />
              </label>

              <label className="block text-sm font-medium">
                Second name

                <input
                  className={inputClass}
                  value={secondName}
                  onChange={(event) =>
                    setSecondName(event.target.value)
                  }
                  required
                  maxLength={50}
                  autoComplete="family-name"
                />
              </label>

              <label className="block text-sm font-medium">
                Admission number

                <input
                  className={inputClass}
                  value={admissionNumber}
                  onChange={(event) =>
                    setAdmissionNumber(
                      event.target.value
                    )
                  }
                  required
                  maxLength={40}
                />
              </label>

              <label className="block text-sm font-medium">
                Student password

                <input
                  className={inputClass}
                  type="password"
                  value={studentPassword}
                  onChange={(event) =>
                    setStudentPassword(
                      event.target.value
                    )
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />

                <span className="mt-1 block text-xs text-slate-500">
                  The password must contain at least 8
                  characters.
                </span>
              </label>

              <label className="block text-sm font-medium">
                Grade

                <select
                  className={inputClass}
                  value={gradeId}
                  onChange={(event) =>
                    setGradeId(event.target.value)
                  }
                  required
                  disabled={grades.length === 0}
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
                  loading ||
                  !grades.length
                }
              >
                {saving
                  ? "Saving…"
                  : "Register student"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold">
              Add a grade
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Create a grade level for student
              assignments.
            </p>

            <form
              className="mt-5 space-y-4"
              onSubmit={submitGrade}
            >
              <label className="block text-sm font-medium">
                Grade name

                <input
                  className={inputClass}
                  value={gradeName}
                  onChange={(event) =>
                    setGradeName(event.target.value)
                  }
                  placeholder="For example, Grade 1"
                  required
                  maxLength={60}
                />
              </label>

              <label className="block text-sm font-medium">
                Level number

                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  step="1"
                  value={gradeLevel}
                  onChange={(event) =>
                    setGradeLevel(event.target.value)
                  }
                  placeholder="1"
                  required
                />
              </label>

              <button
                className={buttonClass}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : "Create grade"}
              </button>
            </form>

            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-semibold">
                Grades
              </h4>

              {grades.length ? (
                <ul className="mt-2 space-y-2">
                  {grades.map((grade) => (
                    <li
                      key={grade.id}
                      className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span>
                        {grade.name}{" "}
                        <span className="text-slate-500">
                          (Level {grade.level})
                        </span>
                      </span>

                      <span className="text-slate-500">
                        {grade._count?.students ?? 0}{" "}
                        students
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No grades created yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h3 className="text-xl font-bold">
                Student register
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {students.length}{" "}
                {students.length === 1
                  ? "student"
                  : "students"}
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
              Loading students…
            </p>
          ) : students.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              No students registered yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 font-semibold">
                      Student
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Admission number
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Grade
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 font-medium">
                        {student.name}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {student.admissionNumber || "—"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {student.grade.name}
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