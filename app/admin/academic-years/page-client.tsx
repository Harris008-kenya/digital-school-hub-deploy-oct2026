
"use client";

import { useState } from "react";
import Link from "next/link";
import ActivationPaymentForm from "../ActivationPaymentForm";
import LogoutButton from "../LogoutButton";

type AcademicYear = {
  id: string;
  year: number;
  _count: {
    terms: number;
  };
};

type AcademicYearsPageClientProps = {
  academicYears: AcademicYear[];
  isPlatformAdministrator: boolean;
  schoolIsActive: boolean;
};

export default function AcademicYearsPageClient({
  academicYears,
  isPlatformAdministrator,
  schoolIsActive,
}: AcademicYearsPageClientProps) {
  const [years, setYears] = useState(academicYears);
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCreateYear() {
    const trimmedYear = year.trim();

    if (!trimmedYear) {
      setMessage("Please enter an academic year.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/academic-years", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: Number(trimmedYear),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error || data.message || "Unable to create academic year."
        );
        return;
      }

      setYears((current) => [
        {
          ...data,
          _count: {
            terms: data._count?.terms ?? 0,
          },
        },
        ...current,
      ]);

      setYear("");
      setMessage("Academic year created successfully.");
    } catch (error) {
      console.error("Error creating academic year:", error);
      setMessage("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">Academic Calendar</h1>
            <p className="text-sm text-slate-600">
              {isPlatformAdministrator
                ? "Platform Administrator"
                : "School Administrator"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Back to Dashboard
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {!isPlatformAdministrator && !schoolIsActive ? (
          <div className="mb-8">
            <ActivationPaymentForm isActive={schoolIsActive} />
          </div>
        ) : null}

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Academic Years</h2>

            <p className="mt-1 text-sm text-slate-600">
              Manage the academic years used by Digital School Hub.
            </p>
          </div>

          {isPlatformAdministrator || schoolIsActive ? (
            <div className="mb-8 rounded-xl border bg-slate-50 p-5">
              <h3 className="font-bold text-slate-900">
                Create Academic Year
              </h3>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="number"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  placeholder="e.g. 2026"
                  min="2000"
                  max="2100"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />

                <button
                  type="button"
                  onClick={handleCreateYear}
                  disabled={loading}
                  className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Year"}
                </button>
              </div>

              {message ? (
                <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                  {message}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              Academic calendar management is available after your
              school activation has been approved.
            </div>
          )}

          <div>
            <h3 className="mb-4 font-bold text-slate-900">
              Existing Academic Years
            </h3>

            {years.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                No academic years have been created yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="px-4 py-3 text-sm font-semibold">
                        Academic Year
                      </th>

                      <th className="px-4 py-3 text-sm font-semibold">
                        Terms
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {years.map((academicYear) => (
                      <tr
                        key={academicYear.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="px-4 py-4 text-sm font-medium">
                          {academicYear.year}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {academicYear._count.terms}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}