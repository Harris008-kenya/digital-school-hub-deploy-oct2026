
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";
import AddSchoolForm from "./AddSchoolForm";

export default async function SchoolsPage() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/login");
  }

  if (administrator.role !== "PLATFORM") {
    redirect("/admin");
  }

  const schools = await prisma.school.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          students: true,
          teachers: true,
          administrators: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>
            <p className="text-sm text-slate-500">
              Platform Administrator
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Platform Administration
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Schools Management
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            View and manage schools registered on Digital School Hub.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <h3 className="text-2xl font-bold">
            Registered Schools
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Total schools: {schools.length}
          </p>
        </div>

        <div className="mb-8">
          <AddSchoolForm />
        </div>

        {schools.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <h4 className="text-xl font-semibold">
              No schools registered yet
            </h4>

            <p className="mt-2 text-slate-500">
              Use the Add School form above to register the first school.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      School
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Code
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Students
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Teachers
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Administrators
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {schools.map((school) => (
                    <tr
                      key={school.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/schools/${school.id}`}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          {school.name}
                        </Link>

                        {school.email && (
                          <div className="text-sm text-slate-500">
                            {school.email}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-sm">
                        {school.code}
                      </td>

                      <td className="px-6 py-4">
                        {school._count.students}
                      </td>

                      <td className="px-6 py-4">
                        {school._count.teachers}
                      </td>

                      <td className="px-6 py-4">
                        {school._count.administrators}
                      </td>

                      <td className="px-6 py-4">
                        {school.isActive ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
