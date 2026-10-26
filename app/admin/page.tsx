import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdministrator } from "@/lib/administrator-session";
import { prisma } from "@/lib/prisma";
import LogoutButton from "./LogoutButton";
import ActivationPaymentForm from "./ActivationPaymentForm";

export default async function AdminDashboard() {
  const administrator = await getCurrentAdministrator();

  if (!administrator) {
    redirect("/login");
  }

  if (administrator.role === "BURSAR") {
    redirect("/login");
  }

  if (administrator.role !== "PLATFORM" && administrator.role !== "SCHOOL") {
    redirect("/login");
  }

  if (administrator.role === "PLATFORM") {
    const [schoolCount, studentCount, teacherCount] = await Promise.all([
      prisma.school.count(),
      prisma.student.count(),
      prisma.teacher.count(),
    ]);

    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <div>
              <h1 className="text-2xl font-bold text-blue-700">
                Digital School Hub
              </h1>

              <p className="text-sm text-slate-500">
                Platform Administrator Dashboard
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Home
              </Link>

              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="bg-blue-700">
          <div className="mx-auto max-w-7xl px-6 py-10 text-white">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
              Platform Administration
            </p>

            <h2 className="mt-2 text-4xl font-bold">
              Welcome, {administrator.name}
            </h2>

            <p className="mt-3 max-w-2xl text-blue-100">
              Manage schools and oversee the Digital School Hub
              platform from one central dashboard.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium text-slate-500">
                Registered Schools
              </p>

              <p className="mt-2 text-3xl font-bold">
                {schoolCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium text-slate-500">
                Students
              </p>

              <p className="mt-2 text-3xl font-bold">
                {studentCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium text-slate-500">
                Teachers
              </p>

              <p className="mt-2 text-3xl font-bold">
                {teacherCount}
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold">
              Platform Administration
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              You are signed in as a Platform Administrator.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/schools"
                className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <h4 className="font-bold text-blue-700">
                  Schools
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Register and manage schools on the platform.
                </p>
              </Link>

              <Link
                href="/admin/students"
                className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <h4 className="font-bold text-blue-700">
                  Students
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  View and manage student records.
                </p>
              </Link>

              <Link
                href="/admin/teachers"
                className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <h4 className="font-bold text-blue-700">
                  Teachers
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Manage teacher accounts and assignments.
                </p>
              </Link>

              <Link
                href="/admin/academic-years"
                className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <h4 className="font-bold text-blue-700">
                  Academic Calendar
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Manage academic years and terms.
                </p>
              </Link>

              <Link
                href="/admin/results"
                className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <h4 className="font-bold text-blue-700">
                  Results
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Manage examination and results information.
                </p>
              </Link>

              <Link
                href="/admin/learning-resources"
                className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <h4 className="font-bold text-blue-700">
                  Learning Resources
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Upload and manage notes, revision materials,
                  exercises and study resources for all grades.
                </p>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 p-6 ring-1 ring-blue-100">
            <h3 className="text-lg font-bold text-blue-900">
              Platform Access
            </h3>

            <div className="mt-3 space-y-1 text-sm text-blue-800">
              <p>
                <strong>Name:</strong> {administrator.name}
              </p>

              <p>
                <strong>Email:</strong> {administrator.email}
              </p>

              <p>
                <strong>Role:</strong> Platform Administrator
              </p>

              <p>
                <strong>School:</strong> All schools
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t bg-white">
          <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
            Â© 2026 Digital School Hub. All rights reserved.
          </div>
        </footer>
      </main>
    );
  }

  if (!administrator.schoolId) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-20 text-slate-900">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-red-700">
            School Assignment Required
          </h1>

          <p className="mt-3 text-slate-600">
            Your administrator account is not currently assigned
            to a school.
          </p>

          <div className="mt-6">
            <LogoutButton />
          </div>
        </div>
      </main>
    );
  }

  const school = await prisma.school.findUnique({
    where: {
      id: administrator.schoolId,
    },
    include: {
      _count: {
        select: {
          students: true,
          teachers: true,
          administrators: true,
          academicYears: true,
        },
      },
    },
  });

  if (!school) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-20 text-slate-900">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-red-700">
            School Not Found
          </h1>

          <p className="mt-3 text-slate-600">
            Your administrator account is assigned to a school
            that could not be found.
          </p>

          <div className="mt-6">
            <LogoutButton />
          </div>
        </div>
      </main>
    );
  }

  const now = new Date();

  const isExpiryMissing =
    school.activationExpiryDate === null;

  const isSchoolExpired =
    school.isActive &&
    school.activationExpiryDate !== null &&
    school.activationExpiryDate < now;

  const isSchoolActive =
    school.isActive && !isExpiryMissing && !isSchoolExpired;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              School Administrator Dashboard
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Home
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            School Administration
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Welcome, {administrator.name}
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            Manage your school's students, teachers, academic
            calendar and examination activities.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Your School
              </p>

              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                {school.name}
              </h3>

              <p className="mt-1 font-mono text-sm text-slate-500">
                School Code: {school.code}
              </p>

              <div className="mt-3 text-sm text-slate-600">
                <strong>Activation Expiry:</strong>{" "}
                {school.activationExpiryDate
                  ? school.activationExpiryDate.toLocaleString()
                  : "Not set"}
              </div>
            </div>

            <div
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                isSchoolExpired
                  ? "bg-red-100 text-red-700"
                  : isSchoolActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {!school.isActive ? "Inactive" : isExpiryMissing ? "Expiry date not set" : isSchoolExpired ? "Expired" : "Active"}
            </div>
          </div>
        </div>

        {school.isActive && (isSchoolExpired || isExpiryMissing) && (
          <div className="mb-8 rounded-2xl bg-red-50 p-8 text-center ring-1 ring-red-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-700">
              !
            </div>

            <h3 className="mt-4 text-xl font-bold text-red-900">
              {isExpiryMissing
                ? "School Expiry Date Not Set"
                : "School Activation Expired"}
            </h3>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-red-800">
              {isExpiryMissing
                ? "Your school's expiry date is not set. Submit a renewal payment below. School management will remain locked until the Platform Administrator approves the payment."
                : "Your school's activation period has expired. School management functions are locked. Submit a renewal payment below and wait for Platform Administrator approval."}
            </p>

            {school.activationExpiryDate && (
              <p className="mt-3 text-sm font-semibold text-red-800">
                Expired on:{" "}
                {school.activationExpiryDate.toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="mb-8">
          <ActivationPaymentForm isActive={isSchoolActive} />
        </div>
        {isSchoolActive ? (
          <>
            <div className="mb-8 grid gap-6 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Students
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.students}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Teachers
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.teachers}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Administrators
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.administrators}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  Academic Years
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {school._count.academicYears}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-bold">
                School Administration
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Manage activities for {school.name}.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  href="/admin/students"
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h4 className="font-bold text-blue-700">
                    Students
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage students belonging to your school.
                  </p>
                </Link>

                <Link
                  href="/admin/teachers"
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h4 className="font-bold text-blue-700">
                    Teachers
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage teachers belonging to your school.
                  </p>
                </Link>

                <Link
                  href="/admin/academic-years"
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h4 className="font-bold text-blue-700">
                    Academic Calendar
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage your school's academic years and
                    terms.
                  </p>
                </Link>

                <Link
                  href="/admin/examinations"
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h4 className="font-bold text-blue-700">
                    Examinations
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Create and manage examinations for each term
                    and grade.
                  </p>
                </Link>

                <Link
                  href="/admin/results"
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h4 className="font-bold text-blue-700">
                    Results
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage examination and results activities.
                  </p>
                </Link>

                <Link
                  href="/admin/parent-contacts"
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h4 className="font-bold text-blue-700">
                    Parent Contacts
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Register and manage parent and guardian phone
                    numbers for school announcements.
                  </p>
                </Link>

                <Link
                  href="/admin/announcements"
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h4 className="font-bold text-blue-700">
                    Announcements
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Create school announcements and send them to
                    parents and guardians.
                  </p>
                </Link>

                <Link
                  href="/admin/learning-resources"
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h4 className="font-bold text-blue-700">
                    Learning Resources
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Access platform-wide notes, revision materials,
                    exercises, assignments and study guides for all
                    grades and subjects.
                  </p>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-slate-100 p-8 text-center ring-1 ring-slate-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-700">
              !
            </div>

            <h3 className="mt-4 text-xl font-bold text-slate-900">
              School Management Locked
            </h3>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Your school's Students, Teachers, Academic Calendar
              and Results functions are currently locked because
              the school has not yet been activated.
            </p>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Complete the KSh 500 activation payment above and
              submit your M-PESA transaction code. These functions
              will become available after the Platform Administrator
              verifies and approves the payment.
            </p>
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-blue-50 p-6 ring-1 ring-blue-100">
          <h3 className="text-lg font-bold text-blue-900">
            Administrator Account
          </h3>

          <div className="mt-3 space-y-1 text-sm text-blue-800">
            <p>
              <strong>Name:</strong> {administrator.name}
            </p>

            <p>
              <strong>Email:</strong> {administrator.email}
            </p>

            <p>
              <strong>Role:</strong> School Administrator
            </p>

            <p>
              <strong>School:</strong> {school.name}
            </p>

            <p>
              <strong>Activation Status:</strong>{" "}
              {!school.isActive ? "Inactive" : isExpiryMissing ? "Expiry date not set" : isSchoolExpired ? "Expired" : "Active"}
            </p>

            <p>
              <strong>Activation Expiry:</strong>{" "}
              {school.activationExpiryDate
                ? school.activationExpiryDate.toLocaleString()
                : "Not set"}
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          Â© 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
