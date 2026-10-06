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

type ParentAccount = {
  id: string;
  name: string;
  phoneNumber: string;
};

type ParentAccountLink = {
  id: string;
  parentAccount: ParentAccount;
};

type ParentContact = {
  id: string;
  name: string;
  phoneNumber: string;
  relationship?: string | null;
  student: Student;
  accountLinks?: ParentAccountLink[];
};

export default function ParentContactsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [parentContacts, setParentContacts] = useState<ParentContact[]>(
    []
  );

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [relationship, setRelationship] = useState("");
  const [studentId, setStudentId] = useState("");

  const [loginContact, setLoginContact] =
    useState<ParentContact | null>(null);
  const [loginPassword, setLoginPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingLogin, setCreatingLogin] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [studentsResponse, parentsResponse] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/parent-contacts"),
      ]);

      const studentsData = await studentsResponse.json();
      const parentsData = await parentsResponse.json();

      if (!studentsResponse.ok) {
        throw new Error(
          studentsData.error || "Failed to load students"
        );
      }

      if (!parentsResponse.ok) {
        throw new Error(
          parentsData.error || "Failed to load parent contacts"
        );
      }

      setStudents(studentsData);
      setParentContacts(parentsData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load parent contacts"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/parent-contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phoneNumber,
          relationship,
          studentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to add parent contact"
        );
      }

      setParentContacts((current) => [data, ...current]);

      setName("");
      setPhoneNumber("");
      setRelationship("");
      setStudentId("");

      setMessage("Parent contact added successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add parent contact"
      );
    } finally {
      setSaving(false);
    }
  }

  function openLoginForm(parent: ParentContact) {
    setLoginContact(parent);
    setLoginPassword("");
    setMessage("");
    setError("");
  }

  function closeLoginForm() {
    setLoginContact(null);
    setLoginPassword("");
  }

  async function handleCreateLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!loginContact) {
      return;
    }

    if (loginPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setCreatingLogin(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/parent/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentContactId: loginContact.id,
          name: loginContact.name,
          phoneNumber: loginContact.phoneNumber,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create parent login account"
        );
      }

      setMessage(
        data.message || "Parent login account created successfully."
      );

      closeLoginForm();

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create parent login account"
      );
    } finally {
      setCreatingLogin(false);
    }
  }

  function getStudentName(student: Student) {
    return [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function hasLoginAccount(parent: ParentContact) {
    return Boolean(
      parent.accountLinks && parent.accountLinks.length > 0
    );
  }

  const inputClassName =
    "w-full rounded-lg border border-slate-400 bg-white px-4 py-3 text-base font-medium text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  const selectClassName =
    "w-full rounded-lg border border-slate-400 bg-white px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  const labelClassName =
    "mb-2 block text-sm font-semibold text-slate-800";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Parent Contacts
          </h1>

          <p className="mt-2 text-slate-600">
            Register parent and guardian phone numbers and create
            parent portal login accounts.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Add Parent / Guardian
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 md:grid-cols-2"
          >
            <div>
              <label className={labelClassName}>
                Parent / Guardian Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter parent or guardian name"
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label className={labelClassName}>
                Phone Number
              </label>

              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) =>
                  setPhoneNumber(event.target.value)
                }
                placeholder="e.g. 0712345678"
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label className={labelClassName}>
                Relationship
              </label>

              <select
                value={relationship}
                onChange={(event) =>
                  setRelationship(event.target.value)
                }
                className={selectClassName}
              >
                <option value="">
                  Select relationship
                </option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className={labelClassName}>
                Student
              </label>

              <select
                value={studentId}
                onChange={(event) =>
                  setStudentId(event.target.value)
                }
                required
                className={selectClassName}
              >
                <option value="">
                  Select student
                </option>

                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {getStudentName(student)}
                    {student.admissionNumber
                      ? ` — ${student.admissionNumber}`
                      : ""}
                    {` — ${student.grade.name}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Add Parent Contact"}
              </button>
            </div>
          </form>
        </section>

        {loginContact && (
          <section className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Create Parent Login Account
              </h2>

              <p className="mt-2 text-sm text-slate-700">
                Create a portal password for{" "}
                <strong>{loginContact.name}</strong>.
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Phone number: {loginContact.phoneNumber}
              </p>
            </div>

            <form
              onSubmit={handleCreateLogin}
              className="max-w-xl"
            >
              <label className={labelClassName}>
                Parent Portal Password
              </label>

              <input
                type="password"
                value={loginPassword}
                onChange={(event) =>
                  setLoginPassword(event.target.value)
                }
                placeholder="Enter at least 6 characters"
                minLength={6}
                required
                className={inputClassName}
              />

              <p className="mt-2 text-sm text-slate-600">
                The parent will use their school, phone number and
                this password to sign in.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={creatingLogin}
                  className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingLogin
                    ? "Creating Login..."
                    : "Create Login Account"}
                </button>

                <button
                  type="button"
                  onClick={closeLoginForm}
                  disabled={creatingLogin}
                  className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-900">
              Registered Parent Contacts
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {parentContacts.length} parent contact
              {parentContacts.length === 1 ? "" : "s"} registered
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-slate-600">
              Loading parent contacts...
            </div>
          ) : parentContacts.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-600">
              No parent contacts have been registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-800">
                      Parent / Guardian
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-800">
                      Phone
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-800">
                      Relationship
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-800">
                      Student
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-800">
                      Grade
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-800">
                      Parent Portal
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {parentContacts.map((parent) => {
                    const accountExists = hasLoginAccount(parent);

                    return (
                      <tr key={parent.id}>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {parent.name}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-800">
                          {parent.phoneNumber}
                        </td>

                        <td className="px-6 py-4 text-slate-800">
                          {parent.relationship || "—"}
                        </td>

                        <td className="px-6 py-4 text-slate-800">
                          {getStudentName(parent.student)}
                        </td>

                        <td className="px-6 py-4 text-slate-800">
                          {parent.student.grade.name}
                        </td>

                        <td className="px-6 py-4">
                          {accountExists ? (
                            <div>
                              <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                                Login Active
                              </span>

                              <p className="mt-1 text-xs text-slate-500">
                                {parent.accountLinks?.[0]
                                  ?.parentAccount.phoneNumber ||
                                  parent.phoneNumber}
                              </p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openLoginForm(parent)
                              }
                              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                              Create Login
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}