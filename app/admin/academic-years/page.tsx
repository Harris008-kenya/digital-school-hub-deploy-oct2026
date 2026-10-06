"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type AcademicYear = {
  id: string;
  year: number;
  schoolId: string;
  terms: Term[];
};

type Term = {
  id: string;
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
};

type Administrator = {
  id: string;
  role: "PLATFORM" | "SCHOOL";
  schoolId: string | null;
};

type School = {
  id: string;
  name: string;
  code: string;
};

export default function AcademicYearsPage() {
  const [administrator, setAdministrator] =
    useState<Administrator | null>(null);

  const [school, setSchool] = useState<School | null>(null);

  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([]);

  const [selectedAcademicYearId, setSelectedAcademicYearId] =
    useState("");

  const [year, setYear] = useState(
    String(new Date().getFullYear())
  );

  const [termName, setTermName] = useState("");
  const [termStartDate, setTermStartDate] = useState("");
  const [termEndDate, setTermEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [creatingYear, setCreatingYear] = useState(false);
  const [creatingTerm, setCreatingTerm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const meResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!meResponse.ok) {
        window.location.href = "/login";
        return;
      }

      const meData = await meResponse.json();

      const currentAdministrator =
        meData.administrator;

      if (!currentAdministrator?.id) {
        window.location.href = "/login";
        return;
      }

      setAdministrator(currentAdministrator);

      if (currentAdministrator.role === "PLATFORM") {
        setLoading(false);
        return;
      }

      if (!currentAdministrator.schoolId) {
        setError(
          "Your administrator account is not assigned to a school."
        );
        setLoading(false);
        return;
      }

      const [academicYearsResponse, schoolsResponse] =
        await Promise.all([
          fetch("/api/academic-years", {
            cache: "no-store",
          }),
          fetch("/api/schools", {
            cache: "no-store",
          }),
        ]);

      if (!academicYearsResponse.ok) {
        const data =
          await academicYearsResponse
            .json()
            .catch(() => ({}));

        throw new Error(
          data.error ||
            "Failed to load academic years."
        );
      }

      const academicYearsData =
        await academicYearsResponse.json();

      setAcademicYears(
        Array.isArray(academicYearsData)
          ? academicYearsData
          : []
      );

      if (academicYearsData.length > 0) {
        setSelectedAcademicYearId(
          academicYearsData[0].id
        );
      }

      if (schoolsResponse.ok) {
        const schoolsData =
          await schoolsResponse.json();

        const currentSchool =
          Array.isArray(schoolsData)
            ? schoolsData.find(
                (item: School) =>
                  item.id ===
                  currentAdministrator.schoolId
              )
            : null;

        if (currentSchool) {
          setSchool(currentSchool);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load academic calendar."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function handleCreateAcademicYear(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const numericYear = Number(year);

    if (
      !Number.isInteger(numericYear) ||
      numericYear < 2000 ||
      numericYear > 2100
    ) {
      setError(
        "Please enter a valid academic year between 2000 and 2100."
      );
      return;
    }

    try {
      setCreatingYear(true);

      const response = await fetch(
        "/api/academic-years",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            year: numericYear,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create academic year."
        );
      }

      setSuccess(
        `Academic year ${numericYear} has been created successfully.`
      );

      setAcademicYears((current) => {
        const alreadyExists = current.some(
          (item) => item.id === data.id
        );

        if (alreadyExists) {
          return current;
        }

        return [...current, data].sort(
          (a, b) => b.year - a.year
        );
      });

      setSelectedAcademicYearId(data.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create academic year."
      );
    } finally {
      setCreatingYear(false);
    }
  }

  async function handleCreateTerm(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedAcademicYearId) {
      setError(
        "Please select an academic year first."
      );
      return;
    }

    if (!termName.trim()) {
      setError("Please enter a term name.");
      return;
    }

    if (!termStartDate || !termEndDate) {
      setError(
        "Please enter both the term start date and end date."
      );
      return;
    }

    if (termEndDate < termStartDate) {
      setError(
        "Term end date cannot be before the start date."
      );
      return;
    }

    try {
      setCreatingTerm(true);

      const response = await fetch("/api/terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: termName.trim(),
          academicYearId: selectedAcademicYearId,
          startDate: termStartDate,
          endDate: termEndDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create term."
        );
      }

      setSuccess(
        `${termName.trim()} has been added successfully.`
      );

      setAcademicYears((current) =>
        current.map((academicYear) => {
          if (
            academicYear.id !==
            selectedAcademicYearId
          ) {
            return academicYear;
          }

          return {
            ...academicYear,
            terms: [
              ...academicYear.terms,
              data,
            ],
          };
        })
      );

      setTermName("");
      setTermStartDate("");
      setTermEndDate("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create term."
      );
    } finally {
      setCreatingTerm(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              Loading academic calendar...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (administrator?.role === "PLATFORM") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <div>
              <h1 className="text-2xl font-bold">
                Academic Calendar
              </h1>

              <p className="text-sm text-slate-600">
                Platform Administrator
              </p>
            </div>

            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-8">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              School Academic Calendars
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Academic calendars are managed by each
              school administrator.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">
              Academic Calendar
            </h1>

            <p className="text-sm text-slate-600">
              {school?.name || "Your School"}
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                Create Academic Year
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Create an academic year for your school.
              </p>
            </div>

            <form
              onSubmit={handleCreateAcademicYear}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="academic-year"
                  className="mb-2 block text-sm font-semibold"
                >
                  Academic Year
                </label>

                <input
                  id="academic-year"
                  type="number"
                  min="2000"
                  max="2100"
                  value={year}
                  onChange={(event) =>
                    setYear(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  placeholder="2027"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={creatingYear}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingYear
                  ? "Creating..."
                  : "Create Academic Year"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                Add Term
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Add a term and its dates to an academic
                year.
              </p>
            </div>

            <form
              onSubmit={handleCreateTerm}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="academic-year-select"
                  className="mb-2 block text-sm font-semibold"
                >
                  Academic Year
                </label>

                <select
                  id="academic-year-select"
                  value={selectedAcademicYearId}
                  onChange={(event) =>
                    setSelectedAcademicYearId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
                  disabled={
                    academicYears.length === 0
                  }
                >
                  <option value="">
                    Select academic year
                  </option>

                  {academicYears.map(
                    (academicYear) => (
                      <option
                        key={academicYear.id}
                        value={academicYear.id}
                      >
                        {academicYear.year}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="term-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Term Name
                </label>

                <input
                  id="term-name"
                  type="text"
                  value={termName}
                  onChange={(event) =>
                    setTermName(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  placeholder="Term 1"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="term-start"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Start Date
                  </label>

                  <input
                    id="term-start"
                    type="date"
                    value={termStartDate}
                    onChange={(event) =>
                      setTermStartDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="term-end"
                    className="mb-2 block text-sm font-semibold"
                  >
                    End Date
                  </label>

                  <input
                    id="term-end"
                    type="date"
                    value={termEndDate}
                    onChange={(event) =>
                      setTermEndDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  creatingTerm ||
                  academicYears.length === 0
                }
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingTerm
                  ? "Adding Term..."
                  : "Add Term"}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Your Academic Calendar
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Academic years and terms configured for
              your school.
            </p>
          </div>

          {academicYears.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-semibold text-slate-700">
                No academic years have been created yet.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create your school's first academic year
                above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {academicYears.map(
                (academicYear) => (
                  <div
                    key={academicYear.id}
                    className={`rounded-xl border ${
                      selectedAcademicYearId ===
                      academicYear.id
                        ? "border-slate-400"
                        : "border-slate-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAcademicYearId(
                          academicYear.id
                        )
                      }
                      className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
                    >
                      <div>
                        <h3 className="font-bold">
                          {academicYear.year}
                        </h3>

                        <p className="text-sm text-slate-500">
                          {academicYear.terms.length}{" "}
                          {academicYear.terms.length ===
                          1
                            ? "term"
                            : "terms"}
                        </p>
                      </div>

                      <span className="text-sm font-semibold text-slate-600">
                        {selectedAcademicYearId ===
                        academicYear.id
                          ? "Selected"
                          : "Select"}
                      </span>
                    </button>

                    {academicYear.terms.length >
                    0 ? (
                      <div className="border-t">
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-slate-50 text-left">
                                <th className="px-5 py-3 text-sm font-semibold">
                                  Term
                                </th>

                                <th className="px-5 py-3 text-sm font-semibold">
                                  Start Date
                                </th>

                                <th className="px-5 py-3 text-sm font-semibold">
                                  End Date
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {academicYear.terms.map(
                                (term) => (
                                  <tr
                                    key={term.id}
                                    className="border-t"
                                  >
                                    <td className="px-5 py-4 text-sm font-medium">
                                      {term.name}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                      {new Date(
                                        term.startDate
                                      ).toLocaleDateString()}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                      {new Date(
                                        term.endDate
                                      ).toLocaleDateString()}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t px-5 py-5 text-sm text-slate-500">
                        No terms have been added to
                        this academic year yet.
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}