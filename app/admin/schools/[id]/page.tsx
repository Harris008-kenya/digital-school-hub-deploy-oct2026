import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";
import AddAdministratorForm from "./AddAdministratorForm";
import ActivationPaymentActions from "./ActivationPaymentActions";
import ActivationExpiryForm from "./ActivationExpiryForm";

type SchoolDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SchoolDetailsPage({
  params,
}: SchoolDetailsPageProps) {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/login");
  }

  if (administrator.role !== "PLATFORM") {
    redirect("/admin");
  }

  const { id } = await params;

  const school = await prisma.school.findUnique({
    where: {
      id,
    },
    include: {
      _count: {
        select: {
          students: true,
          teachers: true,
          administrators: true,
          academicYears: true,
          subscriptions: true,
          payments: true,
          activationPayments: true,
        },
      },

      administrators: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
        orderBy: {
          name: "asc",
        },
      },

      activationPayments: {
        include: {
          verifiedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
      },
    },
  });

  if (!school) {
    notFound();
  }

  const now = new Date();

  const isSchoolExpired =
    school.isActive &&
    school.activationExpiryDate !== null &&
    school.activationExpiryDate < now;

  const isSchoolActive =
    school.isActive && !isSchoolExpired;

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
            href="/admin/schools"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Back to Schools
          </Link>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            School Management
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            {school.name}
          </h2>

          <p className="mt-3 text-blue-100">
            School Code: {school.code}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold">
              School Information
            </h3>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-500">
                  School Name
                </p>

                <p className="mt-1">
                  {school.name}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  School Code
                </p>

                <p className="mt-1 font-mono">
                  {school.code}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  Email
                </p>

                <p className="mt-1">
                  {school.email || "Not provided"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  Phone
                </p>

                <p className="mt-1">
                  {school.phone || "Not provided"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  Address
                </p>

                <p className="mt-1">
                  {school.address || "Not provided"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  Activation Fee
                </p>

                <p className="mt-1">
                  KSh {school.activationFee.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  Status
                </p>

                <p
                  className={`mt-1 font-semibold ${
                    isSchoolExpired
                      ? "text-red-700"
                      : isSchoolActive
                        ? "text-green-700"
                        : "text-red-700"
                  }`}
                >
                  {isSchoolExpired
                    ? "Expired"
                    : isSchoolActive
                      ? "Active"
                      : "Inactive"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  Activated At
                </p>

                <p className="mt-1">
                  {school.activatedAt
                    ? school.activatedAt.toLocaleString()
                    : "Not activated"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">
                  Activation Expiry
                </p>

                <p
                  className={`mt-1 ${
                    isSchoolExpired
                      ? "font-semibold text-red-700"
                      : "text-slate-900"
                  }`}
                >
                  {school.activationExpiryDate
                    ? school.activationExpiryDate.toLocaleString()
                    : "Not set"}
                </p>
              </div>
            </div>

            <ActivationExpiryForm
              schoolId={school.id}
              expiryDate={
                school.activationExpiryDate
                  ? school.activationExpiryDate.toISOString()
                  : null
              }
              isActive={school.isActive}
            />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold">
              School Statistics
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Students
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.students}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Teachers
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.teachers}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Administrators
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.administrators}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Academic Years
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.academicYears}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Subscriptions
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.subscriptions}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Payments
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.payments}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-xl font-bold">
            Activation Payments
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Review and verify activation payments submitted by
            this school's administrator.
          </p>

          {school.activationPayments.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
              No activation payment has been submitted yet.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Transaction Code
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Amount
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Phone
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Status
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Submitted
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Verified By / At
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {school.activationPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-4 font-mono font-semibold">
                        {payment.transactionCode}
                      </td>

                      <td className="px-4 py-4">
                        KSh {payment.amount.toLocaleString()}
                      </td>

                      <td className="px-4 py-4">
                        {payment.phoneNumber}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            payment.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : payment.status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {payment.submittedAt.toLocaleString()}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {payment.verifiedBy ? (
                          <div>
                            <p className="font-medium text-slate-900">
                              {payment.verifiedBy.name}
                            </p>

                            <p className="text-xs text-slate-500">
                              {payment.verifiedBy.email}
                            </p>

                            {payment.verifiedAt && (
                              <p className="mt-1 text-xs text-slate-500">
                                {payment.verifiedAt.toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          "Not verified"
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <ActivationPaymentActions
                          paymentId={payment.id}
                          status={payment.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold">
                School Administrators
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Manage administrator accounts assigned to this
                school.
              </p>
            </div>
          </div>

          {school.administrators.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
              No administrator has been assigned to this school
              yet.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Name
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Email
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Phone
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Role
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {school.administrators.map((admin) => (
                    <tr
                      key={admin.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-4 font-medium">
                        {admin.name}
                      </td>

                      <td className="px-4 py-4">
                        {admin.email}
                      </td>

                      <td className="px-4 py-4">
                        {admin.phone || "Not provided"}
                      </td>

                      <td className="px-4 py-4">
                        {admin.role}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-8">
            <h4 className="text-lg font-bold">
              Add School Administrator
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Create a new administrator account for this school.
            </p>

            <div className="mt-5">
              <AddAdministratorForm schoolId={school.id} />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          © 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}